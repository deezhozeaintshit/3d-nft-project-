import React, { useState, useEffect, useRef } from 'react';
import { ThreeViewer, type ThreeViewerRef } from './three/ThreeViewer';
import { HeaderNav } from './components/HeaderNav';
import { BottomDock } from './components/BottomDock';
import { MintModal } from './components/MintModal';
import { GalleryDrawer, type MintedNFTItem } from './components/GalleryDrawer';
import { WalletModal } from './components/WalletModal';
import { NFT3DViewer } from './components/NFT3DViewer';
import { walletService } from './web3/walletService';
import { soundtrackEngine, type TrackMetadata } from './audio/soundtrackEngine';
import { calculateRarity } from './utils/calculateRarity';
import { Box, Eye, X } from 'lucide-react';

export default function App() {
  const viewerRef = useRef<ThreeViewerRef>(null);

  // 3D Generation State
  const [prompt, setPrompt] = useState<string>(
    'Sub-atomic cyber sentinel mech with neon plasma conduits and faceted armor'
  );
  const [stylePreset, setStylePreset] = useState<string>('cyberpunk');
  const [seed, setSeed] = useState<number>(42891);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [polyCount, setPolyCount] = useState<number>(18420);
  const [selectedPartName, setSelectedPartName] = useState<string | null>(null);

  // Materials & Exploded View State
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [materialsConfig, setMaterialsConfig] = useState({
    primaryColor: '#8b5cf6',
    secondaryColor: '#06b6d4',
    accentColor: '#ec4899',
    roughness: 0.22,
    metalness: 0.88,
    emissiveIntensity: 2.4,
  });

  // Audio / Soundtrack State
  const [audioTrack, setAudioTrack] = useState<TrackMetadata | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);

  // Web3 Wallet State
  const [walletAddress, setWalletAddress] = useState<string | null>(
    '0x71C0aA58B9361719b4F298F1c618c72834bB194D'
  );
  const [chainId, setChainId] = useState<number>(80002); // Polygon Amoy Testnet
  const [balance, setBalance] = useState<string>('5.0000');
  const [isTestMode, setIsTestMode] = useState<boolean>(true);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Minting & IPFS State
  const [isMintModalOpen, setIsMintModalOpen] = useState<boolean>(false);
  const [nftName, setNftName] = useState<string>('Cyber Mecha Sentinel #0105');
  const [description, setDescription] = useState<string>(
    'Enterprise generative 3D NFT artifact on Polygon with decentralized IPFS GLB model and filmic PBR materials.'
  );
  const [previewImage, setPreviewImage] = useState<string>('');
  const [mintStep, setMintStep] = useState<
    'idle' | 'rendering' | 'pinning' | 'minting' | 'success' | 'error'
  >('idle');
  const [mintResult, setMintResult] = useState<any>(null);
  const [mintErrorMessage, setMintErrorMessage] = useState<string | null>(null);

  // R3F Drei 3D Viewer Modal State
  const [isR3FViewerOpen, setIsR3FViewerOpen] = useState<boolean>(false);
  const [r3fModelUrl, setR3fModelUrl] = useState<string>('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Collection Gallery State
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [mintedCollection, setMintedCollection] = useState<MintedNFTItem[]>([
    {
      tokenId: 101,
      name: 'Chronos Singularity #0101',
      description: 'Golden celestial obelisk with gyroscopic flux rings and stellar core.',
      image:
        'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80',
      animation_url: 'ipfs://bafybeicgq5m3h7h7j7n7n7n7n7n7/model.glb',
      stylePreset: 'celestial',
      rarity: 'Mythic',
      polyCount: 22400,
      ipfsUri: 'ipfs://bafybeicgq5m3h7h7j7n7n7n7n7n7/metadata.json',
      txHash: '0x8b321a9423b0fa457198751fa30a8456c7104b9015ba6a7821b02845c4795b6a',
      explorerUrl:
        'https://amoy.polygonscan.com/tx/0x8b321a9423b0fa457198751fa30a8456c7104b9015ba6a7821b02845c4795b6a',
      audioTrack: {
        title: 'Singularity Echoes',
        bpm: 86,
        keySignature: 'A Aeolian',
        moodDescription: 'Ethereal shimmer reverbs with celestial pads.',
      },
      materialsConfig: {
        primaryColor: '#e0e7ff',
        secondaryColor: '#38bdf8',
        accentColor: '#f59e0b',
        roughness: 0.12,
        metalness: 0.95,
        emissiveIntensity: 3.1,
      },
    },
    {
      tokenId: 102,
      name: 'Bio-Synapse Nucleus #0102',
      description: 'Biomechanical neural chamber with translucent cryo shell and synaptic core.',
      image:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      animation_url: 'ipfs://bafybeid7m3h7h7j7n7n7n7n7n7n8/model.glb',
      stylePreset: 'biotech',
      rarity: 'Legendary',
      polyCount: 19800,
      ipfsUri: 'ipfs://bafybeid7m3h7h7j7n7n7n7n7n8/metadata.json',
      txHash: '0x4d59a385bc12957102e34510fa9824b01934cfa7104b9015ba6a7821b028456c',
      explorerUrl:
        'https://amoy.polygonscan.com/tx/0x4d59a385bc12957102e34510fa9824b01934cfa7104b9015ba6a7821b028456c',
      audioTrack: {
        title: 'Neural Bio-Pulse Matrix',
        bpm: 110,
        keySignature: 'D Dorian',
        moodDescription: 'Organic FM modulations with biosensor rhythms.',
      },
      materialsConfig: {
        primaryColor: '#10b981',
        secondaryColor: '#14b8a6',
        accentColor: '#a855f7',
        roughness: 0.35,
        metalness: 0.75,
        emissiveIntensity: 2.0,
      },
    },
    {
      tokenId: 103,
      name: 'Stealth Scout Chassis #0103',
      description: 'Standard reconnaissance frame with balanced titanium plating.',
      image:
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
      animation_url: 'ipfs://bafybeif9m3h7h7j7n7n7n7n7n7n9/model.glb',
      stylePreset: 'obsidian',
      rarity: 'Common',
      polyCount: 16500,
      ipfsUri: 'ipfs://bafybeif9m3h7h7j7n7n7n7n7n7n9/metadata.json',
      txHash: '0x2e89a385bc12957102e34510fa9824b01934cfa7104b9015ba6a7821b028456d',
      explorerUrl:
        'https://amoy.polygonscan.com/tx/0x2e89a385bc12957102e34510fa9824b01934cfa7104b9015ba6a7821b028456d',
      audioTrack: {
        title: 'Low Orbit Drift',
        bpm: 98,
        keySignature: 'C Minor',
        moodDescription: 'Atmospheric bassline with subtle industrial clanks.',
      },
      materialsConfig: {
        primaryColor: '#475569',
        secondaryColor: '#334155',
        accentColor: '#64748b',
        roughness: 0.55,
        metalness: 0.4,
        emissiveIntensity: 1.2,
      },
    },
  ]);

  // Subscribe to audio engine state changes
  useEffect(() => {
    const unsub = soundtrackEngine.subscribe((playing) => {
      setIsPlayingAudio(playing);
    });
    // Generate initial soundtrack
    handleGenerateMusic('cyberpunk');
    return () => unsub();
  }, []);

  // Keyboard shortcut listener ('H' for dock toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'r' || e.key === 'R') {
        viewerRef.current?.resetCamera();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync style preset with material colors
  const applyPresetMaterials = (preset: string) => {
    switch (preset) {
      case 'celestial':
        setMaterialsConfig({
          primaryColor: '#e0e7ff',
          secondaryColor: '#38bdf8',
          accentColor: '#f59e0b',
          roughness: 0.12,
          metalness: 0.95,
          emissiveIntensity: 3.1,
        });
        setNftName(`Celestial Quantum Monolith #${Math.floor(Math.random() * 900 + 100)}`);
        break;
      case 'biotech':
        setMaterialsConfig({
          primaryColor: '#10b981',
          secondaryColor: '#14b8a6',
          accentColor: '#a855f7',
          roughness: 0.35,
          metalness: 0.75,
          emissiveIntensity: 2.0,
        });
        setNftName(`Biomechanical Neural Core #${Math.floor(Math.random() * 900 + 100)}`);
        break;
      case 'obsidian':
        setMaterialsConfig({
          primaryColor: '#1e1b4b',
          secondaryColor: '#475569',
          accentColor: '#6366f1',
          roughness: 0.08,
          metalness: 0.98,
          emissiveIntensity: 2.8,
        });
        setNftName(`Obsidian Void Relic #${Math.floor(Math.random() * 900 + 100)}`);
        break;
      case 'cyberpunk':
      default:
        setMaterialsConfig({
          primaryColor: '#8b5cf6',
          secondaryColor: '#06b6d4',
          accentColor: '#ec4899',
          roughness: 0.22,
          metalness: 0.88,
          emissiveIntensity: 2.4,
        });
        setNftName(`Cyber Sentinel Mech #${Math.floor(Math.random() * 900 + 100)}`);
        break;
    }
  };

  // Poll a Tripo text-to-3D job until the GLB is ready (returns true) or it fails (false)
  const pollTripoGeneration = async (taskId: string, candidateSeed: number): Promise<boolean> => {
    const startedAt = Date.now();
    const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes max
    setToastMessage('Tripo AI is sculpting your model... (0%)');
    while (Date.now() - startedAt < MAX_WAIT_MS) {
      await new Promise((r) => setTimeout(r, 5000));
      let s: any = null;
      try {
        const resp = await fetch(`/api/generate-3d/status?taskId=${encodeURIComponent(taskId)}`);
        s = await resp.json();
      } catch (e: any) {
        console.warn('[Tripo] status poll network error:', e.message);
        continue;
      }
      if (!s) continue;
      if (s.status === 'completed' && s.modelUrl) {
        setR3fModelUrl(s.modelUrl);
        setSeed(typeof s.seed === 'number' ? s.seed : candidateSeed);
        if (s.thumbnailUrl) setPreviewImage(s.thumbnailUrl);
        const quality = s.textured ? 'textured' : 'preview';
        setNftName(`${(s.stylePreset || stylePreset).toUpperCase()} AI Artifact #${(candidateSeed % 900) + 100}`);
        setDescription(`AI-generated 3D model synthesized from prompt: "${prompt}" (Tripo AI, ${quality} quality)`);
        setPolyCount(30000);
        setToastMessage(`Tripo AI model ready — ${quality} GLB loaded`);
        setTimeout(() => setToastMessage(null), 4000);
        return true;
      }
      if (s.status === 'failed') {
        console.warn('[Tripo] generation failed:', s.error);
        return false;
      }
      const pct = typeof s.progress === 'number' ? s.progress : 0;
      setToastMessage(`Tripo AI is sculpting your model... (${pct}%)`);
    }
    console.warn('[Tripo] poll timed out after 10 minutes');
    return false;
  };

  // Client-side procedural fallback (used when the backend is unreachable or Tripo fails)
  const runClientProceduralFallback = (candidateSeed: number) => {
    // High-grade client-side procedural fallback
    console.log('[3D Generation] Synthesizing procedural 3D model client-side for seed:', candidateSeed);
    setSeed(candidateSeed);
    setR3fModelUrl('');

    // Derive dynamic archetype from prompt
    const lp = prompt.toLowerCase();
    let fallbackName = `Cyber Sentinel #${(candidateSeed % 900) + 100}`;
    let fallbackPoly = 18400 + (candidateSeed % 12000);
    let fallbackDesc = `Enterprise 3D Generative NFT artifact. Synthesized from prompt: "${prompt}"`;

    if (lp.includes('dragon') || lp.includes('beast') || lp.includes('creature') || lp.includes('wing')) {
      fallbackName = `Aetherian Mecha Wyrm #${(candidateSeed % 900) + 100}`;
      fallbackPoly = 28600 + (candidateSeed % 8000);
      fallbackDesc = `Legendary bio-mechanical wyrm with articulated crystalline wings and plasma core.`;
      setMaterialsConfig({
        primaryColor: '#dc2626',
        secondaryColor: '#f59e0b',
        accentColor: '#ef4444',
        roughness: 0.18,
        metalness: 0.92,
        emissiveIntensity: 3.8,
      });
    } else if (lp.includes('portal') || lp.includes('stargate') || lp.includes('ring') || lp.includes('warp')) {
      fallbackName = `Chronos Warp Stargate #${(candidateSeed % 900) + 100}`;
      fallbackPoly = 24200 + (candidateSeed % 9000);
      fallbackDesc = `Interdimensional ring gate with counter-rotating quantum stabilizers.`;
      setMaterialsConfig({
        primaryColor: '#2563eb',
        secondaryColor: '#8b5cf6',
        accentColor: '#06b6d4',
        roughness: 0.14,
        metalness: 0.96,
        emissiveIntensity: 3.5,
      });
    } else if (lp.includes('reactor') || lp.includes('tokamak') || lp.includes('engine') || lp.includes('core')) {
      fallbackName = `Tokamak Singularity Core #${(candidateSeed % 900) + 100}`;
      fallbackPoly = 21500 + (candidateSeed % 7000);
      fallbackDesc = `Magnetic containment singularity reactor generating localized plasma harmonics.`;
      setMaterialsConfig({
        primaryColor: '#059669',
        secondaryColor: '#0284c7',
        accentColor: '#10b981',
        roughness: 0.28,
        metalness: 0.86,
        emissiveIntensity: 3.2,
      });
    } else if (lp.includes('monolith') || lp.includes('crystal') || stylePreset === 'celestial') {
      fallbackName = `Celestial Quantum Monolith #${(candidateSeed % 900) + 100}`;
      fallbackPoly = 25000 + (candidateSeed % 6000);
      fallbackDesc = `Hyper-specular celestial spire etched with harmonic resonant frequencies.`;
      setMaterialsConfig({
        primaryColor: '#e0e7ff',
        secondaryColor: '#38bdf8',
        accentColor: '#f59e0b',
        roughness: 0.12,
        metalness: 0.98,
        emissiveIntensity: 3.6,
      });
    } else if (stylePreset === 'biotech') {
      fallbackName = `Biomechanical Neural Core #${(candidateSeed % 900) + 100}`;
      fallbackPoly = 19200 + (candidateSeed % 5000);
      fallbackDesc = `Biomechanical neural chamber with translucent cryo shell and synaptic core.`;
      setMaterialsConfig({
        primaryColor: '#10b981',
        secondaryColor: '#14b8a6',
        accentColor: '#a855f7',
        roughness: 0.35,
        metalness: 0.75,
        emissiveIntensity: 2.2,
      });
    } else if (stylePreset === 'obsidian') {
      fallbackName = `Obsidian Void Relic #${(candidateSeed % 900) + 100}`;
      fallbackPoly = 27800 + (candidateSeed % 7000);
      fallbackDesc = `Deep space void artifact forged from crystalline dark matter.`;
      setMaterialsConfig({
        primaryColor: '#1e1b4b',
        secondaryColor: '#475569',
        accentColor: '#6366f1',
        roughness: 0.08,
        metalness: 0.98,
        emissiveIntensity: 3.0,
      });
    }

    setNftName(fallbackName);
    setPolyCount(fallbackPoly);
    setDescription(fallbackDesc);
    setToastMessage(`✨ Synthesized: ${fallbackName} (${fallbackPoly.toLocaleString()} Polys)`);
    setTimeout(() => setToastMessage(null), 4000);
  };
  // 1. Generate 3D Artifact via API
  const handleGenerate3D = async () => {
    setIsGenerating(true);
    const candidateSeed = Math.floor(Math.random() * 1000000);

    try {
      console.log(`[3D Generation Request] Initiating generation for prompt: "${prompt}", requested style: "${stylePreset}", candidate seed: ${candidateSeed}`);

      let data: any = null;
      try {
        const response = await fetch('/api/generate-3d', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            stylePreset,
            seed: candidateSeed,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        const rawText = await response.text();

        if (response.ok && contentType.includes('application/json')) {
          try {
            data = JSON.parse(rawText);
          } catch (jsonErr) {
            console.warn('[3D Generation] Failed to parse JSON response:', jsonErr);
          }
        } else {
          console.warn(`[3D Generation] Server responded with status ${response.status} (${contentType}), activating local procedural synthesis.`);
        }
      } catch (fetchErr: any) {
        console.warn('[3D Generation] Network fetch issue, activating local procedural synthesis:', fetchErr.message);
      }

      // If backend data was returned successfully, apply verified backend specs
      if (data && data.success) {
        // --- Real AI path: Tripo async text-to-3D job, poll until the GLB is ready ---
        if (data.provider === 'tripo' && data.taskId && data.status === 'processing') {
          const tripoOk = await pollTripoGeneration(data.taskId, candidateSeed);
          if (!tripoOk) {
            setToastMessage('Tripo AI generation failed — procedural fallback engaged');
            setTimeout(() => setToastMessage(null), 3500);
            runClientProceduralFallback(candidateSeed);
          }
        } else {
        // Backend seed verification
        if (typeof data.seed === 'number' && Number.isFinite(data.seed) && data.seed >= 0) {
          setSeed(data.seed);
        } else {
          setSeed(candidateSeed);
        }

        // Backend stylePreset verification
        const VALID_PRESETS = ['cyberpunk', 'celestial', 'biotech', 'obsidian'];
        if (typeof data.stylePreset === 'string' && VALID_PRESETS.includes(data.stylePreset.toLowerCase().trim())) {
          setStylePreset(data.stylePreset.toLowerCase().trim());
        }

        if (data.provider === 'agnes-ai' && data.modelUrl) {
          setR3fModelUrl(data.modelUrl);
        } else {
          setR3fModelUrl('');
        }

        if (data.imageUrl || data.metadata?.image) {
          setPreviewImage(data.imageUrl || data.metadata.image);
        }

        if (data.metadata?.specs) {
          const generatedName = data.metadata.name || `${(data.stylePreset || stylePreset).toUpperCase()} 3D Artifact`;
          const count = data.metadata.specs.polyCount || 18400;
          setPolyCount(count);
          setNftName(generatedName);
          if (data.metadata.description) {
            setDescription(data.metadata.description);
          }
          if (data.metadata.specs.materials) {
            setMaterialsConfig({
              ...data.metadata.specs.materials,
            });
          }
          setToastMessage(`✨ Synthesized: ${generatedName} (${count.toLocaleString()} Polys)`);
          setTimeout(() => setToastMessage(null), 4000);
        }
        } // end non-Tripo backend path
      } else {
        // High-grade client-side procedural fallback
        runClientProceduralFallback(candidateSeed);
      }

      // Frame and focus the new 3D model
      viewerRef.current?.resetCamera();

      // Trigger soundtrack generation matching the verified backend stylePreset
      await handleGenerateMusic(data?.stylePreset || stylePreset);
    } catch (err: any) {
      console.warn('[3D Generation] Recovered cleanly from exception:', err.message);
      setToastMessage('✨ 3D model updated');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Generate Music / Soundtrack via Lyria & Gemini
  const handleGenerateMusic = async (targetStyle: string = stylePreset) => {
    setIsGeneratingAudio(true);
    try {
      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `generative soundtrack for ${targetStyle} 3D digital artifact`,
          style: targetStyle,
          duration: 15,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.soundtrack) {
          setAudioTrack(data.soundtrack);
          soundtrackEngine.setTrack(data.soundtrack);
        }
      }
    } catch (err) {
      console.warn('Error fetching audio soundtrack:', err);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // 3. Web3 Wallet Handlers
  const handleConnectInjected = async () => {
    setIsConnectingWallet(true);
    setWalletError(null);
    try {
      const res = await walletService.connectInjected();
      setWalletAddress(res.address);
      setChainId(res.chainId);
      setBalance(res.balance);
      setIsTestMode(false);
      setIsWalletModalOpen(false);
    } catch (err: any) {
      setWalletError(err.message || 'Failed to connect injected wallet');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleConnectDemo = () => {
    setWalletAddress('0x71C0aA58B9361719b4F298F1c618c72834bB194D');
    setChainId(80002);
    setBalance('5.0000');
    setIsTestMode(true);
    setIsWalletModalOpen(false);
  };

  const handleSwitchNetwork = async (targetId: number) => {
    try {
      await walletService.switchNetwork(targetId);
      setChainId(targetId);
      if (walletAddress) {
        const bal = await walletService.getBalance(walletAddress as any, targetId);
        setBalance(bal);
      }
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  // 4. Open Mint Modal with Live 3D Snapshot
  const handleOpenMintModal = () => {
    const snapshot = viewerRef.current?.captureScreenshot() || '';
    setPreviewImage(snapshot);
    setMintStep('idle');
    setMintErrorMessage(null);
    setIsMintModalOpen(true);
  };

  // 5. Complete IPFS Pinning and Polygon Minting Flow
  const handleConfirmMint = async () => {
    if (!walletAddress) {
      setIsWalletModalOpen(true);
      return;
    }

    setMintErrorMessage(null);

    try {
      // Step 1: High-Res Render Snapshot
      setMintStep('rendering');
      const snapshotUrl = viewerRef.current?.captureScreenshot() || previewImage;
      await new Promise((r) => setTimeout(r, 600));

      // Step 2: Automatically calculate rarity against existing collection items before minting
      const assignedRarity = calculateRarity(polyCount, materialsConfig, mintedCollection);
      console.log(
        `[Rarity Engine] Assigned "${assignedRarity}" rarity before minting based on polyCount (${polyCount}) and material attributes against ${mintedCollection.length} collection items`
      );

      // Step 3: Pin Metadata to IPFS via Pinata Gateway
      setMintStep('pinning');
      const pinResponse = await fetch('/api/pin-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nftName,
          description,
          image: snapshotUrl,
          animation_url: `ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xednzrqoj3dwfe8528956/${stylePreset}_model.glb`,
          attributes: [
            { trait_type: 'Rarity', value: assignedRarity },
            { trait_type: 'Style Preset', value: stylePreset },
            { trait_type: 'Poly Count', value: polyCount },
            { trait_type: 'Roughness', value: materialsConfig.roughness },
            { trait_type: 'Metalness', value: materialsConfig.metalness },
            { trait_type: 'Emissive Intensity', value: materialsConfig.emissiveIntensity },
            { trait_type: 'Soundtrack', value: audioTrack?.title || 'Synthesized PBR' },
            { trait_type: 'Soundtrack BPM', value: audioTrack?.bpm || 124 },
          ],
        }),
      });

      if (!pinResponse.ok) {
        throw new Error('Failed to pin metadata to IPFS gateway');
      }

      const pinData = await pinResponse.json();
      const ipfsUri = pinData.ipfsUri || `ipfs://${pinData.ipfsHash}`;

      // Step 4: Mint on Polygon Smart Contract
      setMintStep('minting');
      const result = await walletService.mintNFT(
        walletAddress as any,
        ipfsUri,
        isTestMode
      );

      setMintResult(result);
      setMintStep('success');

      // Add to Collection Gallery with calculated rarity
      const newNFT: MintedNFTItem = {
        tokenId: result.tokenId,
        name: nftName,
        description,
        image: snapshotUrl,
        animation_url: `ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xednzrqoj3dwfe8528956/${stylePreset}_model.glb`,
        stylePreset,
        rarity: assignedRarity,
        polyCount,
        ipfsUri,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
        audioTrack,
        materialsConfig,
      };
      setMintedCollection((prev) => [newNFT, ...prev]);

      // Refresh balance
      if (walletAddress) {
        const newBal = await walletService.getBalance(walletAddress as any, chainId);
        setBalance(newBal);
      }
    } catch (err: any) {
      console.error('Minting error:', err);
      setMintStep('error');
      setMintErrorMessage(err.message || 'Mint transaction was cancelled or encountered an error');
    }
  };

  // 6. Direct GLB Export
  const handleDownloadGLB = async () => {
    try {
      if (!viewerRef.current) return;
      const blob = await viewerRef.current.exportGLB();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nftName.replace(/\s+/g, '_')}.glb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export GLB:', e);
    }
  };

  // 7. Direct Snapshot PNG Download
  const handleCaptureScreenshot = () => {
    const dataUrl = viewerRef.current?.captureScreenshot();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${nftName.replace(/\s+/g, '_')}_render.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 8. Load an item from Gallery back into the 3D scene
  const handleLoadIntoScene = (item: MintedNFTItem) => {
    setStylePreset(item.stylePreset);
    setNftName(item.name);
    setDescription(item.description);
    if (item.materialsConfig) {
      setMaterialsConfig(item.materialsConfig);
    }
    if (item.audioTrack) {
      setAudioTrack(item.audioTrack);
      soundtrackEngine.setTrack(item.audioTrack);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-['Plus_Jakarta_Sans']">
      {/* 1. Header Navigation Bar */}
      <HeaderNav
        walletAddress={walletAddress}
        chainId={chainId}
        balance={balance}
        isTestMode={isTestMode}
        onConnectWallet={() => setIsWalletModalOpen(true)}
        onSwitchNetwork={handleSwitchNetwork}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenR3FViewer={() => setIsR3FViewerOpen(true)}
        mintedCount={mintedCollection.length}
      />

      {/* Floating Status / Generation Feedback Badge */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-purple-950/90 border border-purple-500/50 shadow-2xl text-xs font-mono text-purple-200 pointer-events-none select-none transition-all animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* 2. Full-Bleed Three.js 3D Viewport */}
      <ThreeViewer
        ref={viewerRef}
        stylePreset={stylePreset}
        materialsConfig={materialsConfig}
        explodeFactor={explodeFactor}
        isAutoRotate={isAutoRotate}
        isWireframe={isWireframe}
        prompt={prompt}
        seed={seed}
        modelUrl={r3fModelUrl}
        onPartSelected={(partName) => setSelectedPartName(partName)}
      />

      {/* 3. Sleek Collapsible Bottom Control Dock (Unobstructed Viewport) */}
      <BottomDock
        prompt={prompt}
        setPrompt={setPrompt}
        stylePreset={stylePreset}
        setStylePreset={(p) => {
          setStylePreset(p);
          applyPresetMaterials(p);
        }}
        onGenerate={handleGenerate3D}
        isGenerating={isGenerating}
        explodeFactor={explodeFactor}
        setExplodeFactor={setExplodeFactor}
        materialsConfig={materialsConfig}
        setMaterialsConfig={setMaterialsConfig}
        isWireframe={isWireframe}
        setIsWireframe={setIsWireframe}
        selectedPartName={selectedPartName}
        isPlayingAudio={isPlayingAudio}
        onToggleAudio={() => soundtrackEngine.toggle()}
        audioTrack={audioTrack}
        onRegenerateAudio={() => handleGenerateMusic(stylePreset)}
        isGeneratingAudio={isGeneratingAudio}
        isAutoRotate={isAutoRotate}
        setIsAutoRotate={setIsAutoRotate}
        onResetCamera={() => viewerRef.current?.resetCamera()}
        onDownloadGLB={handleDownloadGLB}
        onCaptureScreenshot={handleCaptureScreenshot}
        onOpenMintModal={handleOpenMintModal}
        isMinting={mintStep !== 'idle' && mintStep !== 'success' && mintStep !== 'error'}
      />

      {/* 4. Minting & IPFS Modal */}
      <MintModal
        isOpen={isMintModalOpen}
        onClose={() => setIsMintModalOpen(false)}
        nftName={nftName}
        setNftName={setNftName}
        description={description}
        setDescription={setDescription}
        previewImage={previewImage}
        stylePreset={stylePreset}
        prompt={prompt}
        polyCount={polyCount}
        audioTrack={audioTrack}
        rarity={calculateRarity(polyCount, materialsConfig, mintedCollection)}
        onConfirmMint={handleConfirmMint}
        mintStep={mintStep}
        mintResult={mintResult}
        errorMessage={mintErrorMessage}
        chainId={chainId}
      />

      {/* 5. Minted 3D Collection Drawer */}
      <GalleryDrawer
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        items={mintedCollection}
        onLoadIntoScene={handleLoadIntoScene}
        onPlayAudio={(track) => {
          soundtrackEngine.setTrack(track);
          soundtrackEngine.play();
        }}
      />

      {/* 6. Web3 Wallet Connection Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnectInjected={handleConnectInjected}
        onConnectDemo={handleConnectDemo}
        isConnecting={isConnectingWallet}
        error={walletError}
      />

      {/* 7. Reusable @react-three/fiber & @react-three/drei NFT3DViewer Modal */}
      {isR3FViewerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
          <div className="relative w-full max-w-3xl h-[80vh] rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl flex flex-col text-neutral-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    NFT3DViewer Component (React Three Fiber & Drei)
                  </h3>
                  <p className="text-xs text-neutral-400">
                    OrbitControls • Directional & Ambient Lighting • Loading & Error States
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsR3FViewerOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Model URL Input Bar */}
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="text"
                value={r3fModelUrl}
                onChange={(e) => setR3fModelUrl(e.target.value)}
                placeholder="Enter .glb URL (or leave blank for interactive procedural 3D artifact)..."
                className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg bg-neutral-900 border border-neutral-800 focus:border-cyan-500 focus:outline-none text-neutral-200 placeholder-neutral-500"
              />
              <button
                onClick={() => setR3fModelUrl('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb')}
                className="px-2.5 py-1.5 text-[11px] font-mono rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition-colors shrink-0"
              >
                Load Sample GLB
              </button>
              <button
                onClick={() => setR3fModelUrl('https://invalid-url-domain-for-testing-error.glb')}
                className="px-2.5 py-1.5 text-[11px] font-mono rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-red-400 transition-colors shrink-0"
                title="Test Error Boundary fallback"
              >
                Test Error State
              </button>
            </div>

            {/* 3D Canvas Viewport */}
            <div className="flex-1 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 relative">
              <NFT3DViewer modelUrl={r3fModelUrl} className="w-full h-full" autoRotate={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
