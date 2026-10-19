import React, { useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { type Address } from 'viem';
import {
  X,
  RefreshCw,
  FilePlus2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Link2,
} from 'lucide-react';
import {
  GENERATIVE_3D_NFT_ABI,
  getContractAddress,
  isV2Deployed,
  SUPPORTED_CHAINS,
} from '../contracts/contractConfig';

interface TokenFile {
  uri: string;
  fileType: string;
  name: string;
}

interface NFTManagerProps {
  tokenId: number;
  onClose: () => void;
}

/**
 * Manage an already-minted NFT on the V2 contract:
 *  - view / update its metadata URI (updatable NFT)
 *  - list, add, and remove additional files in the per-token file registry
 */
export const NFTManager: React.FC<NFTManagerProps> = ({ tokenId, onClose }) => {
  const { address, isConnected, chainId } = useAccount();
  const activeChainId = chainId === 137 ? 137 : 80002;
  const contractAddress = getContractAddress(activeChainId);
  const v2 = isV2Deployed(activeChainId);
  const activeChain = SUPPORTED_CHAINS.find((c) => c.id === activeChainId) || SUPPORTED_CHAINS[1];

  const [newUri, setNewUri] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [fileType, setFileType] = useState('model/gltf-binary');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // Current metadata URI
  const { data: currentUri, refetch: refetchUri } = useReadContract({
    address: contractAddress,
    abi: GENERATIVE_3D_NFT_ABI,
    functionName: 'tokenURI',
    args: [BigInt(tokenId)],
  });

  // Additional files registry
  const { data: filesData, refetch: refetchFiles } = useReadContract({
    address: contractAddress,
    abi: GENERATIVE_3D_NFT_ABI,
    functionName: 'getTokenFiles',
    args: [BigInt(tokenId)],
    query: { enabled: v2 },
  });
  const files: TokenFile[] = (filesData as TokenFile[] | undefined) ?? [];

  const runTx = async (label: string, tx: () => Promise<Address>) => {
    setError(null);
    setOkMsg(null);
    if (!isConnected || !address) {
      setError('Connect a wallet first.');
      return;
    }
    try {
      const hash = await tx();
      setOkMsg(`${label} submitted: ${hash.slice(0, 10)}...`);
      setTimeout(() => {
        refetchUri();
        refetchFiles();
      }, 4000);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || `${label} failed`);
    }
  };

  const handleUpdateUri = () =>
    runTx('Metadata URI update', () =>
      writeContractAsync({
        address: contractAddress,
        abi: GENERATIVE_3D_NFT_ABI,
        functionName: 'updateTokenURI',
        args: [BigInt(tokenId), newUri.trim()],
      }).then((h) => {
        setNewUri('');
        return h;
      })
    );

  const handleAddFile = () =>
    runTx('File attach', () =>
      writeContractAsync({
        address: contractAddress,
        abi: GENERATIVE_3D_NFT_ABI,
        functionName: 'addTokenFile',
        args: [BigInt(tokenId), fileUri.trim(), fileType.trim(), fileName.trim() || 'Additional file'],
      }).then((h) => {
        setFileUri('');
        setFileName('');
        return h;
      })
    );

  const handleRemoveFile = (index: number) =>
    runTx('File removal', () =>
      writeContractAsync({
        address: contractAddress,
        abi: GENERATIVE_3D_NFT_ABI,
        functionName: 'removeTokenFile',
        args: [BigInt(tokenId), BigInt(index)],
      })
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-neutral-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
          <div>
            <h3 className="text-sm font-bold text-white">Manage NFT #{tokenId}</h3>
            <p className="text-[11px] text-neutral-400">
              {activeChain.name} · {v2 ? 'V2 updatable contract' : 'V1 contract — deploy V2 to manage'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!v2 && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            The V2 updatable contract is not deployed on this chain yet. Deploy
            contracts/Generative3DNFTv2.sol and set its address in
            CONTRACT_ADDRESSES_V2 (see contracts/DEPLOY.md).
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {okMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {okMsg}
          </div>
        )}

        {/* Metadata URI */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-neutral-300 mb-2 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Metadata URI (updatable)
          </h4>
          <p className="text-[11px] text-neutral-500 break-all mb-2">
            Current: {typeof currentUri === 'string' ? currentUri : '—'}
          </p>
          <div className="flex gap-2">
            <input
              value={newUri}
              onChange={(e) => setNewUri(e.target.value)}
              placeholder="ipfs://<new-cid>/metadata.json"
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleUpdateUri}
              disabled={!v2 || !newUri.trim() || isWritePending}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5"
            >
              {isWritePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Update
            </button>
          </div>
        </div>

        {/* Additional files */}
        <div>
          <h4 className="text-xs font-bold text-neutral-300 mb-2 flex items-center gap-1.5">
            <FilePlus2 className="w-3.5 h-3.5" /> Additional files ({files.length})
          </h4>
          <div className="space-y-2 mb-4">
            {files.length === 0 && (
              <p className="text-[11px] text-neutral-500">No additional files attached yet.</p>
            )}
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <Link2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{f.name}</p>
                  <p className="text-[10px] text-neutral-500 truncate">
                    {f.fileType} · {f.uri}
                  </p>
                </div>
                <a
                  href={f.uri.startsWith('ipfs://') ? f.uri.replace('ipfs://', 'https://ipfs.io/ipfs/') : f.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-neutral-400 hover:text-white"
                  title="Open file"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleRemoveFile(i)}
                  disabled={!v2 || isWritePending}
                  className="p-1.5 text-neutral-500 hover:text-red-400 disabled:opacity-40"
                  title="Remove file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="space-y-2 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="File label (e.g. 4K PBR texture pack)"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500"
            />
            <input
              value={fileUri}
              onChange={(e) => setFileUri(e.target.value)}
              placeholder="ipfs://<cid>/file.glb or https://..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-2">
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="model/gltf-binary">model/gltf-binary (.glb)</option>
                <option value="image/png">image/png</option>
                <option value="image/jpeg">image/jpeg</option>
                <option value="audio/wav">audio/wav</option>
                <option value="audio/mpeg">audio/mpeg</option>
                <option value="application/zip">application/zip</option>
                <option value="application/json">application/json</option>
              </select>
              <button
                onClick={handleAddFile}
                disabled={!v2 || !fileUri.trim() || isWritePending}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5"
              >
                {isWritePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus2 className="w-3.5 h-3.5" />}
                Add file
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
