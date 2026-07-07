import type { AuctionListing } from '../types';

export type BidStatus =
  | 'leading'
  | 'outbid'
  | 'won'
  | 'settled_no_bid'
  | 'ended_no_bid'
  | 'your_listing'
  | 'listing_live'
  | 'listing_ended'
  | 'listing_settled';

/**
 * Derives the bid/listing status for a specific wallet address on a given auction.
 */
export function deriveBidStatus(
  auction: AuctionListing,
  walletAddress: string
): BidStatus {
  const isSeller = auction.seller.toLowerCase() === walletAddress.toLowerCase();
  const isHighestBidder =
    auction.highestBidder?.toLowerCase() === walletAddress.toLowerCase();

  // Seller view
  if (isSeller) {
    if (auction.settled) return 'listing_settled';
    if (auction.status === 'ended') return 'listing_ended';
    return 'listing_live';
  }

  // Bidder view
  if (auction.settled && isHighestBidder) return 'won';
  if (auction.status === 'live' && isHighestBidder) return 'leading';
  if ((auction.status === 'ended' || auction.settled) && isHighestBidder)
    return 'won';
  if (auction.status === 'ended' && !isHighestBidder) return 'outbid';

  return 'ended_no_bid';
}

const STATUS_CONFIG: Record<
  BidStatus,
  { label: string; classes: string }
> = {
  leading: {
    label: '🟢 Leading',
    classes:
      'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  },
  outbid: {
    label: '🔴 Outbid',
    classes:
      'bg-red-100 text-red-800 border border-red-300 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
  },
  won: {
    label: '🏆 Won',
    classes:
      'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  },
  settled_no_bid: {
    label: 'Settled',
    classes:
      'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
  ended_no_bid: {
    label: 'Ended',
    classes:
      'bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
  your_listing: {
    label: 'Your Listing',
    classes:
      'bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
  },
  listing_live: {
    label: '📢 Live',
    classes:
      'bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30',
  },
  listing_ended: {
    label: '⏰ Needs Settlement',
    classes:
      'bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
  },
  listing_settled: {
    label: '✅ Settled',
    classes:
      'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  },
};

interface BidStatusBadgeProps {
  auction: AuctionListing;
  walletAddress: string;
}

export function BidStatusBadge({ auction, walletAddress }: BidStatusBadgeProps) {
  const status = deriveBidStatus(auction, walletAddress);
  const { label, classes } = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}
    >
      {label}
    </span>
  );
}
