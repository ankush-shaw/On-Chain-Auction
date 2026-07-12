/**
 * generateBidChartData — derives a plausible bid price history
 * from a single AuctionListing snapshot.
 *
 * Because Soroban doesn't store bid history on-chain (only the current
 * highest bid), we reconstruct a realistic price trajectory using the
 * known anchor points (starting bid, current highest bid, time elapsed)
 * and add deterministic "filler" bids seeded from the auction id so the
 * chart is stable across re-renders and preview reloads.
 */
import type { AuctionListing } from '../types';

export interface BidPoint {
  /** Unix timestamp in seconds */
  time: number;
  /** Bid amount in stroops (raw BigInt string) */
  amountStroops: string;
  /** Display label for tooltip */
  label: string;
}

const CHART_POINTS = 8;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateBidChartData(auction: AuctionListing): BidPoint[] {
  const startingBid = BigInt(auction.startingBid || '0');
  const highestBid = BigInt(auction.highestBid || '0');
  const hasBids = highestBid > 0n;

  const now = Math.floor(Date.now() / 1000);
  const auctionStart = auction.endTime - 7 * 24 * 3600; // assume 7-day window
  const elapsed = Math.min(now, auction.endTime) - auctionStart;

  if (!hasBids || elapsed <= 0) {
    // Only starting bid — flat line
    return Array.from({ length: CHART_POINTS }, (_, i) => ({
      time: auctionStart + Math.floor((elapsed / (CHART_POINTS - 1)) * i),
      amountStroops: startingBid.toString(),
      label: `${i === 0 ? 'Start' : 'No bids yet'}`,
    }));
  }

  const rand = seededRandom(auction.id * 31337);
  const points: BidPoint[] = [];

  // First point — starting bid at auction open
  points.push({
    time: auctionStart,
    amountStroops: startingBid.toString(),
    label: 'Opening bid',
  });

  // Generate intermediate bids rising toward highest bid
  const range = highestBid - startingBid;
  const intermediates = CHART_POINTS - 2;

  for (let i = 1; i <= intermediates; i++) {
    const progress = i / (intermediates + 1);
    // Exponential-like growth curve with random jitter
    const base = startingBid + BigInt(Math.floor(Number(range) * (progress ** 1.4)));
    const jitter = BigInt(Math.floor(Number(range) * 0.05 * (rand() - 0.5)));
    const amount = base + jitter < startingBid ? startingBid : base + jitter;
    const clampedAmount = amount > highestBid ? highestBid - 1n : amount;

    points.push({
      time: auctionStart + Math.floor((elapsed * progress) * 0.95),
      amountStroops: clampedAmount.toString(),
      label: `Bid #${i}`,
    });
  }

  // Final point — current highest bid
  points.push({
    time: Math.min(now, auction.endTime),
    amountStroops: highestBid.toString(),
    label: auction.settled ? 'Winning bid' : 'Current high',
  });

  return points;
}

export function calcBidMetrics(auction: AuctionListing) {
  const starting = BigInt(auction.startingBid || '0');
  const highest = BigInt(auction.highestBid || '0');
  const hasBids = highest > 0n && highest !== starting;

  const premiumPct = hasBids && starting > 0n
    ? Math.round((Number(highest - starting) / Number(starting)) * 100)
    : 0;

  const now = Math.floor(Date.now() / 1000);
  const totalDuration = 7 * 24 * 3600;
  const elapsed = Math.min(now, auction.endTime) - (auction.endTime - totalDuration);
  const progressPct = Math.max(0, Math.min(100, Math.round((elapsed / totalDuration) * 100)));

  return { premiumPct, progressPct, hasBids };
}
