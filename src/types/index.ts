export type WalletState = {
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
};

export type AuctionStatus = 'live' | 'ended' | 'settled';

export interface AuctionListing {
  id: number;
  seller: string;
  title: string;
  description: string;
  startingBid: string;
  highestBid: string;
  highestBidder: string | null;
  token: string;
  endTime: number;
  settled: boolean;
  status: AuctionStatus;
  isPreview?: boolean;
  /** Optional instant‑purchase price (in stroops). */
  buyItNowPrice?: string | null;
  /** Number of bids placed on this auction. */
  bidCount?: number;
}
