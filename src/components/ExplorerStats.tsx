import { useMemo } from 'react';
import type { AuctionListing } from '../types';
import { formatStroops } from '../services/soroban';

interface ExplorerStatsProps {
  auctions: AuctionListing[];
}

export function ExplorerStats({ auctions }: ExplorerStatsProps) {
  const stats = useMemo(() => {
    let totalVolumeStroops = 0n;
    let liveAuctions = 0;
    let liveWithBids = 0;
    let totalBidsCount = 0;
    let endedUnsettled = 0;

    auctions.forEach((a) => {
      const highestBidVal = BigInt(a.highestBid || '0');
      if (highestBidVal > 0n) {
        totalVolumeStroops += highestBidVal;
        totalBidsCount++;
      }
      if (a.status === 'live') {
        liveAuctions++;
        if (highestBidVal > 0n) liveWithBids++;
      } else if (a.status === 'ended' && !a.settled) {
        endedUnsettled++;
      }
    });

    const tvlXlm = formatStroops(totalVolumeStroops);
    const activeBidRatio = liveAuctions > 0 ? Math.round((liveWithBids / liveAuctions) * 100) : 0;
    const avgBidStroops = totalBidsCount > 0 ? totalVolumeStroops / BigInt(totalBidsCount) : 0n;
    const avgBidXlm = formatStroops(avgBidStroops);

    return { tvlXlm, activeBidRatio, avgBidXlm, endedUnsettled, totalBidsCount };
  }, [auctions]);

  const items = [
    { icon: 'savings',       label: 'Total Volume (TVL)',      value: `${stats.tvlXlm} XLM`,        desc: 'Sum of all active/final bids' },
    { icon: 'percent',       label: 'Active Bid Ratio',        value: `${stats.activeBidRatio}%`,   desc: 'Live listings with bids' },
    { icon: 'trending_up',   label: 'Avg. Active Bid',         value: `${stats.avgBidXlm} XLM`,     desc: 'Mean of all non-zero bids' },
    { icon: 'hourglass_top', label: 'Pending Settlements',     value: String(stats.endedUnsettled), desc: 'Ended, awaiting settlement' },
  ];

  return (
    <section className="bg-primary py-10">
      <div className="mx-auto max-w-container-max px-gutter grid grid-cols-2 md:grid-cols-4 gap-8">
        {items.map((item, i) => (
          <div key={item.label} className={`text-center ${i > 0 ? 'border-l border-white/10' : ''}`}>
            <div className="text-headline-lg font-black text-secondary-container">{item.value}</div>
            <div className="mt-1 text-label-lg font-semibold text-on-primary-container">{item.label}</div>
            <div className="mt-0.5 text-label-sm text-on-primary opacity-40">{item.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
