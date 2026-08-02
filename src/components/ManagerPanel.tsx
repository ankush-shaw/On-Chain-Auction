import { FormEvent, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { CreateAuctionInput } from '../services/soroban';

interface ManagerPanelProps {
  walletAddress: string | null;
  contractReady: boolean;
  networkLabel: string;
  onConnect: () => void;
  onCreate: (input: CreateAuctionInput) => Promise<void>;
}

export function ManagerPanel({ walletAddress, contractReady, networkLabel, onConnect, onCreate }: ManagerPanelProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startingBidXlm, setStartingBidXlm] = useState('10');
  const [durationHours, setDurationHours] = useState(24);
  const [buyItNowPriceXlm, setBuyItNowPriceXlm] = useState('');
  const [reservePriceXlm, setReservePriceXlm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!walletAddress) {
      onConnect();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        sellerAddress: walletAddress,
        title,
        description,
        startingBidXlm,
        durationHours,
        buyItNowPriceXlm: buyItNowPriceXlm.trim() || undefined,
        reservePriceXlm: reservePriceXlm.trim() || undefined,
      });
      setTitle('');
      setDescription('');
      setStartingBidXlm('10');
      setDurationHours(24);
      setBuyItNowPriceXlm('');
      setReservePriceXlm('');
    } catch (e: any) {
      setError(e.message || 'Could not list this project.');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-body-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-700 dark:focus:ring-slate-800 placeholder:text-outline';

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block">
            <span className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Project title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={80}
              placeholder="e.g. Stellar Dex Integration"
              className={inputClass}
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              maxLength={360}
              placeholder="Describe the scope, deliverables, and repo link..."
              className={`${inputClass} resize-none`}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block">
              <span className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Starting Bid (XLM) *</span>
              <input
                value={startingBidXlm}
                onChange={(e) => setStartingBidXlm(e.target.value)}
                required
                inputMode="decimal"
                placeholder="10"
                className={inputClass}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Reserve Price (XLM)</span>
                <span className="text-[10px] font-medium text-on-surface-variant/70 uppercase tracking-wider">Optional</span>
              </div>
              <input
                value={reservePriceXlm}
                onChange={(e) => setReservePriceXlm(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 50"
                className={inputClass}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <span className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Duration (Hours) *</span>
              <input
                type="number"
                min={1}
                max={720}
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                required
                placeholder="24"
                className={inputClass}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">Buy It Now (XLM)</span>
                <span className="text-[10px] font-medium text-on-surface-variant/70 uppercase tracking-wider">Optional</span>
              </div>
              <input
                value={buyItNowPriceXlm}
                onChange={(e) => setBuyItNowPriceXlm(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 200"
                className={inputClass}
              />
            </label>
          </div>
        </div>

        {!contractReady && (
          <div className="rounded-lg border border-secondary-container/40 bg-secondary-container/10 px-3.5 py-2.5 text-body-sm text-on-secondary-container">
            <span className="font-bold">Notice:</span> Preview mode active. Configure the {networkLabel} contract to deploy on-chain.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-error-container border border-error/30 px-3.5 py-2.5 text-body-sm text-on-error-container">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full justify-center stable-button mt-2"
        >
          {busy ? <Loader2 className="animate-spin" size={16} /> : (
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          )}
          {!contractReady ? 'List in Preview Mode' : walletAddress ? 'Deploy On-Chain Listing' : 'Connect Wallet to List'}
        </button>
      </form>
    </div>
  );
}
