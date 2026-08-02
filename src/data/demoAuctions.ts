import type { AuctionListing } from '../types';

const now = Math.floor(Date.now() / 1000);

/**
 * A fixed demo bidder address used in preview mode so the dashboard
 * shows realistic data without a live wallet connection.
 */
export const DEMO_BIDDER_ADDRESS = 'GBBIG4HLPGTLG6BH6YREVWJXEQ4NX74HTD444JD6A6XYS7DOFL2J6DEI';

export const demoAuctions: AuctionListing[] = [
  {
    id: 101,
    isPreview: true,
    seller: 'GDMMSDM3KSHC5FBN2SIZYOH3FLT5ICAHHNYYCCEB7UFZZ3KMBT44OI4E',
    title: 'Mobile app landing page',
    description:
      'A polished first-screen product page with wallet-gated preorder intent and analytics-ready conversion events.',
    startingBid: '250000000',
    highestBid: '310000000',
    highestBidder: 'GBBIG4HLPGTLG6BH6YREVWJXEQ4NX74HTD444JD6A6XYS7DOFL2J6DEI',
    token: 'XLM',
    endTime: now + 86_400,
    settled: false,
    status: 'live',
    buyItNowPrice: '500000000',
    reservePrice: '300000000',
    bidCount: 3,
  },
  {
    id: 102,
    isPreview: true,
    seller: 'CCATST7MXGZQWB6HQCHDLUKUZA6MVK4KIGCDFVQ34COE543GTINOK3BL',
    title: 'Brand identity sprint',
    description:
      'Logo system, color tokens, typography direction, and a launch-ready social media kit for a new Web3 product.',
    startingBid: '400000000',
    highestBid: '0',
    highestBidder: null,
    token: 'XLM',
    endTime: now + 172_800,
    settled: false,
    status: 'live',
    buyItNowPrice: null,
    reservePrice: '600000000',
    bidCount: 0,
  },
  {
    id: 103,
    isPreview: true,
    seller: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    title: 'Smart contract audit block',
    description:
      'A focused audit slot for one Soroban contract, including issue notes, exploit narratives, and remediation checks.',
    startingBid: '900000000',
    highestBid: '1250000000',
    highestBidder: DEMO_BIDDER_ADDRESS,
    token: 'XLM',
    endTime: now - 3_600,
    settled: true,
    status: 'settled',
    buyItNowPrice: null,
    reservePrice: null,
    bidCount: 5,
  },
];
