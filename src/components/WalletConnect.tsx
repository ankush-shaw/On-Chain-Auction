import { Loader2, Wallet, LogOut, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import type { WalletState } from '../types';

interface WalletConnectProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletConnect({ wallet, onConnect, onDisconnect }: WalletConnectProps) {
  const shortAddress = wallet.address
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : null;

  if (wallet.isConnected && wallet.address) {
    return (
      <div className="flex items-center gap-3">
        <div className="glass px-4 py-2 flex items-center gap-2 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-mono text-slate-300">{shortAddress}</span>
          <a
            href={`https://stellar.expert/explorer/testnet/account/${wallet.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300 transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        </div>
        <button
          onClick={onDisconnect}
          className="p-2 rounded-xl glass text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all"
          title="Disconnect"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onConnect}
      disabled={wallet.isConnecting}
      className="btn-primary"
    >
      {wallet.isConnecting ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Wallet size={18} />
      )}
      {wallet.isConnecting ? 'Connecting…' : 'Connect Wallet'}
    </motion.button>
  );
}
