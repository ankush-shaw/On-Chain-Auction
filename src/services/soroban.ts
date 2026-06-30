declare module '@stellar/freighter-api';

import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from '@stellar/stellar-sdk';
import { requestAccess, signTransaction } from '@stellar/freighter-api';
import albedo from '@albedo-link/intent';
import type { AuctionListing, AuctionStatus } from '../types';

export const CONTRACT_ID = import.meta.env.VITE_AUCTION_CONTRACT_ID ?? '';
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org';
export const NATIVE_TOKEN =
  import.meta.env.VITE_NATIVE_TOKEN_CONTRACT_ID ??
  'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

const server = new rpc.Server(RPC_URL);

export type WalletType = 'freighter' | 'albedo' | 'xbull' | 'hana';

export type CreateAuctionInput = {
  sellerAddress: string;
  title: string;
  description: string;
  startingBidXlm: string;
  durationHours: number;
};

export type PlaceBidInput = {
  bidderAddress: string;
  auctionId: number;
  amountXlm: string;
};

export function isContractConfigured() {
  return CONTRACT_ID.length > 0;
}

function getAuctionContract() {
  if (!isContractConfigured()) {
    throw new Error('Auction contract is not configured. Set VITE_AUCTION_CONTRACT_ID after deploying the contract.');
  }
  return new Contract(CONTRACT_ID);
}

export async function connectWallet(type: WalletType = 'freighter'): Promise<string | null> {
  try {
    if (type === 'albedo') {
      const res = await albedo.publicKey({ token: 'onchain-auction-' + Math.random() });
      return res.pubkey;
    }

    if (type === 'xbull') {
      const xBull = (window as any).xBullSDK;
      if (!xBull) throw new Error('xBull Wallet not installed');
      await xBull.connect({
        canRequestPublicKey: true,
        canRequestSign: true,
      });
      const publicKey = await xBull.getPublicKey();
      return publicKey || null;
    }

    if (type === 'hana') {
      const hana = (window as any).hanaWallet?.stellar;
      if (!hana) throw new Error('Hana Wallet not installed');
      const response = await hana.getPublicKey();
      return response || null;
    }

    const result = await requestAccess();
    if (typeof result === 'string') return result || null;
    if (result && typeof result === 'object' && 'address' in result) {
      if ((result as any).error) return null;
      return (result as any).address || null;
    }
    return null;
  } catch (e: any) {
    console.error(`[connectWallet] ${type} error:`, e.message);
    return null;
  }
}

export function isWalletInstalled(type: WalletType): boolean {
  if (typeof window === 'undefined') return false;
  if (type === 'albedo') return true;
  if (type === 'xbull') return !!(window as any).xBullSDK;
  if (type === 'hana') return !!(window as any).hanaWallet?.stellar;
  return (
    'freighterApi' in window ||
    'freighter' in window ||
    typeof (window as any).__freighter !== 'undefined'
  );
}

async function signWithXBull(xdr: string): Promise<string | null> {
  try {
    const xBull = (window as any).xBullSDK;
    if (!xBull) return null;
    return await xBull.signXDR(xdr);
  } catch (e) {
    console.error('[signWithXBull] Error:', e);
    return null;
  }
}

async function signWithHana(xdr: string): Promise<string | null> {
  try {
    const hana = (window as any).hanaWallet?.stellar;
    if (!hana) return null;
    const result = await hana.signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE });
    return result?.signedTxXdr || result || null;
  } catch (e) {
    console.error('[signWithHana] Error:', e);
    return null;
  }
}

async function signWithAlbedo(xdr: string): Promise<string | null> {
  try {
    const res = await albedo.tx({ xdr, network: 'testnet' });
    return res.signed_envelope_xdr;
  } catch {
    return null;
  }
}

async function signTx(preparedXdr: string): Promise<string | null> {
  const walletType = localStorage.getItem('walletType') as WalletType | null;

  if (walletType === 'albedo') return signWithAlbedo(preparedXdr);
  if (walletType === 'xbull') return signWithXBull(preparedXdr);
  if (walletType === 'hana') return signWithHana(preparedXdr);

  const signResult = await signTransaction(preparedXdr, { network: 'TESTNET' });
  if (typeof signResult === 'object' && signResult !== null && 'error' in signResult) {
    console.error('[signTx] Freighter error:', (signResult as any).error);
    return null;
  }
  return typeof signResult === 'string' ? signResult : (signResult as any)?.signedTxXdr ?? null;
}

export async function getXlmBalance(address: string): Promise<string | null> {
  try {
    const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
    if (!response.ok) return '0.00';
    const data = await response.json();
    const nativeBalance = data.balances.find((b: any) => b.asset_type === 'native');
    return nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : '0.00';
  } catch {
    return null;
  }
}

export async function getNextAuctionId(): Promise<number> {
  const count = await simulateCall('get_auction_count', []);
  const maxId = typeof count === 'number' ? count : 0;
  return maxId + 1;
}

export async function loadAuctions(): Promise<AuctionListing[]> {
  if (!isContractConfigured()) return [];

  const count = await simulateCall('get_auction_count', []);
  const maxId = typeof count === 'number' ? count : 0;
  const auctions: AuctionListing[] = [];

  for (let id = 1; id <= maxId; id += 1) {
    const value = await simulateCall('get_auction', [nativeToScVal(id, { type: 'u32' })]);
    const listing = normalizeAuction(value);
    if (listing) auctions.push(listing);
  }

  return auctions.sort((a, b) => b.id - a.id);
}

export async function createAuction(input: CreateAuctionInput): Promise<AuctionListing | null> {
  const id = await getNextAuctionId();
  const startingBid = parseXlmToStroops(input.startingBidXlm);
  const durationSeconds = Math.max(1, Math.round(input.durationHours * 60 * 60));
  const contract = getAuctionContract();
  const account = await server.getAccount(input.sellerAddress);

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'create_auction',
        Address.fromString(input.sellerAddress).toScVal(),
        Address.fromString(NATIVE_TOKEN).toScVal(),
        nativeToScVal(id, { type: 'u32' }),
        nativeToScVal(input.title, { type: 'string' }),
        nativeToScVal(input.description, { type: 'string' }),
        nativeToScVal(startingBid.toString(), { type: 'i128' }),
        nativeToScVal(durationSeconds, { type: 'u64' })
      )
    )
    .setTimeout(30)
    .build();

  await submitSignedTransaction(tx);
  const created = await simulateCall('get_auction', [nativeToScVal(id, { type: 'u32' })]);
  return normalizeAuction(created);
}

export async function placeBid(input: PlaceBidInput): Promise<AuctionListing | null> {
  const amount = parseXlmToStroops(input.amountXlm);
  const contract = getAuctionContract();
  const account = await server.getAccount(input.bidderAddress);

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'place_bid',
        Address.fromString(input.bidderAddress).toScVal(),
        nativeToScVal(input.auctionId, { type: 'u32' }),
        nativeToScVal(amount.toString(), { type: 'i128' })
      )
    )
    .setTimeout(30)
    .build();

  await submitSignedTransaction(tx);
  const updated = await simulateCall('get_auction', [nativeToScVal(input.auctionId, { type: 'u32' })]);
  return normalizeAuction(updated);
}

export async function settleAuction(auctionId: number, callerAddress: string): Promise<AuctionListing | null> {
  const contract = getAuctionContract();
  const account = await server.getAccount(callerAddress);

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('settle_auction', nativeToScVal(auctionId, { type: 'u32' })))
    .setTimeout(30)
    .build();

  await submitSignedTransaction(tx);
  const settled = await simulateCall('get_auction', [nativeToScVal(auctionId, { type: 'u32' })]);
  return normalizeAuction(settled);
}

async function simulateCall(funcName: string, args: any[]): Promise<any> {
  try {
    const dummyPK = 'GBBIG4HLPGTLG6BH6YREVWJXEQ4NX74HTD444JD6A6XYS7DOFL2J6DEI';
    let account;
    try {
      account = await server.getAccount(dummyPK);
    } catch {
      account = {
        accountId: () => dummyPK,
        sequenceNumber: () => '1',
        incrementSequenceNumber: () => {},
      } as any;
    }

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(getAuctionContract().call(funcName, ...args))
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(result) && result.result) {
      return scValToNative(result.result.retval);
    }
    return null;
  } catch (e) {
    console.error(`Simulation for ${funcName} failed:`, e);
    return null;
  }
}

async function submitSignedTransaction(tx: any): Promise<string> {
  const prepared = await server.prepareTransaction(tx);
  const signedXdr = await signTx(prepared.toXDR());
  if (!signedXdr) throw new Error('Wallet did not return a signed transaction.');

  const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE));
  const hash = (sent as any).hash;
  if (!hash) throw new Error('Transaction submission failed.');

  for (let i = 0; i < 30; i += 1) {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: { hash },
      }),
    });
    const json = await res.json();
    if (json.result?.status === 'SUCCESS') return hash;
    if (json.result?.status === 'FAILED') throw new Error('Transaction failed on-chain.');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error('Transaction is still pending. Refresh in a moment.');
}

export function parseXlmToStroops(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,7})?$/.test(normalized)) {
    throw new Error('Enter an XLM amount with up to 7 decimal places.');
  }
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, '0'));
}

export function formatStroops(stroops: string | number | bigint): string {
  const value = BigInt(stroops);
  const whole = value / 10_000_000n;
  const fraction = (value % 10_000_000n).toString().padStart(7, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function normalizeAuction(value: any): AuctionListing | null {
  if (!value) return null;
  const record = value instanceof Map ? Object.fromEntries(value) : value;
  const endTime = Number(record.end_time ?? record.endTime ?? 0);
  const now = Math.floor(Date.now() / 1000);
  const settled = Boolean(record.settled);
  const highestBid = String(record.highest_bid ?? record.highestBid ?? '0');
  const highestBidder = normalizeAddress(record.highest_bidder ?? record.highestBidder);
  const status: AuctionStatus = settled ? 'settled' : endTime <= now ? 'ended' : 'live';

  return {
    id: Number(record.id),
    seller: normalizeAddress(record.seller) ?? '',
    title: String(record.title ?? 'Untitled auction'),
    description: String(record.description ?? ''),
    startingBid: String(record.starting_bid ?? record.startingBid ?? '0'),
    highestBid,
    highestBidder,
    token: normalizeAddress(record.token) ?? NATIVE_TOKEN,
    endTime,
    settled,
    status,
  };
}

function normalizeAddress(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toString === 'function') {
    const text = value.toString();
    return text.includes('Address(') ? text.replace(/^Address\((.*)\)$/, '$1') : text;
  }
  return null;
}
