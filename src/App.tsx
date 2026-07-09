import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, FileText, Github, LayoutDashboard, Moon, RefreshCw, ShieldCheck, Sun, Users } from 'lucide-react';
import { AuctionCard } from './components/AuctionCard';
import { ManagerPanel } from './components/ManagerPanel';
import { UserDashboard } from './components/UserDashboard';
import { useWallet } from './hooks/useWallet';
import { useTheme } from './hooks/useTheme';
import { demoAuctions } from './data/demoAuctions';
import type { AuctionListing } from './types';
import {
  CreateAuctionInput,
  StellarNetwork,
  WalletType,
  createAuction,
  getNetworkConfig,
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
  const { isDark, toggle } = useTheme();
  const [selectedNetwork, setSelectedNetwork] = useState<StellarNetwork>(() => {
    const stored = localStorage.getItem('stellarNetwork');
    return stored === 'mainnet' ? 'mainnet' : 'testnet';
  });
  const [auctions, setAuctions] = useState<AuctionListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'board' | 'dashboard'>('board');

  const networkConfig = getNetworkConfig(selectedNetwork);
  const contractReady = isContractConfigured(selectedNetwork);

  const refreshAuctions = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      if (!contractReady) {
        setAuctions(demoAuctions);
        setNotice(`Preview mode: configure the ${networkConfig.label} contract and native token env values to enable on-chain listing and bidding.`);
        return;
      }

      const onChainAuctions = await loadAuctions(selectedNetwork);
      setAuctions(onChainAuctions);
      if (onChainAuctions.length === 0) {
        setNotice(`No live ${networkConfig.label} auctions yet. Connect your wallet and list the first project.`);
      }
    } catch (e: any) {
      setAuctions([]);
      setNotice(e.message || `Could not load ${networkConfig.label} auctions. Check your contract ID and RPC URL.`);
    } finally {
      setLoading(false);
    }
  }, [contractReady, networkConfig.label, selectedNetwork]);

  useEffect(() => {
    refreshAuctions();
  }, [refreshAuctions]);

  useEffect(() => {
    localStorage.setItem('stellarNetwork', selectedNetwork);
  }, [selectedNetwork]);

  // Auto-dismiss success toast after 4 seconds
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  // Auto-navigate to dashboard when wallet connects
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      setActiveSection('dashboard');
    } else {
      setActiveSection('board');
    }
  }, [wallet.isConnected, wallet.address]);

  const stats = useMemo(() => {
    const live = auctions.filter((auction) => auction.status === 'live').length;
    const totalBids = auctions.filter((auction) => auction.highestBid !== '0').length;
    return { live, totalBids, total: auctions.length };
  }, [auctions]);

  const handleCreate = async (input: CreateAuctionInput) => {
    if (!contractReady) {
      throw new Error(`Configure the ${networkConfig.label} auction contract before listing projects.`);
    }
    const created = await createAuction(input, selectedNetwork);
    if (created) {
      setAuctions((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSuccess(`Listed "${created.title}" on-chain.`);
    }
    await refreshAuctions();
  };

  const handleBid = async (auctionId: number, amountXlm: string) => {
    if (!contractReady) {
      throw new Error(`On-chain bidding requires a configured ${networkConfig.label} auction contract.`);
    }
    if (!wallet.address) {
      await connect('freighter', selectedNetwork);
      return;
    }
    const updated = await placeBid({ bidderAddress: wallet.address, auctionId, amountXlm }, selectedNetwork);
    if (updated) {
      setAuctions((current) => current.map((item) => (item.id === auctionId ? updated : item)));
      setSuccess(`Bid placed on "${updated.title}".`);
    }
  };

  const handleSettle = async (auctionId: number) => {
    if (!contractReady) {
      throw new Error(`On-chain settlement requires a configured ${networkConfig.label} auction contract.`);
    }
    if (!wallet.address) {
      await connect('freighter', selectedNetwork);
      return;
    }
    const updated = await settleAuction(auctionId, wallet.address, selectedNetwork);
    if (updated) {
      setAuctions((current) => current.map((item) => (item.id === auctionId ? updated : item)));
      setSuccess(`Auction "${updated.title}" settled. Winning bid sent to seller.`);
    }
  };

  const handleNetworkChange = (network: StellarNetwork) => {
    if (network === selectedNetwork) return;
    setSelectedNetwork(network);
    setAuctions([]);
    setNotice(null);
    setSuccess(null);
    disconnect();
    setActiveSection('board');
  };

  return (
    <div className="min-h-screen bg-cream-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">

      {/* ── Sticky header ── */}
      <div className="border-b border-cream-300 bg-cream-100/90 sticky top-0 z-50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90">
        <header className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">Stellar {networkConfig.label}</p>
            <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-900 dark:text-white sm:text-3xl md:text-4xl">OnChainAuction</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-cream-300 bg-cream-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => handleNetworkChange('testnet')}
                className={`text-sm font-semibold transition-colors ${
                  selectedNetwork === 'testnet'
                    ? 'text-indigo-600 dark:text-indigo-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                Testnet
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={selectedNetwork === 'mainnet'}
                aria-label={`Switch to ${selectedNetwork === 'testnet' ? 'Mainnet' : 'Testnet'}`}
                onClick={() => handleNetworkChange(selectedNetwork === 'testnet' ? 'mainnet' : 'testnet')}
                className={`relative h-8 w-14 rounded-full border p-0.5 transition-colors ${
                  selectedNetwork === 'mainnet'
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                    selectedNetwork === 'mainnet' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => handleNetworkChange('mainnet')}
                className={`text-sm font-semibold transition-colors ${
                  selectedNetwork === 'mainnet'
                    ? 'text-indigo-600 dark:text-indigo-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                Mainnet
              </button>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="flex items-center justify-center w-10 h-10 rounded-md border border-cream-300 bg-cream-50 text-slate-600 transition-all hover:bg-cream-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* My Dashboard button — only when wallet connected */}
            {wallet.isConnected && wallet.address && (
              <button
                onClick={() => setActiveSection(s => s === 'dashboard' ? 'board' : 'dashboard')}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-all stable-button ${
                  activeSection === 'dashboard'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'border-cream-300 bg-cream-50 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400'
                }`}
              >
                <LayoutDashboard size={15} />
                {activeSection === 'dashboard' ? 'Project Board' : 'My Dashboard'}
              </button>
            )}

            {wallet.isConnected && wallet.address ? (
              <>
                <div className="rounded-md border border-cream-300 bg-cream-50 px-3 py-2 text-sm min-w-0 max-w-full dark:border-slate-700 dark:bg-slate-900">
                  <span className="text-slate-500">Wallet </span>
                  <span className="font-mono text-cyan-700 dark:text-cyan-200">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </span>
                  {wallet.balance && <span className="ml-2 text-slate-500 dark:text-slate-400">{wallet.balance} XLM</span>}
                </div>
                <button onClick={disconnect} className="btn-ghost stable-button">
                  Disconnect
                </button>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                {walletOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => connect(option.type, selectedNetwork)}
                    disabled={wallet.isConnecting}
                    className="btn-ghost stable-button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8">

        {/* ── Hero + Manager ── */}
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
          <div className="py-2 sm:py-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
                On-chain project auctions · Stellar Soroban
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black leading-tight text-slate-900 dark:text-white md:text-5xl lg:text-6xl">
                Bid on projects.<br className="hidden sm:block" /> Settle on-chain.
              </h2>
              <p className="hidden sm:block mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400">
                List projects, collect XLM bids, and settle the winner trustlessly via Soroban smart contracts.
              </p>
            </div>

            <div className="mt-6 sm:mt-8 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
              <div className="metric"><p>{stats.total}</p><span>Listings</span></div>
              <div className="metric"><p>{stats.live}</p><span>Live</span></div>
              <div className="metric"><p>{stats.totalBids}</p><span>Bids</span></div>
            </div>

            {wallet.error && (
              <p className="mt-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {wallet.error}
              </p>
            )}
            {notice && (
              <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                {notice}
              </p>
            )}
            {success && (
              <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
                {success}
              </p>
            )}
          </div>

          <ManagerPanel
            walletAddress={wallet.address}
            contractReady={contractReady}
            onConnect={() => connect('freighter', selectedNetwork)}
            onCreate={handleCreate}
          />
        </section>

        {/* ── Project Board OR User Dashboard ── */}
        <AnimatePresence mode="wait">
          {activeSection === 'dashboard' && wallet.address ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <UserDashboard
                auctions={auctions}
                walletAddress={wallet.address}
                contractReady={contractReady}
                onSettle={handleSettle}
                onBid={handleBid}
              />
            </motion.div>
          ) : (
            <motion.div
              key="board"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <section className="mt-8 sm:mt-10">
                <div className="mb-4 sm:mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Project Board</h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">Live and recently ended auctions for public bidding.</p>
                  </div>
                  <button onClick={refreshAuctions} disabled={loading} className="btn-ghost stable-button">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                <AnimatePresence mode="popLayout">
                  {auctions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-cream-300 bg-cream-50/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950/60">
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">No auctions on the board yet</p>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {contractReady
                          ? 'Connect your wallet and list the first project from the manager console.'
                          : 'Deploy the contract to start listing real projects on-chain.'}
                      </p>
                    </div>
                  ) : (
                    <motion.div layout className="grid gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                            onConnect={() => connect('freighter', selectedNetwork)}
                            onBid={handleBid}
                            onSettle={handleSettle}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Feature cards ── */}
        <section className="mt-14 sm:mt-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: <FileText size={22} />,
                title: 'Transparent Listings',
                body: 'Every project is stored immutably on Stellar Soroban — fully on-chain and publicly verifiable.',
              },
              {
                icon: <ShieldCheck size={22} />,
                title: 'Trustless Settlement',
                body: 'Winning bids are settled automatically by the smart contract. No admin, no intermediaries.',
              },
              {
                icon: <Users size={22} />,
                title: 'Permissionless Bidding',
                body: 'Anyone with a Stellar wallet can connect and bid. No sign-up, no KYC — just your keys.',
              },
            ].map(({ icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-cream-300 bg-cream-50 p-6 flex flex-col gap-4 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-400">
                  {icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer bar ── */}
        <footer className="mt-10 flex flex-col gap-3 border-t border-cream-300 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-slate-600 font-medium dark:text-slate-400">Soroban {networkConfig.label}</span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className="font-mono text-slate-500">v1.0.0</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="https://github.com/ankush-shaw/On-Chain-Auction"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-slate-900 transition-colors dark:hover:text-white"
            >
              <Github size={15} />
              GitHub
            </a>
            {networkConfig.contractId && (
              <a
                href={`https://stellar.expert/explorer/${networkConfig.explorerNetwork}/contract/${networkConfig.contractId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-cyan-700 transition-colors dark:hover:text-cyan-200"
              >
                View Contract <ExternalLink size={13} />
              </a>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
