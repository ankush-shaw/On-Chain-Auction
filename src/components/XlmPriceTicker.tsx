import { TrendingUp, RefreshCw } from 'lucide-react';
import { useXlmPrice } from '../hooks/useXlmPrice';

export function XlmPriceTicker() {
  const { priceUsd, loading, refreshPrice } = useXlmPrice();

  return (
    <div className="hidden sm:flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-label-sm font-semibold dark:bg-slate-900 dark:border-slate-800">
      <span className="flex h-2 w-2 rounded-full bg-success-green animate-pulse" />
      <span className="text-on-surface-variant dark:text-slate-400">1 XLM =</span>
      <span className="font-bold text-primary dark:text-slate-200">${priceUsd.toFixed(3)} USD</span>
      <button
        onClick={refreshPrice}
        title="Refresh live price rate"
        disabled={loading}
        className="ml-0.5 text-on-surface-variant hover:text-primary dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}
