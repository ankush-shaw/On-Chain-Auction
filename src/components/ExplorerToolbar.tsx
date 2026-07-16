import { Search, X, Star } from 'lucide-react';

export type StatusFilterType = 'all' | 'live' | 'ended' | 'settled';

interface ExplorerToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: StatusFilterType;
  setStatusFilter: (status: StatusFilterType) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  showWatchedOnly: boolean;
  setShowWatchedOnly: (val: boolean) => void;
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
  showWatchedOnly,
  setShowWatchedOnly,
  hasActiveFilters,
  onReset,
}: ExplorerToolbarProps) {
  const statusOptions: { label: string; value: StatusFilterType; icon: string }[] = [
    { label: 'All',     value: 'all',     icon: 'grid_view' },
    { label: 'Live',    value: 'live',    icon: 'radio_button_checked' },
    { label: 'Ended',   value: 'ended',   icon: 'cancel' },
    { label: 'Settled', value: 'settled', icon: 'check_circle' },
  ];

  const sortOptions = [
    { label: 'Ending Soonest',       value: 'ending_soon' },
    { label: 'Newest Listings',      value: 'newest' },
    { label: 'Highest Bid Price',    value: 'highest_price' },
    { label: 'Lowest Starting Price',value: 'lowest_price' },
  ];

  return (
    <div className="mb-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center">

      {/* Search Input */}
      <div className="relative flex-1 min-w-0 max-w-xs">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-outline" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects…"
          className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {/* Status Pill Tabs */}
        <div className="flex items-center bg-surface-container rounded-lg p-1 border border-outline-variant">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`flex items-center gap-1 px-3 py-1.5 text-label-sm font-semibold rounded-md transition-all duration-200 ${
                statusFilter === opt.value
                  ? 'bg-surface-container-lowest text-primary shadow-sm border border-outline-variant'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Watched Only */}
        <button
          onClick={() => setShowWatchedOnly(!showWatchedOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 text-label-sm font-semibold rounded-lg border transition-all duration-200 ${
            showWatchedOnly
              ? 'border-secondary-container/50 bg-secondary-container/10 text-secondary'
              : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
          }`}
          title={showWatchedOnly ? 'Show all listings' : 'Filter by watched'}
        >
          <Star size={13} fill={showWatchedOnly ? 'currentColor' : 'none'} />
          Watchlist
        </button>

        {/* Sort Select */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border border-outline-variant bg-surface-container-lowest text-label-sm font-semibold text-on-surface rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-label-sm font-semibold text-error border border-error/30 hover:bg-error-container px-3 py-2 rounded-lg transition-all"
          >
            <X size={13} />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
