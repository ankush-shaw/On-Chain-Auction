import { useMemo, useState } from 'react';
import { BarChart2, ChevronDown, ChevronUp, Loader2, Star } from 'lucide-react';
import type { AuctionListing } from '../types';
import { formatStroops } from '../services/soroban';
import { BidPriceChart } from './BidPriceChart';

interface AuctionCardProps {
  auction: AuctionListing;
  walletAddress: string | null;
  onConnect: () => void;
  onBid: (auctionId: number, amountXlm: string) => Promise<void>;
  onSettle: (auctionId: number) => Promise<void>;
  isWatched?: boolean;
  onToggleWatch?: (id: number) => void;
}

export function AuctionCard({
  auction,
  walletAddress,
  onConnect,
  onBid,
  onSettle,
  isWatched = false,
  onToggleWatch,
}: AuctionCardProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [busy, setBusy] = useState<'bid' | 'settle' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);

  const currentPrice = auction.highestBid !== '0' ? auction.highestBid : auction.startingBid;
  const minimumBid = useMemo(() => {
    if (auction.highestBid === '0') {
      // No bids yet – must meet starting bid.
      return formatStroops(BigInt(auction.startingBid));
    }
    const hb = BigInt(auction.highestBid);
    // 5% increment, rounded up: hb + ceil(hb * 500 / 10000)
    const increment = (hb * 500n + 9999n) / 10000n;
    return formatStroops(hb + increment);
  }, [auction.highestBid, auction.startingBid]);

  const hasBuyNow = auction.buyItNowPrice && auction.buyItNowPrice !== '0' && !auction.settled;
  const buyNowFormatted = hasBuyNow ? formatStroops(auction.buyItNowPrice!) : null;

  const timeLabel = useMemo(() => {
    const seconds = auction.endTime - Math.floor(Date.now() / 1000);
    if (auction.settled) return 'Settled';
    if (seconds <= 0) return 'Ended';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${Math.max(minutes, 1)}m left`;
  }, [auction.endTime, auction.settled]);

  const canTransact = !auction.isPreview;
  const canSettle =
    canTransact &&
    !auction.settled &&
    auction.status === 'ended' &&
    auction.highestBidder !== null &&
    auction.highestBid !== '0';

  const submitBid = async () => {
    if (!canTransact) {
      setError('Preview listing only. Deploy the contract to place real bids.');
      return;
    }
    if (!walletAddress) {
      onConnect();
      return;
    }
    setBusy('bid');
    setError(null);
    try {
      await onBid(auction.id, bidAmount);
      setBidAmount('');
    } catch (e: any) {
      setError(e.message || 'Bid failed.');
    } finally {
      setBusy(null);
    }
  };

  const settle = async () => {
    if (!canSettle) {
      setError(
        auction.isPreview
          ? 'Preview listing only. Deploy the contract to settle real auctions.'
          : 'This auction cannot be settled until it ends with at least one bid.'
      );
      return;
    }
    setBusy('settle');
    setError(null);
    try {
      await onSettle(auction.id);
    } catch (e: any) {
      setError(e.message || 'Settlement failed.');
    } finally {
      setBusy(null);
    }
  };

  // Status badge config
  const statusBadge = {
    live:    { label: 'Live', cls: 'live',    icon: 'radio_button_checked' },
    ended:   { label: 'Ended', cls: 'ended',  icon: 'cancel' },
    settled: { label: 'Settled', cls: 'settled', icon: 'check_circle' },
    preview: { label: 'Preview', cls: 'preview', icon: 'visibility' },
  }[auction.isPreview ? 'preview' : auction.status] ?? { label: auction.status, cls: 'ended', icon: 'cancel' };

  return (
    <article className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-auction auction-card-hover transition-all duration-200 overflow-hidden flex flex-col">

      {/* ── Card Header ── */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Status badge */}
          <div className="mb-3 flex items-center gap-2">
            <span className={`status-badge ${statusBadge.cls}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px', lineHeight: 1 }}>{statusBadge.icon}</span>
              {statusBadge.label}
            </span>
            {auction.isPreview && (
              <span className="text-label-sm text-on-surface-variant opacity-60">Preview</span>
            )}
          </div>

          <h3 className="text-headline-sm font-bold text-primary leading-snug">{auction.title}</h3>
          <p className="mt-1.5 text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">{auction.description}</p>
        </div>

        {/* Watch / Icon column */}
        <div className="flex flex-col gap-2 shrink-0 items-end">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>gavel</span>
          </div>
          {onToggleWatch && (
            <button
              onClick={() => onToggleWatch(auction.id)}
              className={`p-1.5 rounded-lg border transition-all duration-200 hover:scale-105 ${
                isWatched
                  ? 'border-secondary-container/50 bg-secondary-container/10 text-secondary'
                  : 'border-outline-variant bg-surface-container text-outline hover:text-on-surface'
              }`}
              title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <Star size={15} fill={isWatched ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>

      {/* ── Bid Data Row ── */}
      <div className={`mx-5 grid ${hasBuyNow ? 'grid-cols-3' : 'grid-cols-2'} gap-3 border-t border-outline-variant pt-4`}>
        <div className="bg-surface-container rounded-lg px-3 py-2.5">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">Current Bid</p>
          <p className="mt-0.5 text-body-md font-bold text-primary">{formatStroops(currentPrice)} <span className="text-label-sm font-semibold text-on-surface-variant">XLM</span></p>
        </div>
        <div className="bg-surface-container rounded-lg px-3 py-2.5">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wide">Next Min. (+5%)</p>
          <p className="mt-0.5 text-body-md font-bold text-primary">{minimumBid} <span className="text-label-sm font-semibold text-on-surface-variant">XLM</span></p>
        </div>
        {hasBuyNow && (
          <div className="bg-secondary-container/15 border border-secondary/20 rounded-lg px-3 py-2.5">
            <p className="text-label-sm text-secondary uppercase tracking-wide">Buy It Now</p>
            <p className="mt-0.5 text-body-md font-bold text-secondary">{buyNowFormatted} <span className="text-label-sm font-semibold text-on-surface-variant">XLM</span></p>
          </div>
        )}
      </div>

      {/* ── Meta row ── */}
      <div className="mx-5 mt-3 flex items-center justify-between text-label-sm text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>account_circle</span>
          <span className="font-mono truncate max-w-[120px]" title={auction.seller}>
            {auction.seller.slice(0, 6)}…{auction.seller.slice(-4)}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {auction.bidCount != null && auction.bidCount > 0 && (
            <span className="flex items-center gap-1 text-secondary font-semibold">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>how_to_vote</span>
              {auction.bidCount} bid{auction.bidCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-primary font-semibold">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
            {timeLabel}
          </span>
        </span>
      </div>

      {/* ── Leading bidder strip ── */}
      {auction.highestBidder && (
        <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-secondary-container/30 bg-secondary-container/8 px-3 py-2">
          <span className="material-symbols-outlined text-secondary" style={{ fontSize: '14px' }}>emoji_events</span>
          <span className="text-label-sm text-on-secondary-container font-semibold">
            Leading: {auction.highestBidder.slice(0, 6)}…{auction.highestBidder.slice(-4)}
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <p className="mx-5 mt-3 rounded-lg bg-error-container border border-error/30 px-3 py-2 text-body-sm text-on-error-container">
          {error}
        </p>
      )}

      {/* ── Action Zone ── */}
      <div className="mt-4 mx-5 mb-5 flex-1 flex flex-col justify-end gap-2">
        {auction.status === 'live' ? (
          <>
          <div className="flex gap-2">
            <input
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={`${minimumBid} XLM`}
              disabled={!canTransact}
              className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-outline"
            />
            <button
              onClick={submitBid}
              disabled={busy !== null || !canTransact}
              className="btn-primary shrink-0 stable-button"
            >
              {busy === 'bid' ? <Loader2 className="animate-spin" size={16} /> : (
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>gavel</span>
              )}
              {canTransact ? 'Bid' : 'Preview'}
            </button>
          </div>
          {/* Buy It Now button */}
          {hasBuyNow && canTransact && (
            <button
              onClick={async () => {
                if (!walletAddress) { onConnect(); return; }
                setBusy('bid');
                setError(null);
                try {
                  await onBid(auction.id, buyNowFormatted!);
                  setBidAmount('');
                } catch (e: any) {
                  setError(e.message || 'Buy It Now failed.');
                } finally {
                  setBusy(null);
                }
              }}
              disabled={busy !== null}
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-secondary bg-secondary/10 px-4 py-2.5 text-body-sm font-bold text-secondary hover:bg-secondary hover:text-on-secondary transition-all stable-button"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>shopping_cart</span>
              Buy It Now — {buyNowFormatted} XLM
            </button>
          )}
          </>
        ) : (
          <button
            onClick={settle}
            disabled={auction.settled || busy !== null || !walletAddress || !canSettle}
            className="btn-primary w-full justify-center stable-button"
          >
            {busy === 'settle' ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>emoji_events</span>
            )}
            {auction.settled
              ? 'Settled'
              : !canTransact
                ? 'Preview Only'
                : !canSettle
                  ? 'No Winning Bid'
                  : walletAddress
                    ? 'Settle Winner'
                    : 'Connect to Settle'}
          </button>
        )}

        {/* Analytics toggle */}
        <button
          onClick={() => setShowChart((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container py-2 text-label-sm font-semibold text-on-surface-variant hover:text-primary hover:border-primary/40 hover:bg-surface-container-high transition-all"
          aria-expanded={showChart}
          aria-label="Toggle bid price chart"
        >
          <BarChart2 size={13} />
          {showChart ? 'Hide Analytics' : 'View Analytics'}
          {showChart ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Expandable chart */}
      {showChart && (
        <div className="border-t border-outline-variant">
          <BidPriceChart auction={auction} />
        </div>
      )}
    </article>
  );
}
