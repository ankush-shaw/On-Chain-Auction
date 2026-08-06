import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, History, ExternalLink, ShieldCheck } from 'lucide-react';
import type { AuctionListing, BidRecord } from '../types';
import { formatStroops } from '../services/soroban';
import { useXlmPrice } from '../hooks/useXlmPrice';
import { generateDemoBidHistory } from '../utils/bidHistoryHelpers';

interface BidHistoryModalProps {
  isOpen: boolean;
  auction: AuctionListing | null;
  currentUserAddress: string | null;
  onClose: () => void;
}

export function BidHistoryModal({ isOpen, auction, currentUserAddress, onClose }: BidHistoryModalProps) {
  const [bids, setBids] = useState<BidRecord[]>([]);
  const { formatUsd } = useXlmPrice();

  useEffect(() => {
    if (auction && isOpen) {
      const history = generateDemoBidHistory(auction);
      setBids(history);
    } else {
      setBids([]);
    }
  }, [auction, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && auction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
          >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container/20 text-secondary">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-bold text-headline-sm text-primary dark:text-slate-100 line-clamp-1">
                Bid History & Leaderboard
              </h3>
              <p className="text-label-sm text-on-surface-variant dark:text-slate-400 truncate max-w-xs">
                {auction.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Summary Banner */}
        <div className="my-4 grid grid-cols-2 gap-3 bg-surface-container-low rounded-xl p-3.5 dark:bg-slate-950 border border-outline-variant/40 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant dark:text-slate-400">Total Bids</span>
            <p className="text-body-lg font-black text-primary dark:text-slate-100 mt-0.5">{bids.length} placed</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant dark:text-slate-400">Current Leader</span>
            <p className="text-body-md font-bold text-secondary dark:text-secondary-container mt-0.5 truncate">
              {auction.highestBidder ? `${auction.highestBidder.slice(0, 6)}…${auction.highestBidder.slice(-4)}` : 'No bids'}
            </p>
          </div>
        </div>

        {/* Bids Timeline List */}
        <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1">
          {bids.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant dark:text-slate-400">
              <History size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-body-sm font-semibold">No bids placed yet for this auction.</p>
            </div>
          ) : (
            bids.map((bid, index) => {
              const isTop = index === 0;
              const isCurrentUser = currentUserAddress && currentUserAddress.toLowerCase() === bid.bidder.toLowerCase();
              const formattedXlm = formatStroops(bid.amountStroops);
              const formattedUsd = formatUsd(formattedXlm);

              return (
                <div
                  key={bid.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isTop
                      ? 'bg-secondary-container/10 border-secondary-container/40 dark:bg-slate-800/80 dark:border-slate-700'
                      : isCurrentUser
                      ? 'bg-primary-container/10 border-primary/30 dark:bg-slate-800/40 dark:border-slate-800'
                      : 'bg-surface-container-low border-outline-variant/40 dark:bg-slate-950/60 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs ${
                      isTop
                        ? 'bg-secondary-container text-on-secondary-fixed'
                        : 'bg-surface-container text-on-surface-variant dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {isTop ? <Trophy size={14} /> : `#${index + 1}`}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-body-sm font-semibold text-primary dark:text-slate-200">
                          {bid.bidder.slice(0, 6)}…{bid.bidder.slice(-4)}
                        </span>
                        {isCurrentUser && (
                          <span className="rounded bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.2 dark:bg-slate-800 dark:text-slate-300">
                            You
                          </span>
                        )}
                        {bid.isBuyItNow && (
                          <span className="rounded bg-secondary-container/20 text-secondary text-[10px] font-bold px-1.5 py-0.2">
                            Buy Now
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-on-surface-variant opacity-70 dark:text-slate-400">
                        {new Date(bid.timestamp * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-body-md font-bold text-primary dark:text-slate-100">{formattedXlm} XLM</p>
                    <p className="text-[11px] font-medium text-on-surface-variant dark:text-slate-400">{formattedUsd}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-outline-variant dark:border-slate-800 flex justify-between items-center text-label-sm text-on-surface-variant dark:text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-success-green" /> Verifiable on Stellar Soroban
          </span>
          <button
            onClick={onClose}
            className="btn-ghost text-xs py-1.5 px-4"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}
