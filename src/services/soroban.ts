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

export type WalletType = 'freighter' | 'albedo' | 'xbull' | 'hana';
export type StellarNetwork = 'testnet' | 'mainnet';

type NetworkConfig = {
  id: StellarNetwork;
  label: string;
  contractId: string;
  explorerNetwork: 'testnet' | 'public';
  freighterNetwork: 'TESTNET' | 'PUBLIC';
  horizonUrl: string;
  nativeToken: string;
  networkPassphrase: string;
  rpcUrl: string;
};

export const NETWORK_CONFIGS: Record<StellarNetwork, NetworkConfig> = {
  testnet: {
    id: 'testnet',
    label: 'Testnet',
    contractId: import.meta.env.VITE_AUCTION_CONTRACT_ID ?? '',
    explorerNetwork: 'testnet',
    freighterNetwork: 'TESTNET',
    horizonUrl: import.meta.env.VITE_STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
    nativeToken:
      import.meta.env.VITE_NATIVE_TOKEN_CONTRACT_ID ??
      'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    networkPassphrase: Networks.TESTNET,
    rpcUrl: import.meta.env.VITE_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org',
  },
  mainnet: {
    id: 'mainnet',
    label: 'Mainnet',
    contractId: import.meta.env.VITE_MAINNET_AUCTION_CONTRACT_ID ?? '',
    explorerNetwork: 'public',
    freighterNetwork: 'PUBLIC',
    horizonUrl: import.meta.env.VITE_STELLAR_MAINNET_HORIZON_URL ?? 'https://horizon.stellar.org',
    nativeToken: import.meta.env.VITE_MAINNET_NATIVE_TOKEN_CONTRACT_ID ?? '',
    networkPassphrase: Networks.PUBLIC,
    rpcUrl: import.meta.env.VITE_STELLAR_MAINNET_RPC_URL ?? 'https://mainnet.sorobanrpc.com',
  },
};

export const CONTRACT_ID = NETWORK_CONFIGS.testnet.contractId;
export const NETWORK_PASSPHRASE = NETWORK_CONFIGS.testnet.networkPassphrase;
export const RPC_URL = NETWORK_CONFIGS.testnet.rpcUrl;
export const NATIVE_TOKEN = NETWORK_CONFIGS.testnet.nativeToken;

export type CreateAuctionInput = {
  sellerAddress: string;
  title: string;
  description: string;
  startingBidXlm: string;
  durationHours: number;
  /** Optional buy-it-now price in XLM (e.g. "50"). */
  buyItNowPriceXlm?: string;
  /** Optional reserve price in XLM (e.g. "30"). */
  reservePriceXlm?: string;
};

export type PlaceBidInput = {
  bidderAddress: string;
  auctionId: number;
  amountXlm: string;
};

export function getNetworkConfig(network: StellarNetwork = 'testnet') {
  return NETWORK_CONFIGS[network];
}

function getServer(network: StellarNetwork = 'testnet') {
  return new rpc.Server(getNetworkConfig(network).rpcUrl);
}

export function isContractConfigured(network: StellarNetwork = 'testnet') {
  const config = getNetworkConfig(network);
  return config.contractId.length > 0 && config.nativeToken.length > 0;
}

function getAuctionContract(network: StellarNetwork = 'testnet') {
  const config = getNetworkConfig(network);
  if (!isContractConfigured(network)) {
    throw new Error(`Auction contract is not configured for ${config.label}. Set the contract and native token environment values after deploying the contract.`);
  }
  return new Contract(config.contractId);
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
  return !!(
    (window as any).freighterApi ||
    (window as any).freighter ||
    (window as any).stellar ||
    (window as any).__freighter
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

async function signWithHanaForNetwork(xdr: string, network: StellarNetwork): Promise<string | null> {
  try {
    const hana = (window as any).hanaWallet?.stellar;
    if (!hana) return null;
    const result = await hana.signTransaction(xdr, { networkPassphrase: getNetworkConfig(network).networkPassphrase });
    return result?.signedTxXdr || result || null;
  } catch (e) {
    console.error('[signWithHana] Error:', e);
    return null;
  }
}

async function signWithAlbedo(xdr: string, network: StellarNetwork = 'testnet'): Promise<string | null> {
  try {
    const res = await albedo.tx({ xdr, network: network === 'mainnet' ? 'public' : 'testnet' });
    return res.signed_envelope_xdr;
  } catch {
    return null;
  }
}

async function signTx(preparedXdr: string, network: StellarNetwork = 'testnet'): Promise<string | null> {
  const config = getNetworkConfig(network);
  const walletType = localStorage.getItem('walletType') as WalletType | null;

  if (walletType === 'albedo') return signWithAlbedo(preparedXdr, network);
  if (walletType === 'xbull') return signWithXBull(preparedXdr);
  if (walletType === 'hana') return signWithHanaForNetwork(preparedXdr, network);

  const signResult = await signTransaction(preparedXdr, {
    network: config.freighterNetwork,
    networkPassphrase: config.networkPassphrase,
  });
  if (typeof signResult === 'object' && signResult !== null && 'error' in signResult) {
    console.error('[signTx] Freighter error:', (signResult as any).error);
    return null;
  }
  return typeof signResult === 'string' ? signResult : (signResult as any)?.signedTxXdr ?? null;
}

export async function getXlmBalance(address: string, network: StellarNetwork = 'testnet'): Promise<string | null> {
  try {
    const response = await fetch(`${getNetworkConfig(network).horizonUrl}/accounts/${address}`);
    if (!response.ok) return '0.00';
    const data = await response.json();
    const nativeBalance = data.balances.find((b: any) => b.asset_type === 'native');
    return nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : '0.00';
  } catch {
    return null;
  }
}

export async function getNextAuctionId(network: StellarNetwork = 'testnet'): Promise<number> {
  const count = await simulateCall(network, 'get_auction_count', []);
  const maxId = typeof count === 'number' ? count : 0;
  return maxId + 1;
}

export async function loadAuctions(network: StellarNetwork = 'testnet'): Promise<AuctionListing[]> {
  if (!isContractConfigured(network)) return [];

  const count = await simulateCall(network, 'get_auction_count', []);
  const maxId = typeof count === 'number' ? count : 0;
  const auctions: AuctionListing[] = [];

  for (let id = 1; id <= maxId; id += 1) {
    const value = await simulateCall(network, 'get_auction', [nativeToScVal(id, { type: 'u32' })]);
    const listing = normalizeAuction(value, network);
    if (listing) auctions.push(listing);
  }

  return auctions.sort((a, b) => b.id - a.id);
}

export async function createAuction(input: CreateAuctionInput, network: StellarNetwork = 'testnet'): Promise<AuctionListing | null> {
  const config = getNetworkConfig(network);
  const server = getServer(network);
  const id = await getNextAuctionId(network);
  const startingBid = parseXlmToStroops(input.startingBidXlm);
  const durationSeconds = Math.max(1, Math.round(input.durationHours * 60 * 60));
  const contract = getAuctionContract(network);
  const account = await server.getAccount(input.sellerAddress);

  const buyNowOptionScVal = input.buyItNowPriceXlm && input.buyItNowPriceXlm.trim()
    ? nativeToScVal(parseXlmToStroops(input.buyItNowPriceXlm).toString(), { type: 'i128' })
    : nativeToScVal(null);

  const reserveOptionScVal = input.reservePriceXlm && input.reservePriceXlm.trim()
    ? nativeToScVal(parseXlmToStroops(input.reservePriceXlm).toString(), { type: 'i128' })
    : nativeToScVal(null);

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        'create_auction',
        Address.fromString(input.sellerAddress).toScVal(),
        Address.fromString(config.nativeToken).toScVal(),
        nativeToScVal(id, { type: 'u32' }),
        nativeToScVal(input.title, { type: 'string' }),
        nativeToScVal(input.description, { type: 'string' }),
        nativeToScVal(startingBid.toString(), { type: 'i128' }),
        nativeToScVal(durationSeconds, { type: 'u64' }),
        buyNowOptionScVal,
        reserveOptionScVal
      )
    )
    .setTimeout(30)
    .build();

  await submitSignedTransaction(tx, network);
  const created = await simulateCall(network, 'get_auction', [nativeToScVal(id, { type: 'u32' })]);
  return normalizeAuction(created, network);
}

export async function placeBid(input: PlaceBidInput, network: StellarNetwork = 'testnet'): Promise<AuctionListing | null> {
  const config = getNetworkConfig(network);
  const server = getServer(network);
  const amount = parseXlmToStroops(input.amountXlm);
  const contract = getAuctionContract(network);
  const account = await server.getAccount(input.bidderAddress);

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: config.networkPassphrase,
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

  await submitSignedTransaction(tx, network);
  const updated = await simulateCall(network, 'get_auction', [nativeToScVal(input.auctionId, { type: 'u32' })]);
  return normalizeAuction(updated, network);
}

export async function settleAuction(auctionId: number, callerAddress: string, network: StellarNetwork = 'testnet'): Promise<AuctionListing | null> {
  const config = getNetworkConfig(network);
  const server = getServer(network);
  const contract = getAuctionContract(network);
  const account = await server.getAccount(callerAddress);

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call('settle_auction', nativeToScVal(auctionId, { type: 'u32' })))
    .setTimeout(30)
    .build();

  await submitSignedTransaction(tx, network);
  const settled = await simulateCall(network, 'get_auction', [nativeToScVal(auctionId, { type: 'u32' })]);
  return normalizeAuction(settled, network);
}

export async function cancelAuction(auctionId: number, sellerAddress: string, network: StellarNetwork = 'testnet'): Promise<AuctionListing | null> {
  const config = getNetworkConfig(network);
  const server = getServer(network);
  const contract = getAuctionContract(network);
  const account = await server.getAccount(sellerAddress);

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        'cancel_auction',
        Address.fromString(sellerAddress).toScVal(),
        nativeToScVal(auctionId, { type: 'u32' })
      )
    )
    .setTimeout(30)
    .build();

  await submitSignedTransaction(tx, network);
  const cancelled = await simulateCall(network, 'get_auction', [nativeToScVal(auctionId, { type: 'u32' })]);
  return normalizeAuction(cancelled, network);
}

async function simulateCall(network: StellarNetwork, funcName: string, args: any[]): Promise<any> {
  try {
    const config = getNetworkConfig(network);
    const server = getServer(network);
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
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(getAuctionContract(network).call(funcName, ...args))
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

async function submitSignedTransaction(tx: any, network: StellarNetwork): Promise<string> {
  const config = getNetworkConfig(network);
  const server = getServer(network);
  const prepared = await server.prepareTransaction(tx);
  const signedXdr = await signTx(prepared.toXDR(), network);
  if (!signedXdr) throw new Error('Wallet did not return a signed transaction.');

  const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase));
  const hash = (sent as any).hash;
  if (!hash) throw new Error('Transaction submission failed.');

  for (let i = 0; i < 30; i += 1) {
    const res = await fetch(config.rpcUrl, {
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

function normalizeAuction(value: any, network: StellarNetwork = 'testnet'): AuctionListing | null {
  if (!value) return null;
  const config = getNetworkConfig(network);
  const record = value instanceof Map ? Object.fromEntries(value) : value;
  const endTime = Number(record.end_time ?? record.endTime ?? 0);
  const now = Math.floor(Date.now() / 1000);
  const settled = Boolean(record.settled);
  const highestBid = String(record.highest_bid ?? record.highestBid ?? '0');
  const highestBidder = normalizeAddress(record.highest_bidder ?? record.highestBidder);
  const status: AuctionStatus = settled ? 'settled' : endTime <= now ? 'ended' : 'live';

  // Extract optional buy-it-now & reserve price.
  const rawBin = record.buy_it_now_price ?? record.buyItNowPrice;
  const buyItNowPrice = rawBin != null ? String(rawBin) : null;
  const rawReserve = record.reserve_price ?? record.reservePrice;
  const reservePrice = rawReserve != null ? String(rawReserve) : null;
  const bidCount = Number(record.bid_count ?? record.bidCount ?? 0);

  return {
    id: Number(record.id),
    seller: normalizeAddress(record.seller) ?? '',
    title: String(record.title ?? 'Untitled auction'),
    description: String(record.description ?? ''),
    startingBid: String(record.starting_bid ?? record.startingBid ?? '0'),
    highestBid,
    highestBidder,
    token: normalizeAddress(record.token) ?? config.nativeToken,
    endTime,
    settled,
    status,
    buyItNowPrice,
    reservePrice,
    bidCount,
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
