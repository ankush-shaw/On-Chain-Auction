import { useMemo } from 'react';
import { Coins, Percent, Award, Hourglass } from 'lucide-react';
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
        if (highestBidVal > 0n) {
          liveWithBids++;
        }
      } else if (a.status === 'ended' && !a.settled) {
        endedUnsettled++;
      }
    });

    const tvlXlm = formatStroops(totalVolumeStroops);
    const activeBidRatio = liveAuctions > 0 ? Math.round((liveWithBids / liveAuctions) * 100) : 0;
    const avgBidStroops = totalBidsCount > 0 ? totalVolumeStroops / BigInt(totalBidsCount) : 0n;
    const avgBidXlm = formatStroops(avgBidStroops);

    return {
      tvlXlm,
      activeBidRatio,
      avgBidXlm,
      endedUnsettled,
    };
  }, [auctions]);

  const cards = [
    {
      label: 'Total Volume Locked (TVL)',
      value: `${stats.tvlXlm} XLM`,
      desc: 'Sum of all active/final bids on-chain',
      icon: <Coins className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
      color: 'border-indigo-100 bg-indigo-50/45 dark:border-indigo-500/20 dark:bg-indigo-500/5',
    },
    {
      label: 'Active Bid Ratio',
      value: `${stats.activeBidRatio}%`,
      desc: 'Percentage of live listings with bids',
      icon: <Percent className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      color: 'border-emerald-100 bg-emerald-50/45 dark:border-emerald-500/20 dark:bg-emerald-500/5',
    },
    {
      label: 'Average Active Bid',
      value: `${stats.avgBidXlm} XLM`,
      desc: 'Mean value of non-zero bids',
      icon: <Award className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />,
      color: 'border-cyan-100 bg-cyan-50/45 dark:border-cyan-500/20 dark:bg-cyan-500/5',
    },
    {
      label: 'Pending Settlements',
      value: String(stats.endedUnsettled),
      desc: 'Ended auctions awaiting settlement',
      icon: <Hourglass className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      color: 'border-amber-100 bg-amber-50/45 dark:border-amber-500/20 dark:bg-amber-500/5',
    },
  ];

  return (
    <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-200 ${c.color}`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {c.label}
            </span>
            <div className="rounded-lg bg-white p-1.5 shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              {c.icon}
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {c.value}
            </h4>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{c.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
