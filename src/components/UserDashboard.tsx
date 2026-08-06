import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, LayoutDashboard, Loader2 } from 'lucide-react';
import type { AuctionListing } from '../types';
import { useDashboard } from '../hooks/useDashboard';
import { BidStatusBadge, deriveBidStatus } from './BidStatusBadge';
import { formatStroops } from '../services/soroban';
import { getUserActivities } from '../services/userActivity';
import { ActivityHistoryTable } from './ActivityHistoryTable';

type DashTab = 'bids' | 'listings' | 'activity';

interface UserDashboardProps {
  auctions: AuctionListing[];
  walletAddress: string;
  contractReady: boolean;
  onSettle: (auctionId: number) => Promise<void>;
  onBid: (auctionId: number, amountXlm: string) => Promise<void>;
  onCancel?: (auctionId: number) => Promise<void>;
  selectedNetwork?: string;
}

// ── Stat tile ──────────────────────────────────────────────────────────────
function StatTile({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant dark:bg-slate-900 dark:border-slate-800 rounded-xl p-5 text-center transition-all duration-200">
      <p className={`text-headline-md font-black ${colorClass}`}>{value}</p>
      <span className="mt-1 block text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant dark:text-slate-400">{label}</span>
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
      className="bg-surface-container-lowest border border-outline-variant dark:bg-slate-900 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-auction hover:shadow-card-hover transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-body-lg font-bold text-primary dark:text-slate-100 truncate">{auction.title}</h3>
          <p className="mt-1 text-label-sm text-on-surface-variant dark:text-slate-400 flex items-center gap-1.5 font-semibold">
            <Clock size={13} />
            {timeLabel}
          </p>
        </div>
        <BidStatusBadge auction={auction} walletAddress={walletAddress} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container dark:bg-slate-800/80 rounded-lg p-2.5">
          <p className="text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wide">Your Bid</p>
          <p className="mt-0.5 text-body-md font-bold text-primary dark:text-slate-100">
            {formatStroops(auction.highestBid)} XLM
          </p>
        </div>
        <div className="bg-surface-container dark:bg-slate-800/80 rounded-lg p-2.5">
          <p className="text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wide">Starting</p>
          <p className="mt-0.5 text-body-md font-bold text-primary dark:text-slate-100">
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
          {busy ? <Loader2 size={14} className="animate-spin" /> : (
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>emoji_events</span>
          )}
          Claim Win & Settle On-Chain
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
  onCancel,
}: {
  auction: AuctionListing;
  walletAddress: string;
  onSettle: (id: number) => Promise<void>;
  onCancel?: (id: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const canSettle =
    !auction.settled &&
    auction.status === 'ended' &&
    auction.highestBidder !== null &&
    auction.highestBid !== '0' &&
    !auction.isPreview;

  const canCancel =
    !auction.settled &&
    auction.status === 'live' &&
    (auction.bidCount ?? 0) === 0 &&
    onCancel;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="bg-surface-container-lowest border border-outline-variant dark:bg-slate-900 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-auction hover:shadow-card-hover transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-body-lg font-bold text-primary dark:text-slate-100 truncate">{auction.title}</h3>
          <p className="mt-1 text-label-sm text-on-surface-variant dark:text-slate-400 line-clamp-2 leading-relaxed">{auction.description}</p>
        </div>
        <BidStatusBadge auction={auction} walletAddress={walletAddress} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container dark:bg-slate-800/80 rounded-lg p-2.5">
          <p className="text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wide">Highest Bid</p>
          <p className="mt-0.5 text-body-md font-bold text-primary dark:text-slate-100">
            {auction.highestBid === '0' ? 'No bids yet' : `${formatStroops(auction.highestBid)} XLM`}
          </p>
        </div>
        <div className="bg-surface-container dark:bg-slate-800/80 rounded-lg p-2.5">
          <p className="text-label-sm text-on-surface-variant dark:text-slate-400 uppercase tracking-wide">Status</p>
          <p className="mt-0.5 text-body-md font-bold capitalize text-primary dark:text-slate-100">
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
          {busy ? <Loader2 size={14} className="animate-spin" /> : (
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified_user</span>
          )}
          Settle & Collect Winner's Bid
        </button>
      )}

      {canCancel && (
        <button
          onClick={async () => {
            setBusy(true);
            try { await onCancel(auction.id); } finally { setBusy(false); }
          }}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-error/30 bg-error-container/10 px-4 py-2 text-body-sm font-semibold text-error hover:bg-error-container/20 transition-all stable-button text-xs"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : (
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>block</span>
          )}
          Cancel Listing
        </button>
      )}

      {auction.settled && (
        <div className="flex items-center gap-2 rounded-lg border border-success-green/30 bg-success-green/10 px-3.5 py-2.5 text-label-sm text-success-green font-semibold">
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check_circle</span>
          Auction closed / settled.
        </div>
      )}
    </motion.article>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface-variant">
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <p className="font-bold text-primary dark:text-slate-200 text-body-lg">{title}</p>
      <p className="mt-2 text-body-sm text-on-surface-variant dark:text-slate-450 max-w-sm mx-auto">{body}</p>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export function UserDashboard({ auctions, walletAddress, contractReady, onSettle, onBid, onCancel, selectedNetwork = 'testnet' }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashTab>('bids');
  const { myBids, myListings, dashStats } = useDashboard(auctions, walletAddress);
  const activities = useMemo(() => getUserActivities(walletAddress), [walletAddress, auctions]);

  // Count listings that need settlement (ended, has winning bid, not yet settled)
  const needsSettlement = useMemo(
    () => myListings.filter(
      (a) => !a.settled && a.status === 'ended' && a.highestBid !== '0' && a.highestBidder
    ).length,
    [myListings]
  );

  const tabs: { id: DashTab; label: string; count: number; badge?: number; icon: string }[] = [
    { id: 'bids', label: 'My Bids', count: myBids.length, icon: 'gavel' },
    { id: 'listings', label: 'My Listings', count: myListings.length, badge: needsSettlement, icon: 'list_alt' },
    { id: 'activity', label: 'Activity & Tx History', count: activities.length, icon: 'receipt_long' },
  ];

  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-primary dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
          <LayoutDashboard size={20} />
        </div>
        <div>
          <h2 className="text-headline-md font-bold text-primary dark:text-slate-100">My Dashboard</h2>
          <p className="text-body-sm text-on-surface-variant dark:text-slate-400">Personal view of your bids and listings on-chain.</p>
        </div>
      </div>

      {/* Preview mode notice */}
      {!contractReady && (
        <div className="mb-6 flex items-center gap-3.5 rounded-lg border border-secondary-container/40 bg-secondary-container/10 px-4 py-3 text-body-sm text-on-secondary-container">
          <AlertCircle size={16} className="shrink-0" />
          <span><span className="font-bold">Preview Mode:</span> Connect a deployed contract to view your real on-chain bids and listings.</span>
        </div>
      )}

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile value={dashStats.activeBids} label="Active Bids" colorClass="text-secondary" />
        <StatTile value={dashStats.wonAuctions} label="Auctions Won" colorClass="text-success-green" />
        <StatTile value={dashStats.activeListings} label="Live Listings" colorClass="text-auction-live" />
        <StatTile value={needsSettlement} label="Needs Settlement" colorClass="text-secondary-container" />
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-outline-variant bg-surface-container p-1.5 dark:bg-slate-900 dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-label-lg transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-surface-container-lowest text-primary shadow-sm border border-outline-variant dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                : 'text-on-surface-variant hover:text-on-surface dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{tab.icon}</span>
            {tab.label}
            <span
              className={`ml-1.5 rounded-full px-2 py-0.5 text-label-sm font-bold ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary dark:bg-slate-700 dark:text-slate-300'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {tab.count}
            </span>
            {/* Urgent settlement badge */}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary-container text-[11px] font-black text-primary shadow-md">
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
                icon="gavel"
                title="No bids placed yet"
                body="Place a bid on any live project from the Project Board to see it tracked here."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                icon="list_alt"
                title="No listings created yet"
                body="Use the Manager Listing Console to list a project on-chain. It will appear here."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {myListings.map((auction) => (
                    <ListingCard
                      key={auction.id}
                      auction={auction}
                      walletAddress={walletAddress}
                      onSettle={onSettle}
                      onCancel={onCancel}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <ActivityHistoryTable activities={activities} explorerNetwork={selectedNetwork} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
