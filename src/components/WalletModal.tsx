import React from 'react';
import { X, Wallet, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectInjected: () => Promise<void>;
  onConnectDemo: () => void;
  isConnecting: boolean;
  error: string | null;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  onConnectInjected,
  onConnectDemo,
  isConnecting,
  error,
}) => {
  if (!isOpen) return null;

  const hasInjected = typeof window !== 'undefined' && Boolean((window as any).ethereum);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl text-neutral-100">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Connect Web3 Wallet</h3>
              <p className="text-xs text-neutral-400">Polygon Mainnet & Polygon Amoy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Browser Injected Wallet (MetaMask, Rabby, Coinbase) */}
          <button
            onClick={onConnectInjected}
            disabled={isConnecting}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:border-purple-500/40 hover:bg-neutral-850 transition-all text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-xs">
                🦊
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  Injected Browser Wallet
                </span>
                <span className="text-[11px] text-neutral-400">
                  {hasInjected
                    ? 'MetaMask, Rabby, Coinbase Wallet detected'
                    : 'MetaMask / EIP-1193 Provider'}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-purple-400 font-medium">Connect</span>
          </button>

          {/* Instant Testnet Demo Wallet */}
          <button
            onClick={() => {
              onConnectDemo();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:border-purple-500/40 hover:bg-neutral-850 transition-all text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  Polygon Amoy Testnet Wallet
                </span>
                <span className="text-[11px] text-neutral-400">
                  Pre-funded with 5.0 POL for risk-free gas testing
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-medium">Free Demo</span>
          </button>
        </div>

        <div className="pt-3 border-t border-neutral-900 text-[11px] text-neutral-500 flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
          <span>Non-custodial cryptographic signing via Viem & EIP-1193</span>
        </div>
      </div>
    </div>
  );
};
