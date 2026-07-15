import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'onchain_auction_watchlist_';

export function useWatchlist(walletAddress: string | null) {
  const storageKey = walletAddress
    ? `${STORAGE_PREFIX}${walletAddress}`
    : `${STORAGE_PREFIX}global`;

  const [watchedIds, setWatchedIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return new Set(parsed.map(Number));
        }
      }
    } catch (e) {
      console.error('Failed to parse watchlist from localStorage', e);
    }
    return new Set<number>();
  });

  // Re-load watched IDs when walletAddress changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWatchedIds(new Set(parsed.map(Number)));
          return;
        }
      }
    } catch (e) {
      console.error('Failed to parse watchlist from localStorage on wallet change', e);
    }
    setWatchedIds(new Set<number>());
  }, [storageKey]);

  const toggleWatch = useCallback(
    (id: number) => {
      setWatchedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch (e) {
          console.error('Failed to save watchlist to localStorage', e);
        }
        return next;
      });
    },
    [storageKey]
  );

  const isWatched = useCallback(
    (id: number) => {
      return watchedIds.has(id);
    },
    [watchedIds]
  );

  return {
    watchedIds,
    toggleWatch,
    isWatched,
  };
}
