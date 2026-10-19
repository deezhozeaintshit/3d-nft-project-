import React, { Suspense, Component, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useProgress, Html, Center } from '@react-three/drei';
import * as THREE from 'three';
import { Loader2, AlertTriangle, Box } from 'lucide-react';

export interface NFT3DViewerProps {
  modelUrl: string;
  className?: string;
  autoRotate?: boolean;
  onModelLoaded?: () => void;
}

/**
 * Loading indicator rendered inside the Three.js canvas via Drei's Html component
 */
function CanvasLoadingIndicator() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-200 shadow-xl min-w-[160px] select-none">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400 mb-2" />
        <span className="text-xs font-mono font-medium">Loading 3D Model</span>
        <span className="text-[11px] font-mono text-purple-400 mt-1">
          {progress ? `${Math.round(progress)}%` : 'Buffering...'}
        </span>
      </div>
    </Html>
  );
}

/**
 * Error boundary component to catch and gracefully display model loading failures
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackModelUrl: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'Error parsing .glb file' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('[NFT3DViewer] Failed to load .glb asset:', error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.fallbackModelUrl !== this.props.fallbackModelUrl) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-950/80 border border-red-500/30 text-red-200 shadow-xl max-w-xs text-center select-none">
            <AlertTriangle className="w-6 h-6 text-red-400 mb-2 shrink-0" />
            <span className="text-xs font-semibold">Unable to Load 3D Model</span>
            <span className="text-[10px] text-red-300/80 mt-1 font-mono break-all line-clamp-2">
              {this.state.errorMessage}
            </span>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

/**
 * Internal GLTF Model Mesh loader utilizing Drei's useGLTF hook
 */
function GLBModelMesh({ url, onLoad }: { url: string; onLoad?: () => void }) {
  // If no URL or local fallback requested, show fallback interactive geometry
  if (!url || url.trim() === '') {
    return <ProceduralArtifactMesh />;
  }

  // Resolve IPFS URIs to gateway URL
  const resolvedUrl = url.startsWith('ipfs://')
    ? `https://gateway.pinata.cloud/ipfs/${url.replace('ipfs://', '')}`
    : url;

  const gltf = useGLTF(resolvedUrl);

  React.useEffect(() => {
    if (onLoad) onLoad();
  }, [gltf, onLoad]);

  return (
    <Center>
      <primitive object={gltf.scene} castShadow receiveShadow />
    </Center>
  );
}

/**
 * Procedural PBR artifact fallback mesh rendered when modelUrl is an unresolved IPFS protocol or empty
 */
function ProceduralArtifactMesh() {
  return (
    <Center>
      <group>
        {/* Central Faceted Core */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <icosahedronGeometry args={[1.2, 1]} />
          <meshStandardMaterial
            color="#8b5cf6"
            metalness={0.9}
            roughness={0.15}
            emissive="#a855f7"
            emissiveIntensity={0.6}
          />
        </mesh>

        {/* Orbit Ring A */}
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[1.8, 0.06, 16, 64]} />
          <meshStandardMaterial
            color="#06b6d4"
            metalness={0.95}
            roughness={0.1}
            emissive="#06b6d4"
            emissiveIntensity={1.2}
          />
        </mesh>

        {/* Orbit Ring B */}
        <mesh rotation={[-Math.PI / 4, Math.PI / 3, 0]}>
          <torusGeometry args={[2.1, 0.04, 16, 64]} />
          <meshStandardMaterial
            color="#ec4899"
            metalness={0.92}
            roughness={0.15}
            emissive="#ec4899"
            emissiveIntensity={1.5}
          />
        </mesh>

        {/* Ground Pedestal */}
        <mesh position={[0, -1.5, 0]} receiveShadow>
          <cylinderGeometry args={[1.6, 1.8, 0.3, 32]} />
          <meshStandardMaterial color="#1e1b4b" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    </Center>
  );
}

/**
 * Reusable React 3D Model Viewer using @react-three/fiber & @react-three/drei
 */
export const NFT3DViewer: React.FC<NFT3DViewerProps> = ({
  modelUrl,
  className = 'w-full h-full min-h-[350px]',
  autoRotate = true,
  onModelLoaded,
}) => {
  return (
    <div className={`relative bg-neutral-950 overflow-hidden ${className}`}>
      <Canvas
        shadows
        camera={{ position: [0, 1.8, 5.0], fov: 45 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-4, 3, -4]} intensity={0.9} color="#38bdf8" />

        {/* Orbit Controls with Damping */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1.5}
          maxDistance={12.0}
          autoRotate={autoRotate}
          autoRotateSpeed={1.5}
          maxPolarAngle={Math.PI / 2 + 0.05}
        />

        {/* Dynamic Model Import with Error Boundary and Suspense */}
        <ModelErrorBoundary fallbackModelUrl={modelUrl}>
          <Suspense fallback={<CanvasLoadingIndicator />}>
            <GLBModelMesh url={modelUrl} onLoad={onModelLoaded} />
          </Suspense>
        </ModelErrorBoundary>
      </Canvas>
    </div>
  );
};

export default NFT3DViewer;
