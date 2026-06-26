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

  const submitBid = async () => {
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
    <article className="rounded-lg border border-slate-800 bg-slate-950/80 p-5 shadow-xl shadow-slate-950/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className={`status-dot ${auction.status}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {auction.status}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white">{auction.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{auction.description}</p>
        </div>
        <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
          <Gavel size={22} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-slate-900 p-3">
          <p className="text-slate-500">Current bid</p>
          <p className="mt-1 font-semibold text-white">{formatStroops(currentPrice)} XLM</p>
        </div>
        <div className="rounded-md bg-slate-900 p-3">
          <p className="text-slate-500">Minimum next</p>
          <p className="mt-1 font-semibold text-white">{minimumBid} XLM</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="flex min-w-0 items-center gap-2">
          <Wallet size={14} />
          <span className="truncate">{auction.seller}</span>
        </span>
        <span className="flex items-center gap-2 text-slate-300">
          <Clock size={14} />
          {timeLabel}
        </span>
      </div>

      {auction.highestBidder && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          <Trophy size={14} />
          Leading bidder: {auction.highestBidder.slice(0, 6)}...{auction.highestBidder.slice(-4)}
        </div>
      )}

      {error && <p className="mt-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {auction.status === 'live' ? (
        <div className="mt-5 flex gap-2">
          <input
            value={bidAmount}
            onChange={(event) => setBidAmount(event.target.value)}
            placeholder={`${minimumBid} XLM`}
            className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
          />
          <button onClick={submitBid} disabled={busy !== null} className="btn-primary stable-button">
            {busy === 'bid' ? <Loader2 className="animate-spin" size={18} /> : <Gavel size={18} />}
            Bid
          </button>
        </div>
      ) : (
        <button
          onClick={settle}
          disabled={auction.settled || busy !== null || !walletAddress}
          className="btn-primary mt-5 w-full justify-center stable-button"
        >
          {busy === 'settle' ? <Loader2 className="animate-spin" size={18} /> : <Trophy size={18} />}
          {auction.settled ? 'Settled' : walletAddress ? 'Settle Winner' : 'Connect to Settle'}
        </button>
      )}
    </article>
  );
}
