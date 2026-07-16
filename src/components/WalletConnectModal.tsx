import { useEffect, useState } from 'react';
import { X, Wallet, ArrowRight } from 'lucide-react';
import { isWalletInstalled } from '../services/soroban';
import type { WalletType, StellarNetwork } from '../services/soroban';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (type: WalletType) => Promise<void>;
  isConnecting: boolean;
  selectedNetwork: StellarNetwork;
}

const WALLET_OPTIONS: { type: WalletType; label: string; desc: string; icon: string }[] = [
  {
    type: 'freighter',
    label: 'Freighter',
    desc: 'Official Stellar browser extension wallet.',
    icon: 'account_balance_wallet',
  },
  {
    type: 'albedo',
    label: 'Albedo',
    desc: 'Browser-based wallet. Works on any device without installation.',
    icon: 'web',
  },
  {
    type: 'hana',
    label: 'Hana Wallet',
    desc: 'Multi-chain extension wallet with premium UI.',
    icon: 'account_balance',
  },
  {
    type: 'xbull',
    label: 'xBull Wallet',
    desc: 'Developer-focused wallet with powerful controls.',
    icon: 'terminal',
  },
];

export function WalletConnectModal({
  isOpen,
  onClose,
  onConnect,
  isConnecting,
}: WalletConnectModalProps) {
  const [installedMap, setInstalledMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      // Seed synchronously first so it renders instantly
      const initialMap: Record<string, boolean> = {};
      WALLET_OPTIONS.forEach((w) => {
        initialMap[w.type] = isWalletInstalled(w.type);
      });
      setInstalledMap(initialMap);

      // Refine asynchronously using the official check
      const checkInstallation = async () => {
        const map: Record<string, boolean> = { ...initialMap };
        try {
          const { isConnected } = await import('@stellar/freighter-api');
          const res = await isConnected();
          map.freighter = typeof res === 'boolean' ? res : !!(res as any)?.isConnected;
        } catch {
          // Fallback is already seeded in initialMap
        }
        setInstalledMap(map);
      };
      
      checkInstallation();
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-slate-800">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-primary dark:text-slate-100">
                Connect Wallet
              </h2>
              <p className="text-label-sm text-on-surface-variant dark:text-slate-400">
                Choose a wallet to connect to the platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wallet Options List */}
        <div className="mt-5 space-y-3">
          {WALLET_OPTIONS.map((wallet) => {
            const isInstalled = installedMap[wallet.type];
            return (
              <button
                key={wallet.type}
                onClick={() => {
                  onConnect(wallet.type);
                  onClose();
                }}
                disabled={isConnecting}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container-high hover:border-primary/45 transition-all text-left disabled:opacity-50 disabled:pointer-events-none group dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary group-hover:bg-primary/10 group-hover:text-primary transition-colors dark:bg-slate-900">
                    <span className="material-symbols-outlined text-primary group-hover:text-primary transition-colors" style={{ fontSize: '24px' }}>
                      {wallet.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-body-md font-bold text-primary dark:text-slate-100">
                        {wallet.label}
                      </span>
                      {isInstalled ? (
                        <span className="inline-flex items-center gap-1 rounded bg-success-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-success-green">
                          <span className="h-1.5 w-1.5 rounded-full bg-success-green" />
                          Installed
                        </span>
                      ) : (
                        wallet.type !== 'albedo' && (
                          <span className="rounded bg-outline-variant/30 px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant dark:text-slate-400">
                            Not Installed
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-body-xs text-on-surface-variant line-clamp-1 dark:text-slate-400 mt-0.5">
                      {wallet.desc}
                    </p>
                  </div>
                </div>

                <div className="text-outline group-hover:text-primary transition-colors pl-2">
                  <ArrowRight size={16} className="transform group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Help footer */}
        <div className="mt-5 text-center text-body-xs text-on-surface-variant dark:text-slate-400">
          New to Stellar?{' '}
          <a
            href="https://stellar.org/learn/wallets"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline"
          >
            Learn more about wallets
          </a>
        </div>
      </div>
    </div>
  );
}
