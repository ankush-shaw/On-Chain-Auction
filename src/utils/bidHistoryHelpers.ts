import type { AuctionListing, BidRecord } from '../types';

export function generateDemoBidHistory(auction: AuctionListing): BidRecord[] {
  const records: BidRecord[] = [];
  const now = Math.floor(Date.now() / 1000);

  if (auction.highestBid !== '0' && auction.highestBidder) {
    records.push({
      id: `${auction.id}-highest`,
      auctionId: auction.id,
      bidder: auction.highestBidder,
      amountStroops: auction.highestBid,
      timestamp: auction.endTime - 1800,
      isBuyItNow: auction.settled && auction.buyItNowPrice === auction.highestBid,
    });
  }

  // Generate prior incremental bids if bidCount > 1
  const count = Math.max(1, auction.bidCount ?? (records.length > 0 ? 1 : 0));
  if (records.length > 0 && count > 1) {
    let currentAmount = BigInt(auction.highestBid);
    const startAmount = BigInt(auction.startingBid);

    for (let i = count - 1; i >= 1; i--) {
      currentAmount = (currentAmount * 90n) / 100n; // 10% lower step
      if (currentAmount < startAmount) currentAmount = startAmount;

      records.push({
        id: `${auction.id}-bid-${i}`,
        auctionId: auction.id,
        bidder: i % 2 === 0 ? 'GDMMSDM3KSHC5FBN2SIZYOH3FLT5ICAHHNYYCCEB7UFZZ3KMBT44OI4E' : 'CCATST7MXGZQWB6HQCHDLUKUZA6MVK4KIGCDFVQ34COE543GTINOK3BL',
        amountStroops: currentAmount.toString(),
        timestamp: auction.endTime - (3600 * (count - i + 1)),
      });

      if (currentAmount === startAmount) break;
    }
  }

  return records;
}
