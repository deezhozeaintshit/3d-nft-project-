import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  create3DModelForPreset,
  createContactShadowTexture,
  type Generated3DModel,
  type ModelPartInfo,
} from './proceduralModels';

export interface ThreeViewerRef {
  captureScreenshot: () => string;
  exportGLB: () => Promise<Blob>;
  resetCamera: () => void;
  setExplodeFactor: (val: number) => void;
  setAutoRotate: (val: boolean) => void;
  setWireframe: (val: boolean) => void;
}

interface ThreeViewerProps {
  stylePreset: string;
  materialsConfig: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    roughness: number;
    metalness: number;
    emissiveIntensity: number;
  };
  explodeFactor: number;
  isAutoRotate: boolean;
  isWireframe: boolean;
  prompt?: string;
  seed?: number;
  modelUrl?: string;
  onPartSelected?: (partName: string | null) => void;
}

// Pre-allocated math objects to guarantee zero Garbage Collection in the render loop
const _vec3 = new THREE.Vector3();
const _targetPos = new THREE.Vector3();

export const ThreeViewer = forwardRef<ThreeViewerRef, ThreeViewerProps>(function ThreeViewer(
  {
    stylePreset,
    materialsConfig,
    explodeFactor,
    isAutoRotate,
    isWireframe,
    prompt = '',
    seed = 42,
    modelUrl,
    onPartSelected,
  },
  ref
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const activeModelRef = useRef<Generated3DModel | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const animFrameIdRef = useRef<number | null>(null);
  const explodeFactorRef = useRef<number>(explodeFactor);
  const isAutoRotateRef = useRef<boolean>(isAutoRotate);
  const isWireframeRef = useRef<boolean>(isWireframe);

  // Sync refs for animation frame loop
  explodeFactorRef.current = explodeFactor;
  isAutoRotateRef.current = isAutoRotate;
  isWireframeRef.current = isWireframe;

  // Imperative handle for parent HUD controls (screenshot, GLB export, camera reset)
  useImperativeHandle(ref, () => ({
    captureScreenshot: () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return '';
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      return rendererRef.current.domElement.toDataURL('image/png', 0.95);
    },
    exportGLB: async () => {
      return new Promise<Blob>((resolve, reject) => {
        if (!activeModelRef.current) {
          reject(new Error('No active 3D model in scene'));
          return;
        }
        const exporter = new GLTFExporter();
        exporter.parse(
          activeModelRef.current.rootGroup,
          (gltf) => {
            const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
            resolve(blob);
          },
          (err) => reject(err),
          { binary: true }
        );
      });
    },
    resetCamera: () => {
      if (!cameraRef.current || !controlsRef.current) return;
      cameraRef.current.position.set(0, 2.4, 5.2);
      controlsRef.current.target.set(0, 1.6, 0);
      controlsRef.current.update();
    },
    setExplodeFactor: (val: number) => {
      explodeFactorRef.current = val;
    },
    setAutoRotate: (val: boolean) => {
      isAutoRotateRef.current = val;
      if (controlsRef.current) controlsRef.current.autoRotate = val;
    },
    setWireframe: (val: boolean) => {
      isWireframeRef.current = val;
    },
  }));

  // Setup WebGL Scene, PBR Studio Lighting, and Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Studio Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.FogExp2(0x09090b, 0.045);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.4, 5.2);
    cameraRef.current = camera;

    // 3. Renderer with PBR Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 4. Studio Environment Lighting (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnvTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = roomEnvTexture;
    pmremGenerator.dispose();

    // 5. 3-Point Studio Rig (Warm Key Light, Cool Fill, Rim)
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.2);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x818cf8, 0x09090b, 0.9);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    // 6. Contact Shadow Plane at ground Y = 0
    const shadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowTexture = createContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const contactShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadowMesh.rotation.x = -Math.PI / 2;
    contactShadowMesh.position.y = 0.01;
    scene.add(contactShadowMesh);

    // Subtle Sci-Fi Floor Grid
    const gridHelper = new THREE.GridHelper(14, 28, 0x312e81, 0x18181b);
    gridHelper.position.y = 0.005;
    scene.add(gridHelper);

    // 7. Orbit Controls with Smooth Damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.08;
    controls.minDistance = 1.8;
    controls.maxDistance = 12.0;
    controls.target.set(0, 1.6, 0);
    controls.autoRotate = isAutoRotateRef.current;
    controls.autoRotateSpeed = 1.2;
    controlsRef.current = controls;

    // 8. Raycaster for Part Selection & Interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      if (activeModelRef.current) {
        const intersects = raycaster.intersectObjects(
          activeModelRef.current.rotatableGroup.children,
          true
        );
        if (intersects.length > 0) {
          const hitObj = intersects[0].object;
          const matchedPart = activeModelRef.current.parts.find(
            (p) => p.mesh === hitObj || (hitObj.parent && p.mesh === hitObj.parent)
          );
          if (matchedPart && onPartSelected) {
            onPartSelected(matchedPart.name);
          }
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 9. Resize Observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Loop (60 FPS with Damping and Dynamic Particle Rotation)
    let animationRunning = true;
    const animate = () => {
      if (!animationRunning) return;
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = clockRef.current.getDelta();
      const elapsedTime = clockRef.current.getElapsedTime();

      // Update Controls
      controls.autoRotate = isAutoRotateRef.current;
      controls.update();

      // Animate active 3D Model components
      if (activeModelRef.current) {
        const model = activeModelRef.current;

        // Rotate gyroscopic harmonic rings
        model.animatedRings.forEach((ring, idx) => {
          ring.rotation.z += delta * (idx % 2 === 0 ? 0.8 : -0.6);
        });

        // Gentle breathing pulse on Core Mesh
        if (model.coreMesh) {
          const pulse = 1.0 + Math.sin(elapsedTime * 3.5) * 0.08;
          model.coreMesh.scale.set(pulse, pulse, pulse);
        }

        // Exploded View Interpolation
        const factor = explodeFactorRef.current;
        model.parts.forEach((part) => {
          _targetPos.copy(part.originalPosition).addScaledVector(part.explodeDirection, factor);
          // Exponential damping for silky smooth motion
          part.mesh.position.lerp(_targetPos, 0.12);
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      animationRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Model Geometry and Materials when Preset, Config, or ModelUrl Changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let isCancelled = false;

    // Remove old model if present
    if (activeModelRef.current) {
      scene.remove(activeModelRef.current.rootGroup);
      activeModelRef.current.rootGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      activeModelRef.current = null;
    }

    const applyModel = (newModel: Generated3DModel) => {
      if (isCancelled) return;

      // Dynamic assemble / spawn pop-in animation
      newModel.rootGroup.scale.set(0.1, 0.1, 0.1);
      let scaleVal = 0.1;
      const animInterval = setInterval(() => {
        scaleVal += 0.12;
        if (scaleVal >= 1.0) {
          newModel.rootGroup.scale.set(1.0, 1.0, 1.0);
          clearInterval(animInterval);
        } else {
          newModel.rootGroup.scale.set(scaleVal, scaleVal, scaleVal);
        }
      }, 16);

      scene.add(newModel.rootGroup);
      activeModelRef.current = newModel;

      // Wireframe state application
      newModel.rootGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).wireframe !== undefined) {
            (mesh.material as THREE.MeshStandardMaterial).wireframe = isWireframe;
          }
        }
      });

      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.compile(scene, cameraRef.current);
      }
    };

    // Only load via GLTFLoader if a valid external HTTP(S) or IPFS GLB asset is provided
    const isExternalGlb = Boolean(
      modelUrl &&
      modelUrl.trim() !== '' &&
      !modelUrl.includes('/api/models/procedural') &&
      (modelUrl.startsWith('http://') || modelUrl.startsWith('https://') || modelUrl.startsWith('ipfs://'))
    );

    if (isExternalGlb && modelUrl) {
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          if (isCancelled) return;
          const rootGroup = new THREE.Group();
          rootGroup.name = 'GLTF_Root';
          const rotatableGroup = new THREE.Group();
          rootGroup.add(rotatableGroup);
          rotatableGroup.add(gltf.scene);

          // Center and scale GLB model to fit standard viewport
          const bbox = new THREE.Box3().setFromObject(gltf.scene);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            const scale = 2.4 / maxDim;
            gltf.scene.scale.set(scale, scale, scale);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            gltf.scene.position.sub(center.multiplyScalar(scale));
            gltf.scene.position.y += 1.8;
          }

          const parts: ModelPartInfo[] = [];
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              parts.push({
                mesh,
                name: mesh.name || 'Component Mesh',
                originalPosition: mesh.position.clone(),
                explodeDirection: new THREE.Vector3(
                  (Math.random() - 0.5) * 1.5,
                  Math.random() * 0.8,
                  (Math.random() - 0.5) * 1.5
                ),
                category: 'armor',
              });
            }
          });

          applyModel({
            rootGroup,
            parts,
            rotatableGroup,
            animatedRings: [],
            coreMesh: null,
            dimensions: { height: 3.2, width: 2.8 },
          });
        },
        undefined,
        (err) => {
          console.warn('[ThreeViewer] GLTFLoader failed to load modelUrl, using procedural fallback:', err);
          // Fall back to procedural generation
          const proceduralModel = create3DModelForPreset(
            stylePreset,
            {
              primary: materialsConfig.primaryColor,
              secondary: materialsConfig.secondaryColor,
              accent: materialsConfig.accentColor,
              roughness: materialsConfig.roughness,
              metalness: materialsConfig.metalness,
            },
            prompt,
            seed
          );
          applyModel(proceduralModel);
        }
      );
    } else {
      // Build new procedural model tailored to the prompt and seed
      const newModel = create3DModelForPreset(
        stylePreset,
        {
          primary: materialsConfig.primaryColor,
          secondary: materialsConfig.secondaryColor,
          accent: materialsConfig.accentColor,
          roughness: materialsConfig.roughness,
          metalness: materialsConfig.metalness,
        },
        prompt,
        seed
      );
      applyModel(newModel);
    }

    return () => {
      isCancelled = true;
    };
  }, [stylePreset, materialsConfig, isWireframe, prompt, seed, modelUrl]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing touch-none select-none z-0"
    />
  );
});
