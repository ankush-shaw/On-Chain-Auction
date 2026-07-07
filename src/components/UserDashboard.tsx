import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, Gavel, LayoutDashboard, ListOrdered, Loader2, ShieldCheck, Trophy } from 'lucide-react';
import type { AuctionListing } from '../types';
import { useDashboard } from '../hooks/useDashboard';
import { BidStatusBadge, deriveBidStatus } from './BidStatusBadge';
import { formatStroops } from '../services/soroban';

type DashTab = 'bids' | 'listings';

interface UserDashboardProps {
  auctions: AuctionListing[];
  walletAddress: string;
  contractReady: boolean;
  onSettle: (auctionId: number) => Promise<void>;
  onBid: (auctionId: number, amountXlm: string) => Promise<void>;
}

// ── Stat tile ──────────────────────────────────────────────────────────────
function StatTile({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="metric flex flex-col gap-1">
      <p className={`text-2xl font-black ${accent}`}>{value}</p>
      <span>{label}</span>
    </div>
  );
}

// ── Bid card (inside My Bids) ──────────────────────────────────────────────
function BidCard({
  auction,
  walletAddress,
  onSettle,
}: {
  auction: AuctionListing;
  walletAddress: string;
  onSettle: (id: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const status = deriveBidStatus(auction, walletAddress);
  const timeLabel = (() => {
    const secs = auction.endTime - Math.floor(Date.now() / 1000);
    if (auction.settled) return 'Settled';
    if (secs <= 0) return 'Ended';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
    if (h > 0) return `${h}h ${m}m left`;
    return `${Math.max(m, 1)}m left`;
  })();

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="rounded-lg border border-cream-300 bg-cream-50 p-4 dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white truncate">{auction.title}</h3>
          <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1">
            <Clock size={11} />
            {timeLabel}
          </p>
        </div>
        <BidStatusBadge auction={auction} walletAddress={walletAddress} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-cream-200/50 p-2 dark:bg-slate-800">
          <p className="text-slate-500">Your bid</p>
          <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
            {formatStroops(auction.highestBid)} XLM
          </p>
        </div>
        <div className="rounded-md bg-cream-200/50 p-2 dark:bg-slate-800">
          <p className="text-slate-500">Starting bid</p>
          <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
            {formatStroops(auction.startingBid)} XLM
          </p>
        </div>
      </div>

      {status === 'won' && !auction.settled && (
        <button
          onClick={async () => {
            setBusy(true);
            try { await onSettle(auction.id); } finally { setBusy(false); }
          }}
          disabled={busy}
          className="btn-primary w-full justify-center stable-button text-xs"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
          Claim Win — Settle Auction
        </button>
      )}
    </motion.article>
  );
}

// ── Listing card (inside My Listings) ─────────────────────────────────────
function ListingCard({
  auction,
  walletAddress,
  onSettle,
}: {
  auction: AuctionListing;
  walletAddress: string;
  onSettle: (id: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const canSettle =
    !auction.settled &&
    auction.status === 'ended' &&
    auction.highestBidder !== null &&
    auction.highestBid !== '0' &&
    !auction.isPreview;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="rounded-lg border border-cream-300 bg-cream-50 p-4 dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white truncate">{auction.title}</h3>
          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{auction.description}</p>
        </div>
        <BidStatusBadge auction={auction} walletAddress={walletAddress} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-cream-200/50 p-2 dark:bg-slate-800">
          <p className="text-slate-500">Highest bid</p>
          <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
            {auction.highestBid === '0' ? 'No bids yet' : `${formatStroops(auction.highestBid)} XLM`}
          </p>
        </div>
        <div className="rounded-md bg-cream-200/50 p-2 dark:bg-slate-800">
          <p className="text-slate-500">Status</p>
          <p className="mt-0.5 font-semibold capitalize text-slate-900 dark:text-white">
            {auction.settled ? 'Settled' : auction.status}
          </p>
        </div>
      </div>

      {canSettle && (
        <button
          onClick={async () => {
            setBusy(true);
            try { await onSettle(auction.id); } finally { setBusy(false); }
          }}
          disabled={busy}
          className="btn-primary w-full justify-center stable-button text-xs"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          Settle & Collect Winning Bid
        </button>
      )}

      {auction.settled && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Trophy size={12} />
          Funds transferred to your wallet
        </div>
      )}
    </motion.article>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-cream-300 bg-cream-50/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950/40">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900">
        {icon}
      </div>
      <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function UserDashboard({ auctions, walletAddress, contractReady, onSettle, onBid }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashTab>('bids');
  const { myBids, myListings, dashStats } = useDashboard(auctions, walletAddress);

  // Count listings that need settlement (ended, has winning bid, not yet settled)
  const needsSettlement = useMemo(
    () => myListings.filter(
      (a) => !a.settled && a.status === 'ended' && a.highestBid !== '0' && a.highestBidder
    ).length,
    [myListings]
  );

  const tabs: { id: DashTab; label: string; count: number; badge?: number; icon: React.ReactNode }[] = [
    { id: 'bids', label: 'My Bids', count: myBids.length, icon: <Gavel size={15} /> },
    { id: 'listings', label: 'My Listings', count: myListings.length, badge: needsSettlement, icon: <ListOrdered size={15} /> },
  ];

  return (
    <section className="mt-8 sm:mt-10">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-400">
          <LayoutDashboard size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">My Dashboard</h2>
          <p className="text-xs text-slate-500 sm:text-sm">Personal view of your bids and listings on-chain.</p>
        </div>
      </div>

      {/* Preview mode notice */}
      {!contractReady && (
        <div className="mb-5 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
          <AlertCircle size={15} className="shrink-0" />
          Preview mode — connect a deployed contract to see your real on-chain bids and listings here.
        </div>
      )}

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile value={dashStats.activeBids} label="Active Bids" accent="text-cyan-600 dark:text-cyan-400" />
        <StatTile value={dashStats.wonAuctions} label="Auctions Won" accent="text-amber-600 dark:text-amber-400" />
        <StatTile value={dashStats.activeListings} label="Live Listings" accent="text-emerald-600 dark:text-emerald-400" />
        <StatTile value={needsSettlement} label="Needs Settlement" accent="text-orange-600 dark:text-orange-400" />
      </div>

      {/* Tab bar */}
      <div className="mb-5 flex gap-1 rounded-lg border border-cream-300 bg-cream-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                activeTab === tab.id
                  ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {tab.count}
            </span>
            {/* Urgent settlement badge */}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'bids' && (
          <motion.div
            key="bids"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {myBids.length === 0 ? (
              <EmptyState
                icon={<Gavel size={22} />}
                title="No bids placed yet"
                body="Place a bid on any live project from the Project Board to see it tracked here."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {myBids.map((auction) => (
                    <BidCard
                      key={auction.id}
                      auction={auction}
                      walletAddress={walletAddress}
                      onSettle={onSettle}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'listings' && (
          <motion.div
            key="listings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {myListings.length === 0 ? (
              <EmptyState
                icon={<ListOrdered size={22} />}
                title="No listings created yet"
                body="Use the Manager Listing Console to list a project on-chain. It will appear here."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {myListings.map((auction) => (
                    <ListingCard
                      key={auction.id}
                      auction={auction}
                      walletAddress={walletAddress}
                      onSettle={onSettle}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
