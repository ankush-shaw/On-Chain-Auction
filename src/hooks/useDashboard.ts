import { useMemo } from 'react';
import type { AuctionListing } from '../types';

export interface DashboardStats {
  /** Auctions where the wallet is currently the highest bidder and still live */
  activeBids: number;
  /** Auctions the wallet has won (highest bidder + settled) */
  wonAuctions: number;
  /** Auctions created by the wallet that are still live */
  activeListings: number;
  /** Auctions created by the wallet that have been settled */
  settledListings: number;
}

export interface DashboardData {
  /** All auctions where the wallet is or was the highest bidder */
  myBids: AuctionListing[];
  /** All auctions where the wallet is the seller */
  myListings: AuctionListing[];
  /** Summary stats for the stats row */
  dashStats: DashboardStats;
}

/**
 * Filters the full auction list to surface only auctions relevant to the
 * connected wallet — either as highest bidder or as the listing seller.
 */
export function useDashboard(
  auctions: AuctionListing[],
  walletAddress: string | null
): DashboardData {
  return useMemo<DashboardData>(() => {
    if (!walletAddress) {
      return {
        myBids: [],
        myListings: [],
        dashStats: {
          activeBids: 0,
          wonAuctions: 0,
          activeListings: 0,
          settledListings: 0,
        },
      };
    }

    const addr = walletAddress.toLowerCase();

    const myBids = auctions.filter(
      (a) => a.highestBidder?.toLowerCase() === addr
    );

    const myListings = auctions.filter(
      (a) => a.seller.toLowerCase() === addr
    );

    const activeBids = myBids.filter(
      (a) => a.status === 'live' && !a.settled
    ).length;

    const wonAuctions = myBids.filter(
      (a) => a.settled || (a.status !== 'live' && a.highestBidder?.toLowerCase() === addr)
    ).length;

    const activeListings = myListings.filter(
      (a) => a.status === 'live' && !a.settled
    ).length;

    const settledListings = myListings.filter((a) => a.settled).length;

    return {
      myBids,
      myListings,
      dashStats: { activeBids, wonAuctions, activeListings, settledListings },
    };
  }, [auctions, walletAddress]);
}
