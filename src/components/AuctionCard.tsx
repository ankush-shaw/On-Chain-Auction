import { useMemo, useState } from 'react';
import { Clock, Gavel, Loader2, Trophy, Wallet } from 'lucide-react';
import type { AuctionListing } from '../types';
import { formatStroops } from '../services/soroban';

interface AuctionCardProps {
  auction: AuctionListing;
  walletAddress: string | null;
  onConnect: () => void;
  onBid: (auctionId: number, amountXlm: string) => Promise<void>;
  onSettle: (auctionId: number) => Promise<void>;
}

export function AuctionCard({ auction, walletAddress, onConnect, onBid, onSettle }: AuctionCardProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [busy, setBusy] = useState<'bid' | 'settle' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPrice = auction.highestBid !== '0' ? auction.highestBid : auction.startingBid;
  const minimumBid = useMemo(() => {
    const next = BigInt(currentPrice) + (auction.highestBid === '0' ? 0n : 1n);
    return formatStroops(next);
  }, [auction.highestBid, currentPrice]);

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

  return (
    <article className="rounded-lg border border-cream-300 bg-cream-50 p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-xl dark:shadow-slate-950/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <span className={`status-dot ${auction.status}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {auction.isPreview ? 'preview' : auction.status}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug dark:text-white">{auction.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-3 dark:text-slate-400">{auction.description}</p>
        </div>
        <div className="rounded-md border border-cyan-200 bg-cyan-50/50 p-2.5 sm:p-3 text-cyan-700 shrink-0 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
          <Gavel size={20} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-cream-200/50 p-3 dark:bg-slate-900">
          <p className="text-slate-500">Current bid</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatStroops(currentPrice)} XLM</p>
        </div>
        <div className="rounded-md bg-cream-200/50 p-3 dark:bg-slate-900">
          <p className="text-slate-500">Minimum next</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{minimumBid} XLM</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="flex min-w-0 items-center gap-1.5">
          <Wallet size={13} className="shrink-0" />
          <span className="truncate font-mono" title={auction.seller}>
            {auction.seller.slice(0, 6)}...{auction.seller.slice(-6)}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-slate-700 shrink-0 dark:text-slate-300">
          <Clock size={13} />
          {timeLabel}
        </span>
      </div>

      {auction.highestBidder && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          <Trophy size={14} />
          Leading bidder: {auction.highestBidder.slice(0, 6)}...{auction.highestBidder.slice(-4)}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {auction.status === 'live' ? (
        <div className="mt-5 flex flex-col xs:flex-row gap-2">
          <input
            value={bidAmount}
            onChange={(event) => setBidAmount(event.target.value)}
            placeholder={`${minimumBid} XLM`}
            disabled={!canTransact}
            className="min-w-0 flex-1 rounded-md border border-cream-300 bg-cream-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-cyan-400"
          />
          <button onClick={submitBid} disabled={busy !== null || !canTransact} className="btn-primary stable-button shrink-0">
            {busy === 'bid' ? <Loader2 className="animate-spin" size={18} /> : <Gavel size={18} />}
            {canTransact ? 'Bid' : 'Preview'}
          </button>
        </div>
      ) : (
        <button
          onClick={settle}
          disabled={auction.settled || busy !== null || !walletAddress || !canSettle}
          className="btn-primary mt-5 w-full justify-center stable-button"
        >
          {busy === 'settle' ? <Loader2 className="animate-spin" size={18} /> : <Trophy size={18} />}
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
    </article>
  );
}
