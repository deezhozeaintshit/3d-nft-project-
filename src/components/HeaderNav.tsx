import React from 'react';
import { Box, Layers, Wallet, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { SUPPORTED_CHAINS } from '../contracts/contractConfig';

interface HeaderNavProps {
  walletAddress: string | null;
  chainId: number;
  balance: string;
  isTestMode: boolean;
  onConnectWallet: () => void;
  onSwitchNetwork: (chainId: number) => void;
  onOpenGallery: () => void;
  onOpenR3FViewer?: () => void;
  mintedCount: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  walletAddress,
  chainId,
  balance,
  isTestMode,
  onConnectWallet,
  onSwitchNetwork,
  onOpenGallery,
  onOpenR3FViewer,
  mintedCount,
}) => {
  const currentChain = SUPPORTED_CHAINS.find((c) => c.id === chainId) || SUPPORTED_CHAINS[1];

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 md:px-8 border-b border-neutral-800/80 bg-neutral-950/90 text-neutral-100">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400">
          <Box className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
              PolyDimension
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Studio
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-neutral-400 hidden sm:block">
            Generative 3D NFT Pipeline • Agnes AI & Procedural PBR
          </p>
        </div>
      </div>

      {/* Network & Wallet Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* R3F Fiber Drei 3D Viewer Launcher */}
        {onOpenR3FViewer && (
          <button
            onClick={onOpenR3FViewer}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 border border-neutral-800 hover:border-cyan-500/40 hover:bg-neutral-850 transition-colors text-cyan-300"
            title="Inspect 3D GLB models using React Three Fiber & Drei"
          >
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">R3F Viewer</span>
          </button>
        )}

        {/* Gallery Button */}
        <button
          onClick={onOpenGallery}
          className="relative flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 transition-colors text-neutral-300"
          title="View Minted 3D NFTs"
        >
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Collection</span>
          {mintedCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-purple-600 text-white">
              {mintedCount}
            </span>
          )}
        </button>

        {/* Network Switcher Pill */}
        <div className="relative group">
          <button
            onClick={() => onSwitchNetwork(chainId === 137 ? 80002 : 137)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors text-neutral-300"
            title="Click to toggle between Polygon Mainnet and Amoy Testnet"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                currentChain.isTestnet ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span className="hidden md:inline">{currentChain.name}</span>
            <span className="md:hidden">{currentChain.isTestnet ? 'Amoy' : 'Polygon'}</span>
            <RefreshCw className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300 ml-0.5" />
          </button>
        </div>

        {/* Wallet Connection */}
        {walletAddress ? (
          <div className="flex items-center space-x-2 px-3 py-1.5 text-xs font-mono rounded-lg bg-neutral-900 border border-purple-500/30 text-purple-300">
            <span className="text-neutral-400 font-sans hidden md:inline">
              {balance} POL
            </span>
            <div className="w-px h-3 bg-neutral-800 hidden md:block" />
            <span className="font-semibold">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
            {isTestMode && (
              <span className="text-[9px] uppercase px-1 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                Testnet
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={onConnectWallet}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm transition-all"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Connect Wallet</span>
          </button>
        )}
      </div>
    </header>
  );
};
