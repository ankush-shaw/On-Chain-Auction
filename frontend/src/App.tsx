import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Github, RefreshCw } from 'lucide-react';
import { AuctionCard } from './components/AuctionCard';
import { ManagerPanel } from './components/ManagerPanel';
import { useWallet } from './hooks/useWallet';
import { demoAuctions } from './data/demoAuctions';
import type { AuctionListing } from './types';
import {
  CONTRACT_ID,
  CreateAuctionInput,
  WalletType,
  createAuction,
  isContractConfigured,
  loadAuctions,
  placeBid,
  settleAuction,
} from './services/soroban';

const walletOptions: { type: WalletType; label: string }[] = [
  { type: 'freighter', label: 'Freighter' },
  { type: 'albedo', label: 'Albedo' },
  { type: 'xbull', label: 'xBull' },
  { type: 'hana', label: 'Hana' },
];

function App() {
  const { wallet, connect, disconnect } = useWallet();
  const [auctions, setAuctions] = useState<AuctionListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const contractReady = isContractConfigured();

  const refreshAuctions = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const onChainAuctions = await loadAuctions();
      setAuctions(onChainAuctions.length > 0 ? onChainAuctions : demoAuctions);
      if (!contractReady) {
        setNotice('Preview mode: deploy the auction contract and set VITE_AUCTION_CONTRACT_ID to enable on-chain listing and bidding.');
      }
    } catch (e: any) {
      setAuctions(demoAuctions);
      setNotice(e.message || 'Showing preview listings because on-chain auctions could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [contractReady]);

  useEffect(() => {
    refreshAuctions();
  }, [refreshAuctions]);

  const stats = useMemo(() => {
    const live = auctions.filter((auction) => auction.status === 'live').length;
    const totalBids = auctions.filter((auction) => auction.highestBid !== '0').length;
    return { live, totalBids, total: auctions.length };
  }, [auctions]);

  const handleCreate = async (input: CreateAuctionInput) => {
    const created = await createAuction(input);
    if (created) setAuctions((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    await refreshAuctions();
  };

  const handleBid = async (auctionId: number, amountXlm: string) => {
    if (!wallet.address) {
      await connect('freighter');
      return;
    }
    const updated = await placeBid({ bidderAddress: wallet.address, auctionId, amountXlm });
    if (updated) setAuctions((current) => current.map((item) => (item.id === auctionId ? updated : item)));
  };

  const handleSettle = async (auctionId: number) => {
    if (!wallet.address) {
      await connect('freighter');
      return;
    }
    const updated = await settleAuction(auctionId, wallet.address);
    if (updated) setAuctions((current) => current.map((item) => (item.id === auctionId ? updated : item)));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-950/90">
        <header className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Stellar Testnet</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-white md:text-4xl">OnChainAuction</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {wallet.isConnected && wallet.address ? (
              <>
                <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
                  <span className="text-slate-500">Wallet </span>
                  <span className="font-mono text-cyan-200">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </span>
                  {wallet.balance && <span className="ml-2 text-slate-400">{wallet.balance} XLM</span>}
                </div>
                <button onClick={disconnect} className="btn-ghost stable-button">
                  Disconnect
                </button>
              </>
            ) : (
              walletOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => connect(option.type)}
                  disabled={wallet.isConnecting}
                  className="btn-ghost stable-button"
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
          <div className="py-4">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Project auctions with wallet-settled bidding
              </p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-white md:text-6xl">
                List a project, open the bidding, settle the winner on-chain.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                Managers publish project opportunities to a Soroban contract. Public bidders connect a Stellar wallet,
                submit XLM-backed bids, and the highest bidder wins when the auction closes.
              </p>
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
              <div className="metric">
                <p>{stats.total}</p>
                <span>Listings</span>
              </div>
              <div className="metric">
                <p>{stats.live}</p>
                <span>Live</span>
              </div>
              <div className="metric">
                <p>{stats.totalBids}</p>
                <span>With bids</span>
              </div>
            </div>

            {wallet.error && <p className="mt-5 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{wallet.error}</p>}
            {notice && <p className="mt-5 rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">{notice}</p>}
          </div>

          <ManagerPanel
            walletAddress={wallet.address}
            onConnect={() => connect('freighter')}
            onCreate={handleCreate}
          />
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Project Board</h2>
              <p className="mt-1 text-sm text-slate-500">Live and recently ended auctions for public bidding.</p>
            </div>
            <button onClick={refreshAuctions} disabled={loading} className="btn-ghost stable-button">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {auctions.map((auction) => (
                <motion.div
                  key={auction.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                >
                  <AuctionCard
                    auction={auction}
                    walletAddress={wallet.address}
                    onConnect={() => connect('freighter')}
                    onBid={handleBid}
                    onSettle={handleSettle}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </section>

        <footer className="mt-12 flex flex-col gap-4 border-t border-slate-800 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>OnChainAuction runs on Stellar Soroban testnet contracts.</span>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="https://github.com/ankush-shaw/On-Chain-Auction"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-white"
            >
              <Github size={16} />
              GitHub
            </a>
            {CONTRACT_ID && (
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-cyan-200"
              >
                Contract <ExternalLink size={14} />
              </a>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
