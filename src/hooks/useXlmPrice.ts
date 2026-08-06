import { useEffect, useState } from 'react';
import { fetchXlmPriceUsd } from '../services/xlmPrice';

const DEFAULT_PRICE = 0.125;

export function useXlmPrice() {
  const [priceUsd, setPriceUsd] = useState<number>(DEFAULT_PRICE);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshPrice = async () => {
    setLoading(true);
    try {
      const price = await fetchXlmPriceUsd();
      setPriceUsd(price);
    } catch {
      // Keep existing price
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPrice();
    // Refresh price every 2 minutes
    const interval = setInterval(refreshPrice, 120_000);
    return () => clearInterval(interval);
  }, []);

  const formatUsd = (xlmAmount: string | number | bigint | null | undefined): string => {
    if (!xlmAmount) return '$0.00';
    try {
      const numericXlm = typeof xlmAmount === 'number' ? xlmAmount : parseFloat(String(xlmAmount));
      if (isNaN(numericXlm)) return '$0.00';
      const usdValue = numericXlm * priceUsd;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(usdValue);
    } catch {
      return '$0.00';
    }
  };

  return { priceUsd, loading, refreshPrice, formatUsd };
}
