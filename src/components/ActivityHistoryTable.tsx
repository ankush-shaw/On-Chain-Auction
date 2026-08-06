import { useState } from 'react';
import { ExternalLink, Gavel, PlusCircle, CheckCircle, Ban, History, Filter } from 'lucide-react';
import type { ActivityRecord, ActivityType } from '../services/userActivity';
import { useXlmPrice } from '../hooks/useXlmPrice';

interface ActivityHistoryTableProps {
  activities: ActivityRecord[];
  explorerNetwork?: string;
}

export function ActivityHistoryTable({ activities, explorerNetwork = 'testnet' }: ActivityHistoryTableProps) {
  const { formatUsd } = useXlmPrice();
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');

  const filteredActivities = activities.filter((act) => filterType === 'all' || act.type === filterType);

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container px-6 py-12 text-center">
        <History size={36} className="mx-auto mb-3 opacity-40 text-on-surface-variant" />
        <p className="font-bold text-primary dark:text-slate-200 text-body-lg">No Activity History Yet</p>
        <p className="mt-1 text-body-sm text-on-surface-variant dark:text-slate-400 max-w-sm mx-auto">
          Your transactions, bids, creations, and settlements will appear here with Stellar Explorer links.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Activity Filter Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 text-label-sm font-semibold text-on-surface-variant dark:text-slate-400">
          <Filter size={14} /> Filter:
        </div>
        <div className="flex gap-1.5">
          {(['all', 'bid', 'create', 'settle', 'cancel'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                filterType === type
                  ? 'bg-primary text-on-primary dark:bg-slate-700 dark:text-slate-100 shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              {type === 'all' ? 'All Transactions' : type}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest dark:bg-slate-900 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-body-sm">
          <thead>
            <tr className="border-b border-outline-variant/60 bg-surface-container-low dark:bg-slate-950 dark:border-slate-800 text-label-sm text-on-surface-variant uppercase tracking-wider">
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Auction</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Tx Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30 dark:divide-slate-800/60">
            {filteredActivities.map((act) => {
            const icon =
              act.type === 'bid' ? <Gavel size={14} className="text-secondary" /> :
              act.type === 'create' ? <PlusCircle size={14} className="text-primary dark:text-slate-200" /> :
              act.type === 'settle' ? <CheckCircle size={14} className="text-success-green" /> :
              <Ban size={14} className="text-error" />;

            const typeLabel =
              act.type === 'bid' ? 'Placed Bid' :
              act.type === 'create' ? 'Created Listing' :
              act.type === 'settle' ? 'Settled Winner' :
              'Cancelled Listing';

            const badgeStyle =
              act.type === 'bid' ? 'bg-secondary-container/15 text-secondary border-secondary-container/30' :
              act.type === 'create' ? 'bg-primary/10 text-primary dark:bg-slate-800 dark:text-slate-300 border-primary/20' :
              act.type === 'settle' ? 'bg-success-green/10 text-success-green border-success-green/30' :
              'bg-error-container/10 text-error border-error/30';

            return (
              <tr key={act.id} className="hover:bg-surface-container/50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${badgeStyle}`}>
                    {icon}
                    {typeLabel}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-primary dark:text-slate-100 max-w-[200px] truncate" title={act.auctionTitle}>
                  {act.auctionTitle}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {act.amountXlm ? (
                    <div>
                      <span className="font-bold text-primary dark:text-slate-200">{act.amountXlm} XLM</span>
                      <span className="ml-1.5 text-[11px] text-on-surface-variant dark:text-slate-400">
                        (~{formatUsd(act.amountXlm)})
                      </span>
                    </div>
                  ) : (
                    <span className="text-on-surface-variant opacity-50">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant dark:text-slate-400 text-[12px]">
                  {new Date(act.timestamp * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {act.txHash ? (
                    <a
                      href={`https://stellar.expert/explorer/${explorerNetwork}/tx/${act.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[12px] text-secondary hover:underline"
                    >
                      {act.txHash.slice(0, 8)}… <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="text-on-surface-variant opacity-50 text-[12px]">Simulated / Demo</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
  );
}
