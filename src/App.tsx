import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, FileText, Github, LayoutDashboard, Moon, RefreshCw, ShieldCheck, Sun, Users } from 'lucide-react';
import { AuctionCard } from './components/AuctionCard';
import { ManagerPanel } from './components/ManagerPanel';
import { UserDashboard } from './components/UserDashboard';
import { WalletConnectModal } from './components/WalletConnectModal';
import { Logo } from './components/Logo';
import { ExplorerStats } from './components/ExplorerStats';
import { ExplorerToolbar, StatusFilterType } from './components/ExplorerToolbar';
import { useWallet } from './hooks/useWallet';
import { useTheme } from './hooks/useTheme';
import { useWatchlist } from './hooks/useWatchlist';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [sortBy, setSortBy] = useState<string>('ending_soon');
  const [showWatchedOnly, setShowWatchedOnly] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const { watchedIds, toggleWatch, isWatched } = useWatchlist(wallet.address);

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

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || showWatchedOnly;

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('ending_soon');
    setShowWatchedOnly(false);
  };

  const filteredAndSortedAuctions = useMemo(() => {
    return auctions
      .filter((a) => {
        const matchesSearch =
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
        const matchesWatched = !showWatchedOnly || watchedIds.has(a.id);
        return matchesSearch && matchesStatus && matchesWatched;
      })
      .sort((a, b) => {
        if (sortBy === 'ending_soon') {
          if (a.status === 'live' && b.status !== 'live') return -1;
          if (a.status !== 'live' && b.status === 'live') return 1;
          return a.endTime - b.endTime;
        }
        if (sortBy === 'newest') {
          return b.id - a.id;
        }
        if (sortBy === 'highest_price') {
          const priceA = BigInt(a.highestBid !== '0' ? a.highestBid : a.startingBid);
          const priceB = BigInt(b.highestBid !== '0' ? b.highestBid : b.startingBid);
          return priceB > priceA ? 1 : priceB < priceA ? -1 : 0;
        }
        if (sortBy === 'lowest_price') {
          const priceA = BigInt(a.highestBid !== '0' ? a.highestBid : a.startingBid);
          const priceB = BigInt(b.highestBid !== '0' ? b.highestBid : b.startingBid);
          return priceA > priceB ? 1 : priceA < priceB ? -1 : 0;
        }
        return 0;
      });
  }, [auctions, searchQuery, statusFilter, sortBy, showWatchedOnly, watchedIds]);

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
    <div className="min-h-screen bg-background text-on-surface font-sans dark:bg-[#030914] dark:text-slate-100 transition-colors duration-300">

      {/* ══ STICKY HEADER — Deep Navy / Gold ══ */}
      <header className="bg-primary/95 backdrop-blur-md sticky top-0 z-50 shadow-lg border-b border-white/10 dark:bg-slate-950/95 dark:border-slate-800/60">
        <div className="mx-auto flex max-w-container-max items-center justify-between px-gutter py-3">

          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2 select-none group">
              <Logo size={34} showText={true} textClassName="text-headline-sm hidden sm:inline" />
            </a>
            <nav className="hidden md:flex gap-6 items-center">
              <button
                onClick={() => setActiveSection('board')}
                className={`text-label-lg transition-opacity ${
                  activeSection === 'board'
                    ? 'text-secondary-container border-b-2 border-secondary-container pb-0.5'
                    : 'text-on-primary opacity-70 hover:opacity-100'
                }`}
              >
                Live Auctions
              </button>
              {wallet.isConnected && wallet.address && (
                <button
                  onClick={() => setActiveSection(s => s === 'dashboard' ? 'board' : 'dashboard')}
                  className={`text-label-lg transition-opacity ${
                    activeSection === 'dashboard'
                      ? 'text-secondary-container border-b-2 border-secondary-container pb-0.5'
                      : 'text-on-primary opacity-70 hover:opacity-100'
                  }`}
                >
                  My Dashboard
                </button>
              )}
            </nav>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Network toggle pill */}
            <div className="hidden sm:flex items-center gap-1 rounded-full border border-white/20 bg-primary-container px-2 py-1 dark:bg-slate-900/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleNetworkChange('testnet')}
                className={`text-label-sm font-semibold transition-all px-2.5 py-1 rounded-full ${
                  selectedNetwork === 'testnet' ? 'bg-secondary-container text-primary' : 'text-on-primary-container hover:text-on-primary'
                }`}
              >
                Testnet
              </button>
              <button
                type="button"
                onClick={() => handleNetworkChange('mainnet')}
                className={`text-label-sm font-semibold transition-all px-2.5 py-1 rounded-full ${
                  selectedNetwork === 'mainnet' ? 'bg-secondary-container text-primary' : 'text-on-primary-container hover:text-on-primary'
                }`}
              >
                Mainnet
              </button>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-full border border-white/20 bg-primary-container text-on-primary-container flex items-center justify-center hover:bg-white/10 transition-all dark:bg-slate-900 dark:border-slate-800"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Wallet area */}
            {wallet.isConnected && wallet.address ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2 rounded-full border border-white/20 bg-primary-container px-3 py-1.5 dark:bg-slate-900/60 dark:border-slate-800">
                  <span className="h-2 w-2 rounded-full bg-success-green animate-pulse" />
                  <span className="text-label-sm text-on-primary-container font-mono">
                    {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                  </span>
                  {wallet.balance && (
                    <span className="text-label-sm text-secondary-container font-semibold">{wallet.balance} XLM</span>
                  )}
                </div>
                <button onClick={disconnect} className="text-label-sm text-on-primary opacity-60 hover:opacity-100 transition-opacity">
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                disabled={wallet.isConnecting}
                className="bg-secondary-container text-on-secondary-fixed text-label-lg font-semibold px-5 py-2 rounded-full hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 dark:text-slate-900"
              >
                {wallet.isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ══ HERO — headline left + Manager Panel right ══ */}
        <section className="relative bg-surface-container-lowest overflow-hidden border-b border-outline-variant dark:bg-slate-900/20 dark:border-slate-800/80 hero-grid-bg">
          {/* Floating glow orbs */}
          <div className="absolute top-20 -left-24 w-80 h-80 bg-secondary-container/8 blur-[100px] rounded-full pointer-events-none animate-float" />
          <div className="absolute -bottom-20 right-10 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" style={{animationDelay: '1.5s'}} />
          <div className="absolute top-10 right-1/3 w-48 h-48 bg-secondary-container/4 blur-[80px] rounded-full pointer-events-none animate-float" style={{animationDelay: '0.8s'}} />

          <div className="mx-auto max-w-container-max px-gutter py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-12">

            {/* Left: headline + inline stats */}
            <div className="flex-1 space-y-6 text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-surface-container rounded-full text-label-sm uppercase tracking-wider text-primary dark:bg-slate-800/80 dark:text-slate-300 border border-outline-variant/30 dark:border-slate-700/50 animate-shimmer">
                <span className="flex h-2 w-2 rounded-full bg-success-green animate-pulse" />
                On-chain · Stellar Soroban · {networkConfig.label}
              </div>

              <h1 className="text-headline-xl text-primary leading-[1.1] dark:text-slate-100">
                Bid on Projects.<br />
                <span className="gradient-text-gold">Settle On-Chain.</span>
              </h1>

              <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto lg:mx-0 dark:text-slate-400 leading-relaxed">
                List digital projects, collect XLM bids, and settle the winner trustlessly via Soroban smart contracts. No intermediaries — just your wallet.
              </p>

              <div className="flex gap-8 justify-center lg:justify-start pt-3">
                <div className="text-center">
                  <div className="text-headline-md font-black text-primary dark:text-slate-200">{stats.total}</div>
                  <div className="text-label-sm text-on-surface-variant uppercase tracking-wide dark:text-slate-450">Listings</div>
                </div>
                <div className="w-px bg-outline-variant/50 dark:bg-slate-800" />
                <div className="text-center">
                  <div className="text-headline-md font-black text-auction-live">{stats.live}</div>
                  <div className="text-label-sm text-on-surface-variant uppercase tracking-wide dark:text-slate-450">Live Now</div>
                </div>
                <div className="w-px bg-outline-variant/50 dark:bg-slate-800" />
                <div className="text-center">
                  <div className="text-headline-md font-black gradient-text-gold">{stats.totalBids}</div>
                  <div className="text-label-sm text-on-surface-variant uppercase tracking-wide dark:text-slate-450">Active Bids</div>
                </div>
              </div>

              {wallet.error && (
                <p className="rounded-lg bg-error-container border border-error/30 px-4 py-2.5 text-body-sm text-on-error-container">
                  {wallet.error}
                </p>
              )}
              {notice && (
                <p className="rounded-lg border border-secondary-container/40 bg-secondary-container/10 px-4 py-2.5 text-body-sm text-on-secondary-container">
                  {notice}
                </p>
              )}
              {success && (
                <p className="rounded-lg border border-success-green/40 bg-success-green/10 px-4 py-2.5 text-body-sm text-success-green">
                  {success}
                </p>
              )}
            </div>

            {/* Right: Manager Panel wrapped in Stitch console card */}
            <div className="w-full max-w-[440px] z-10">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden dark:bg-slate-900 dark:border-slate-800 animate-glow-pulse">
                <div className="bg-primary px-6 py-4 flex items-center gap-3 dark:bg-slate-950 border-b border-white/5">
                  <div className="w-9 h-9 bg-secondary-container/20 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary-container" style={{fontSize:'20px'}}>add_circle</span>
                  </div>
                  <div>
                    <h3 className="text-on-primary font-bold text-sm">List a Project</h3>
                    <p className="text-on-primary-container text-label-sm opacity-70">Create an on-chain auction</p>
                  </div>
                </div>
                <div className="p-6">
                  <ManagerPanel
                    walletAddress={wallet.address}
                    contractReady={contractReady}
                    networkLabel={networkConfig.label}
                    onConnect={() => setIsWalletModalOpen(true)}
                    onCreate={handleCreate}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Band */}
        <ExplorerStats auctions={auctions} />

        {/* ══ PROJECT BOARD / USER DASHBOARD ══ */}
        <div className="mx-auto max-w-container-max px-gutter py-10">
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
              <section>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-headline-md font-bold text-primary dark:text-slate-100">Project Board</h2>
                    <p className="mt-0.5 text-body-sm text-on-surface-variant dark:text-slate-400">Live and recently ended auctions open for public bidding.</p>
                  </div>
                  <button onClick={refreshAuctions} disabled={loading} className="btn-ghost stable-button self-start sm:self-auto">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {/* Filter and query toolbar */}
                <ExplorerToolbar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  showWatchedOnly={showWatchedOnly}
                  setShowWatchedOnly={setShowWatchedOnly}
                  hasActiveFilters={hasActiveFilters}
                  onReset={handleResetFilters}
                />

                <AnimatePresence mode="popLayout">
                  {filteredAndSortedAuctions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-14 text-center dark:bg-slate-900/20 dark:border-slate-800">
                      <span className="material-symbols-outlined text-outline text-5xl mb-3 block">inventory_2</span>
                      <p className="text-headline-sm font-semibold text-on-surface dark:text-slate-200">{hasActiveFilters ? 'No auctions match your filters' : 'No active auctions'}</p>
                      <p className="mt-2 text-body-sm text-on-surface-variant dark:text-slate-400">
                        {hasActiveFilters
                          ? 'Try resetting the filters or modifying your search terms.'
                          : contractReady
                          ? 'Connect your wallet and list the first project from the manager console.'
                          : 'Deploy the contract to start listing real projects on-chain.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-4 btn-primary text-xs font-semibold px-4 py-2 inline-flex items-center justify-center"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <motion.div layout className="grid gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredAndSortedAuctions.map((auction) => (
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
                            onConnect={() => setIsWalletModalOpen(true)}
                            onBid={handleBid}
                            onSettle={handleSettle}
                            isWatched={isWatched(auction.id)}
                            onToggleWatch={toggleWatch}
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
        </div>

        {/* ══ WHY ON-CHAIN — Trust section ══ */}
        <section className="py-section-padding bg-surface-container-low border-t border-outline-variant dark:bg-slate-900/10 dark:border-slate-800/80">
          <div className="mx-auto max-w-container-max px-gutter">
            <div className="text-center mb-12">
              <h2 className="text-headline-lg font-bold text-primary dark:text-slate-100">Why On-Chain Auction?</h2>
              <p className="mt-3 text-body-lg text-on-surface-variant max-w-2xl mx-auto dark:text-slate-400 font-medium">Powered by Stellar Soroban — transparent, trustless, permissionless.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: 'receipt_long', title: 'Transparent Listings', body: 'Every project is stored immutably on Stellar Soroban — fully on-chain and publicly verifiable by anyone.', accent: false },
                { icon: 'verified_user', title: 'Trustless Settlement', body: 'Winning bids are settled automatically by the smart contract. No admin, no intermediaries, no trust required.', accent: true },
                { icon: 'language', title: 'Permissionless Bidding', body: 'Anyone with a Stellar wallet can connect and bid. No sign-up, no KYC — just your keys and the contract.', accent: false },
              ].map(({ icon, title, body, accent }) => (
                <div
                  key={title}
                  className={`rounded-xl p-8 text-center auction-card-hover border transition-all ${
                    accent
                      ? 'bg-primary text-on-primary border-transparent shadow-xl -translate-y-2 dark:bg-slate-900/60 dark:border-slate-800'
                      : 'bg-surface-container-lowest border-outline-variant dark:bg-slate-900 dark:border-slate-800'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${ accent ? 'bg-secondary-container/20' : 'bg-surface-container dark:bg-slate-800' }`}>
                    <span className={`material-symbols-outlined text-2xl ${ accent ? 'text-secondary-container' : 'text-primary dark:text-slate-300' }`}>{icon}</span>
                  </div>
                  <h3 className={`text-headline-sm font-bold mb-3 ${ accent ? 'text-on-primary' : 'text-primary dark:text-slate-200' }`}>{title}</h3>
                  <p className={`text-body-sm leading-relaxed ${ accent ? 'text-on-primary-container' : 'text-on-surface-variant dark:text-slate-400' }`}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* ══ FOOTER — Dark navy branded ══ */}
      <footer className="bg-primary border-t border-white/10 dark:bg-slate-950 dark:border-slate-900">
        <div className="mx-auto max-w-container-max px-gutter py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Logo size={30} showText={true} textClassName="text-body-md" />
            <p className="text-on-primary opacity-50 text-body-sm leading-relaxed">
              A trustless project auction platform built on Stellar Soroban. Transparent bids, automatic settlement.
            </p>
            <div className="flex gap-3">
              <a href="https://github.com/ankush-shaw/On-Chain-Auction" target="_blank" rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-on-primary opacity-60 hover:opacity-100 hover:bg-white/10 transition-all">
                <Github size={15} />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-on-primary text-label-sm font-semibold uppercase tracking-widest opacity-50">Platform</h4>
            <ul className="space-y-3">
              {['Live Auctions', 'How to Bid', 'How to List', 'My Dashboard'].map(l => (
                <li key={l}><a href="#" className="text-on-primary opacity-50 hover:opacity-100 hover:text-secondary-container transition-all text-label-sm">{l}</a></li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-on-primary text-label-sm font-semibold uppercase tracking-widest opacity-50">Network</h4>
            <ul className="space-y-3">
              {['Stellar Soroban', 'Testnet Explorer', 'Mainnet Explorer', 'Contract Docs'].map(l => (
                <li key={l}><a href="#" className="text-on-primary opacity-50 hover:opacity-100 hover:text-secondary-container transition-all text-label-sm">{l}</a></li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-on-primary text-label-sm font-semibold uppercase tracking-widest opacity-50">On-Chain Status</h4>
            <div className="bg-primary-container rounded-xl p-4 border border-white/10 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${contractReady ? 'bg-success-green' : 'bg-outline'}`} />
                <span className="text-label-sm text-on-primary-container">{contractReady ? 'Contract Live' : 'Preview Mode'}</span>
              </div>
              <div className="text-label-sm text-on-primary-container opacity-60">Network: {networkConfig.label}</div>
              {networkConfig.contractId && (
                <a href={`https://stellar.expert/explorer/${networkConfig.explorerNetwork}/contract/${networkConfig.contractId}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-secondary-container text-label-sm hover:brightness-110">
                  View Contract <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 py-6">
          <div className="mx-auto max-w-container-max px-gutter flex flex-col sm:flex-row justify-between items-center gap-3 text-on-primary opacity-40 text-label-sm">
            <p>© {new Date().getFullYear()} OnChainAuction. Built on Stellar Soroban.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-secondary-container hover:opacity-100 transition-all">Privacy</a>
              <a href="#" className="hover:text-secondary-container hover:opacity-100 transition-all">Terms</a>
              <a href="#" className="hover:text-secondary-container hover:opacity-100 transition-all">Support</a>
            </div>
          </div>
        </div>
      </footer>

      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnect={(type) => connect(type, selectedNetwork)}
        isConnecting={wallet.isConnecting}
        selectedNetwork={selectedNetwork}
      />
    </div>
  );
}

export default App;
