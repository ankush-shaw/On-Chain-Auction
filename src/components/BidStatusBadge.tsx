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
  { label: string; icon: string; classes: string }
> = {
  leading: {
    label: 'Leading',
    icon: 'radio_button_checked',
    classes: 'bg-success-green/10 text-success-green border border-success-green/30',
  },
  outbid: {
    label: 'Outbid',
    icon: 'cancel',
    classes: 'bg-error/10 text-error border border-error/30',
  },
  won: {
    label: 'Won',
    icon: 'emoji_events',
    classes: 'bg-secondary-container/10 text-secondary border border-secondary-container/30',
  },
  settled_no_bid: {
    label: 'Settled',
    icon: 'check_circle',
    classes: 'bg-on-surface/10 text-on-surface-variant border border-outline-variant',
  },
  ended_no_bid: {
    label: 'Ended',
    icon: 'cancel',
    classes: 'bg-on-surface/10 text-on-surface-variant border border-outline-variant',
  },
  your_listing: {
    label: 'Your Listing',
    icon: 'account_circle',
    classes: 'bg-primary/10 text-primary border border-primary/20 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  listing_live: {
    label: 'Live',
    icon: 'radio_button_checked',
    classes: 'bg-auction-live/10 text-auction-live border border-auction-live/30',
  },
  listing_ended: {
    label: 'Action Required',
    icon: 'hourglass_empty',
    classes: 'bg-secondary-container/20 text-on-secondary-container border border-secondary-container/40',
  },
  listing_settled: {
    label: 'Settled',
    icon: 'check_circle',
    classes: 'bg-success-green/10 text-success-green border border-success-green/30',
  },
};

interface BidStatusBadgeProps {
  auction: AuctionListing;
  walletAddress: string;
}

export function BidStatusBadge({ auction, walletAddress }: BidStatusBadgeProps) {
  const status = deriveBidStatus(auction, walletAddress);
  const { label, icon, classes } = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-semibold uppercase tracking-wide ${classes}`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '12px', lineHeight: 1 }}>{icon}</span>
      {label}
    </span>
  );
}
