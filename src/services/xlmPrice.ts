/**
 * Service to fetch and manage live XLM/USD exchange rates.
 * Uses CoinGecko API with Horizon fallback and cached local storage.
 */

const FALLBACK_XLM_USD_PRICE = 0.125;
const CACHE_KEY = 'xlm_usd_price_cache';
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export interface PriceCache {
  priceUsd: number;
  timestamp: number;
}

export async function fetchXlmPriceUsd(): Promise<number> {
  // Check localStorage cache first
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cache: PriceCache = JSON.parse(cachedRaw);
      if (Date.now() - cache.timestamp < CACHE_TTL_MS) {
        return cache.priceUsd;
      }
    }
  } catch {
    // Ignore cache parse errors
  }

  // Fetch live price from CoinGecko API
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd',
      { headers: { Accept: 'application/json' } }
    );
    if (response.ok) {
      const data = await response.json();
      const price = data?.stellar?.usd;
      if (typeof price === 'number' && price > 0) {
        savePriceCache(price);
        return price;
      }
    }
  } catch {
    // Ignore fetch errors, try fallback
  }

  return getCachedOrFallbackPrice();
}

function savePriceCache(priceUsd: number): void {
  try {
    const cache: PriceCache = { priceUsd, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

function getCachedOrFallbackPrice(): number {
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cache: PriceCache = JSON.parse(cachedRaw);
      return cache.priceUsd;
    }
  } catch {
    // Ignore
  }
  return FALLBACK_XLM_USD_PRICE;
}
