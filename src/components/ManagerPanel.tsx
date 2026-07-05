import { FormEvent, useState } from 'react';
import { Loader2, Plus, ShieldCheck } from 'lucide-react';
import type { CreateAuctionInput } from '../services/soroban';

interface ManagerPanelProps {
  walletAddress: string | null;
  contractReady: boolean;
  onConnect: () => void;
  onCreate: (input: CreateAuctionInput) => Promise<void>;
}

export function ManagerPanel({ walletAddress, contractReady, onConnect, onCreate }: ManagerPanelProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startingBidXlm, setStartingBidXlm] = useState('10');
  const [durationHours, setDurationHours] = useState(24);
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
      });
      setTitle('');
      setDescription('');
      setStartingBidXlm('10');
      setDurationHours(24);
    } catch (e: any) {
      setError(e.message || 'Could not list this project.');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'mt-2 w-full rounded-md border border-cream-300 bg-cream-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-cyan-400';

  return (
    <section className="rounded-lg border border-cream-300 bg-cream-50 p-5 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Manager Listing Console</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            List a project on-chain, set the opening bid, and let connected wallets compete.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={80}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={4}
            maxLength={360}
            className={`${inputClass} resize-none`}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Starting bid</span>
            <input
              value={startingBidXlm}
              onChange={(event) => setStartingBidXlm(event.target.value)}
              required
              inputMode="decimal"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duration hours</span>
            <input
              type="number"
              min={1}
              max={720}
              value={durationHours}
              onChange={(event) => setDurationHours(Number(event.target.value))}
              required
              className={inputClass}
            />
          </label>
        </div>

        {!contractReady && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            Deploy the auction contract and set `VITE_AUCTION_CONTRACT_ID` before listing projects on-chain.
          </p>
        )}

        {error && (
          <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy || !contractReady} className="btn-primary w-full justify-center stable-button">
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          {!contractReady ? 'Contract Not Configured' : walletAddress ? 'List Project' : 'Connect Wallet to List'}
        </button>
      </form>
    </section>
  );
}
