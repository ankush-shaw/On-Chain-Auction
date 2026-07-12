import { Search, X, SlidersHorizontal } from 'lucide-react';

export type StatusFilterType = 'all' | 'live' | 'ended' | 'settled';

interface ExplorerToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: StatusFilterType;
  setStatusFilter: (status: StatusFilterType) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
}

export function ExplorerToolbar({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  hasActiveFilters,
  onReset,
}: ExplorerToolbarProps) {
  const statusOptions: { label: string; value: StatusFilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Live', value: 'live' },
    { label: 'Ended', value: 'ended' },
    { label: 'Settled', value: 'settled' },
  ];

  const sortOptions = [
    { label: 'Ending Soonest', value: 'ending_soon' },
    { label: 'Newest Listings', value: 'newest' },
    { label: 'Highest Bid Price', value: 'highest_price' },
    { label: 'Lowest Starting Price', value: 'lowest_price' },
  ];

  return (
    <div className="mb-6 rounded-xl border border-cream-300 bg-cream-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
      {/* Search Input */}
      <div className="relative w-full md:w-80">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          className="w-full pl-9 pr-8 py-2 rounded-lg border border-cream-300 bg-cream-100/50 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Options */}
      <div className="w-full md:w-auto flex flex-wrap gap-4 items-center justify-between md:justify-end">
        {/* Status Pills */}
        <div className="flex bg-cream-200/50 p-1 rounded-lg dark:bg-slate-800/80 border border-cream-300 dark:border-slate-700">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                statusFilter === opt.value
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-905 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-400 dark:text-slate-500 hidden sm:inline" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-cream-100/50 border border-cream-300 dark:border-slate-700 dark:bg-slate-850 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-cream-50 dark:bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-200 hover:border-red-300 dark:border-red-900 px-3 py-2 rounded-lg transition-colors flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
