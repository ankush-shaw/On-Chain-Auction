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

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-200">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Manager Listing Console</h2>
          <p className="mt-1 text-sm text-slate-400">
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
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
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
            className="mt-2 w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
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
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
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
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
            />
          </label>
        </div>

        {!contractReady && (
          <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            Deploy the auction contract and set `VITE_AUCTION_CONTRACT_ID` before listing projects on-chain.
          </p>
        )}

        {error && <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <button type="submit" disabled={busy || !contractReady} className="btn-primary w-full justify-center stable-button">
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          {!contractReady ? 'Contract Not Configured' : walletAddress ? 'List Project' : 'Connect Wallet to List'}
        </button>
      </form>
    </section>
  );
}
