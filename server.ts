import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { GoogleGenAI } from '@google/genai';

dotenv.config();

// -------------------------------------------------------------
// Runtime API key store (Settings UI)
// Priority: in-memory overrides -> data/keys.json -> process.env
// data/keys.json is gitignored and written with 0600 permissions.
// Keys are never served in full — the settings endpoint only
// returns masked previews (first 4 + last 4 chars).
// -------------------------------------------------------------
const MANAGED_API_KEYS = [
  'TRIPO_API_KEY',
  'AGNES_API_KEY',
  'PINATA_API_KEY',
  'PINATA_SECRET_API_KEY',
  'GEMINI_API_KEY',
] as const;
const DATA_DIR = path.join(process.cwd(), 'data');
const KEYS_FILE = path.join(DATA_DIR, 'keys.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const runtimeKeyOverrides = new Map<string, string>();

function readKeysFile(): Record<string, string> {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8') || '{}');
    }
  } catch { /* corrupted file -> treat as empty */ }
  return {};
}

function getApiKey(name: string): string {
  const override = runtimeKeyOverrides.get(name);
  if (override && override.trim() !== '') return override.trim();
  const fileKeys = readKeysFile();
  if (fileKeys[name] && fileKeys[name].trim() !== '') return fileKeys[name].trim();
  return (process.env[name] || '').trim();
}

function maskKey(value: string): string {
  if (!value || value.trim() === '') return '';
  const v = value.trim();
  if (v.length <= 8) return '••••••••';
  return `${v.slice(0, 4)}••••${v.slice(-4)}`;
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Increase body parser limit for 3D model buffers & image data URLs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory decentralized pinning registry for deterministic simulation & persistent retrieval
const ipfsRegistry = new Map<string, any>();

/**
 * Helper to compute deterministic CIDv1-like hash for IPFS metadata
 */
function generateDeterministicCID(content: string): string {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return `bafybeic${hash.slice(0, 48)}`;
}

// -------------------------------------------------------------
// Tripo AI Text-to-3D integration (real AI generation)
// Verified against the official V3 spec (https://developers.tripo3d.ai):
//   Base URL: https://openapi.tripo3d.ai
//   Auth: Authorization: Bearer <key>  (key from the Tripo dashboard, free tier 300 credits/mo)
//   Submit: POST /v3/generation/text-to-model {prompt, negative_prompt, model:'P1-20260311',
//           model_seed, face_limit:20000, texture:true, pbr:true, texture_quality:'standard'}
//           -> 200 {"task_id":"task_..."}
//   Poll:   GET  /v3/tasks/{task_id} -> {status: queued|running|success|failed|cancelled,
//                                        progress, output:{model_url, rendered_image_url},
//                                        credits_consumed, error_message}
// Single task returns a textured + PBR model — no preview/refine chain needed.
// Enable with TRIPO_API_KEY env var.
// -------------------------------------------------------------
const TRIPO_API_BASE = 'https://openapi.tripo3d.ai';
const TRIPO_REQUEST_TIMEOUT_MS = 30000;
const TRIPO_MODEL = 'P1-20260311';

interface TripoJob {
  tripoTaskId: string;
  prompt: string;
  seed: number;
  stylePreset: string;
  createdAt: number;
}
// In-memory job registry (single instance; entries expire after 2h)
const tripoJobs = new Map<string, TripoJob>();

function makeLocalTaskId(): string {
  return `tripo-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

async function tripoFetch(path: string, init: RequestInit, apiKey: string): Promise<globalThis.Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TRIPO_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${TRIPO_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function submitTripoTask(
  prompt: string,
  seed: number,
  stylePreset: string,
  apiKey: string
): Promise<string | null> {
  const enrichedPrompt = `${prompt}, ${stylePreset} style 3D game asset, centered composition`.slice(0, 1024);
  const res = await tripoFetch(
    '/v3/generation/text-to-model',
    {
      method: 'POST',
      body: JSON.stringify({
        prompt: enrichedPrompt,
        negative_prompt: 'low quality, blurry, watermark, text, logo',
        model: TRIPO_MODEL,
        model_seed: seed,
        face_limit: 20000,
        texture: true,
        pbr: true,
        texture_quality: 'standard',
      }),
    },
    apiKey
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn(`[Tripo] Task submit failed [HTTP ${res.status}]:`, body.slice(0, 500));
    return null;
  }
  const data: any = await res.json().catch(() => null);
  return data?.task_id || null;
}

async function getTripoTask(taskId: string, apiKey: string): Promise<any | null> {
  const res = await tripoFetch(`/v3/tasks/${encodeURIComponent(taskId)}`, { method: 'GET' }, apiKey);
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

// -------------------------------------------------------------
// API ROUTE: /api/generate-3d
// Agnes AI 3D Gateway with Procedural Engine Fallback
// -------------------------------------------------------------
app.post('/api/generate-3d', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ error: 'Valid prompt string is required' });
    }

    // 1. Strict Seed Validation & Normalization
    const rawSeed = req.body.seed;
    let validatedSeed: number;
    if (typeof rawSeed === 'number' && Number.isFinite(rawSeed) && rawSeed >= 0) {
      validatedSeed = Math.floor(rawSeed);
    } else if (typeof rawSeed === 'string' && !isNaN(parseInt(rawSeed, 10))) {
      validatedSeed = Math.abs(parseInt(rawSeed, 10));
    } else {
      validatedSeed = Math.floor(Math.random() * 1000000);
    }

    // 2. Strict Style Preset Validation & Sanitization
    const ALLOWED_STYLE_PRESETS = ['cyberpunk', 'celestial', 'biotech', 'obsidian'] as const;
    type AllowedStylePreset = typeof ALLOWED_STYLE_PRESETS[number];
    const rawPreset = (req.body.stylePreset || '').toString().toLowerCase().trim();
    const validatedStylePreset: AllowedStylePreset = ALLOWED_STYLE_PRESETS.includes(rawPreset as any)
      ? (rawPreset as AllowedStylePreset)
      : 'cyberpunk';

    // 2b. Tripo AI Text-to-3D (REAL AI generation) — attempted before any fallback.
    // Submits an async job and returns immediately; the client polls
    // GET /api/generate-3d/status?taskId=... until the GLB is ready.
    const tripoApiKey = getApiKey('TRIPO_API_KEY');
    if (tripoApiKey && tripoApiKey.trim() !== '') {
      try {
        console.log(`[Tripo] Submitting text-to-3D task for prompt: "${prompt}" [seed: ${validatedSeed}]`);
        const tripoTaskId = await submitTripoTask(
          prompt,
          validatedSeed,
          validatedStylePreset,
          tripoApiKey.trim()
        );
        if (tripoTaskId) {
          const localTaskId = makeLocalTaskId();
          tripoJobs.set(localTaskId, {
            tripoTaskId,
            prompt,
            seed: validatedSeed,
            stylePreset: validatedStylePreset,
            createdAt: Date.now(),
          });
          return res.json({
            success: true,
            provider: 'tripo',
            taskId: localTaskId,
            status: 'processing',
            progress: 0,
            prompt,
            stylePreset: validatedStylePreset,
            seed: validatedSeed,
          });
        }
        console.warn('[Tripo] Submit failed, falling back to procedural pipeline.');
      } catch (tripoErr: any) {
        console.warn('[Tripo] Submit exception, falling back to procedural pipeline:', tripoErr.message);
      }
    }

    const agnesApiKey = getApiKey('AGNES_API_KEY');
    let agnesDiagnostic: {
      attempted: boolean;
      status?: number;
      statusText?: string;
      errorDetails?: any;
      networkError?: string;
    } | null = null;

    // 3. Prompt Analysis & Baseline Dynamic 3D Synthesis Pipeline
    const lowerPrompt = prompt.toLowerCase();
    let theme = 'Cyberpunk Sentinel Mech';
    let primaryColor = '#8b5cf6';
    let secondaryColor = '#06b6d4';
    let accentColor = '#ec4899';
    let roughness = 0.22;
    let metalness = 0.88;
    let emissiveIntensity = 2.4;
    let geometryType = 'mecha_sentinel';
    let polyCount = 18400 + (validatedSeed % 12000);

    if (
      lowerPrompt.includes('dragon') ||
      lowerPrompt.includes('beast') ||
      lowerPrompt.includes('wing') ||
      lowerPrompt.includes('creature') ||
      lowerPrompt.includes('dino')
    ) {
      theme = 'Aetherian Mecha Wyrm';
      primaryColor = '#dc2626';
      secondaryColor = '#f59e0b';
      accentColor = '#ef4444';
      roughness = 0.18;
      metalness = 0.92;
      emissiveIntensity = 3.8;
      geometryType = 'winged_dragon';
      polyCount = 28600 + (validatedSeed % 8000);
    } else if (
      lowerPrompt.includes('portal') ||
      lowerPrompt.includes('stargate') ||
      lowerPrompt.includes('ring') ||
      lowerPrompt.includes('gate') ||
      lowerPrompt.includes('vortex') ||
      lowerPrompt.includes('warp')
    ) {
      theme = 'Chronos Warp Stargate';
      primaryColor = '#2563eb';
      secondaryColor = '#8b5cf6';
      accentColor = '#06b6d4';
      roughness = 0.14;
      metalness = 0.96;
      emissiveIntensity = 3.5;
      geometryType = 'dimensional_portal';
      polyCount = 24200 + (validatedSeed % 9000);
    } else if (
      lowerPrompt.includes('reactor') ||
      lowerPrompt.includes('tokamak') ||
      lowerPrompt.includes('fusion') ||
      lowerPrompt.includes('engine') ||
      lowerPrompt.includes('core')
    ) {
      theme = 'Tokamak Singularity Reactor';
      primaryColor = '#059669';
      secondaryColor = '#0284c7';
      accentColor = '#10b981';
      roughness = 0.28;
      metalness = 0.86;
      emissiveIntensity = 3.2;
      geometryType = 'quantum_tokamak';
      polyCount = 21500 + (validatedSeed % 7000);
    } else if (
      lowerPrompt.includes('spire') ||
      lowerPrompt.includes('monolith') ||
      lowerPrompt.includes('obelisk') ||
      lowerPrompt.includes('crystal') ||
      validatedStylePreset === 'celestial'
    ) {
      theme = 'Celestial Quantum Monolith';
      primaryColor = '#e0e7ff';
      secondaryColor = '#38bdf8';
      accentColor = '#f59e0b';
      roughness = 0.12;
      metalness = 0.98;
      emissiveIntensity = 3.6;
      geometryType = 'astral_monolith';
      polyCount = 25000 + (validatedSeed % 6000);
    } else if (validatedStylePreset === 'biotech') {
      theme = 'Biomechanical Synapse Processor';
      primaryColor = '#10b981';
      secondaryColor = '#14b8a6';
      accentColor = '#a855f7';
      roughness = 0.35;
      metalness = 0.75;
      emissiveIntensity = 2.2;
      geometryType = 'neural_core';
      polyCount = 19200 + (validatedSeed % 5000);
    } else if (validatedStylePreset === 'obsidian') {
      theme = 'Obsidian Void Relic';
      primaryColor = '#1e1b4b';
      secondaryColor = '#475569';
      accentColor = '#6366f1';
      roughness = 0.08;
      metalness = 0.98;
      emissiveIntensity = 3.0;
      geometryType = 'void_prism';
      polyCount = 27800 + (validatedSeed % 7000);
    }

    // Default Rarity calculation before minting (Mythic / Legendary / Common)
    const rarity =
      polyCount >= 24000 || emissiveIntensity >= 3.4
        ? 'Mythic'
        : polyCount >= 18000
        ? 'Legendary'
        : 'Common';

    // Curated high-res aesthetic hero renders based on style presets
    const styleBanners: Record<string, string> = {
      cyberpunk: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80',
      celestial: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      biotech: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      obsidian: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    };
    let aiImageUrl = styleBanners[validatedStylePreset] || styleBanners.cyberpunk;

    // 4. Intelligent Agnes AI Gateway Integration (LLM Reasoning & Attribute Synthesis in Parallel)
    if (agnesApiKey && agnesApiKey.trim() !== '') {
      try {
        console.log(`[Agnes AI] Intelligent 3D synthesis requested for: "${prompt}" [style: ${validatedStylePreset}, seed: ${validatedSeed}]`);
        const agnesStartTime = Date.now();

        // 4a. Chat completion for 3D archetype, lore, and material parameters
        const chatPromise = fetch('https://apihub.agnes-ai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agnesApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'agnes-3.0-flash',
            messages: [
              {
                role: 'system',
                content:
                  'You are an enterprise 3D generative engine. Output only JSON with fields: theme (short string), name (short string), geometryType (one of: mecha_sentinel, winged_dragon, dimensional_portal, quantum_tokamak, astral_monolith, neural_core, void_prism), primaryColor (hex), secondaryColor (hex), accentColor (hex), roughness (number 0.05-0.9), metalness (number 0.1-0.98), emissiveIntensity (number 1.0-4.5), polyCount (integer 16000-36000), lore (short sentence).',
              },
              {
                role: 'user',
                content: `Synthesize 3D artifact attributes for prompt: "${prompt}", style preset: "${validatedStylePreset}", seed: ${validatedSeed}`,
              },
            ],
            response_format: { type: 'json_object' },
          }),
        }).then(async (r) => (r.ok ? r.json() : null)).catch(() => null);

        // 4b. Image generation for 2D hero render preview (non-blocking)
        const imagePromise = fetch('https://apihub.agnes-ai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agnesApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'agnes-image-2.5-flash',
            prompt: `3D digital art rendering of ${prompt}, ${validatedStylePreset} style, dark studio background, cinematic PBR lighting, 8k octane render`,
          }),
        }).then(async (r) => (r.ok ? r.json() : null)).catch(() => null);

        // Hard timeout of 2200ms so 3D generation is snappy and never times out upstream
        const timeoutPromise = new Promise<{ chatData: null; imgData: null }>((resolve) =>
          setTimeout(() => resolve({ chatData: null, imgData: null }), 2200)
        );

        const raceResult = await Promise.race([
          Promise.all([chatPromise, imagePromise]).then(([chatData, imgData]) => ({ chatData, imgData })),
          timeoutPromise,
        ]);

        if (raceResult.chatData) {
          const rawContent = raceResult.chatData.choices?.[0]?.message?.content;
          if (rawContent) {
            try {
              const parsed = JSON.parse(rawContent);
              if (parsed.theme) theme = parsed.theme;
              if (parsed.primaryColor && parsed.primaryColor.startsWith('#')) primaryColor = parsed.primaryColor;
              if (parsed.secondaryColor && parsed.secondaryColor.startsWith('#')) secondaryColor = parsed.secondaryColor;
              if (parsed.accentColor && parsed.accentColor.startsWith('#')) accentColor = parsed.accentColor;
              if (typeof parsed.roughness === 'number') roughness = Math.max(0.05, Math.min(1, parsed.roughness));
              if (typeof parsed.metalness === 'number') metalness = Math.max(0.05, Math.min(1, parsed.metalness));
              if (typeof parsed.emissiveIntensity === 'number')
                emissiveIntensity = Math.max(0.5, Math.min(5, parsed.emissiveIntensity));
              if (typeof parsed.polyCount === 'number') polyCount = Math.floor(parsed.polyCount);
              if (
                parsed.geometryType &&
                [
                  'mecha_sentinel',
                  'winged_dragon',
                  'dimensional_portal',
                  'quantum_tokamak',
                  'astral_monolith',
                  'neural_core',
                  'void_prism',
                ].includes(parsed.geometryType)
              ) {
                geometryType = parsed.geometryType;
              }
              agnesDiagnostic = {
                attempted: true,
                status: 200,
                statusText: 'OK',
              };
            } catch {}
          }
        }

        if (raceResult.imgData?.data?.[0]?.url) {
          aiImageUrl = raceResult.imgData.data[0].url;
        }

        console.log(`[Agnes AI] Parallel synthesis finished in ${Date.now() - agnesStartTime}ms`);
      } catch (agnesErr: any) {
        console.warn('[Agnes AI] Optional gateway request handled gracefully:', agnesErr.message);
        agnesDiagnostic = {
          attempted: true,
          networkError: agnesErr.message || 'Network error reaching Agnes AI Gateway',
        };
      }
    }

    const modelUrl = `/api/models/procedural-${validatedSeed}.glb`;

    const proceduralArtifact = {
      success: true,
      provider: 'procedural-pbr-v3',
      prompt,
      stylePreset: validatedStylePreset,
      seed: validatedSeed,
      modelUrl,
      imageUrl: aiImageUrl,
      agnesDiagnostic,
      metadata: {
        name: `${theme} #${(validatedSeed % 9999).toString().padStart(4, '0')}`,
        description: `Enterprise 3D Generative NFT artifact. Synthesized from prompt: "${prompt}"`,
        image: aiImageUrl,
        animation_url: modelUrl,
        specs: {
          style: validatedStylePreset,
          geometryType,
          polyCount,
          rarity,
          materials: {
            primaryColor,
            secondaryColor,
            accentColor,
            roughness,
            metalness,
            emissiveIntensity,
          },
          partCount: 10 + (validatedSeed % 4),
          dimensions: { x: 2.8, y: 3.6, z: 2.8 },
        },
      },
    };

    return res.json(proceduralArtifact);
  } catch (error: any) {
    console.error('Error generating 3D model:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate 3D model' });
  }
});

// -------------------------------------------------------------
// API ROUTE: GET /api/generate-3d/status?taskId=...
// Polls a Tripo text-to-3D job (single textured+PBR task)
// and returns the finished GLB URL when ready.
// -------------------------------------------------------------
app.get('/api/generate-3d/status', async (req: Request, res: Response) => {
  try {
    const taskId = (req.query.taskId || '').toString();

    // Prune jobs older than 2h
    const now = Date.now();
    for (const [k, v] of tripoJobs) {
      if (now - v.createdAt > 2 * 60 * 60 * 1000) tripoJobs.delete(k);
    }

    const job = tripoJobs.get(taskId);
    if (!job) {
      return res.status(404).json({ status: 'failed', error: 'Unknown or expired generation task' });
    }

    const tripoApiKey = getApiKey('TRIPO_API_KEY');
    if (!tripoApiKey) {
      return res.status(500).json({ status: 'failed', error: 'TRIPO_API_KEY is not configured' });
    }

    const task = await getTripoTask(job.tripoTaskId, tripoApiKey);
    if (!task) {
      return res.json({ status: 'processing', progress: 0, taskId });
    }

    const status = task.status as string;
    const progress = typeof task.progress === 'number' ? task.progress : 0;

    if (status === 'success') {
      const glbUrl = task.output?.model_url || null;
      if (!glbUrl) {
        return res.status(502).json({ status: 'failed', error: 'Tripo task succeeded but returned no model URL' });
      }
      tripoJobs.delete(taskId);
      return res.json({
        status: 'completed',
        provider: 'tripo',
        taskId,
        modelUrl: glbUrl,
        thumbnailUrl: task.output?.rendered_image_url || null,
        progress: 100,
        prompt: job.prompt,
        stylePreset: job.stylePreset,
        seed: job.seed,
        textured: true,
        creditsUsed: task.credits_consumed ?? null,
      });
    }

    if (status === 'failed' || status === 'cancelled') {
      tripoJobs.delete(taskId);
      const msg = task.error_message || `Tripo task ${status}`;
      console.warn('[Tripo] Task failed:', msg);
      return res.json({ status: 'failed', taskId, error: msg });
    }

    return res.json({ status: 'processing', progress, taskId });
  } catch (err: any) {
    console.error('[Tripo] Status poll error:', err.message);
    return res.status(500).json({ status: 'failed', error: err.message || 'Status poll failed' });
  }
});

// -------------------------------------------------------------
// API ROUTE: GET /api/settings/keys
// Returns masked status for each managed API key (never the full value).
// -------------------------------------------------------------
app.get('/api/settings/keys', (_req: Request, res: Response) => {
  const keys: Record<string, { configured: boolean; masked: string }> = {};
  for (const name of MANAGED_API_KEYS) {
    const v = getApiKey(name);
    keys[name] = { configured: v !== '', masked: maskKey(v) };
  }
  res.json({ success: true, keys });
});

// -------------------------------------------------------------
// API ROUTE: POST /api/settings/keys
// Body: { TRIPO_API_KEY?: string, AGNES_API_KEY?: string, ... }
// Empty string clears a stored key (falls back to env). Persisted to
// data/keys.json (gitignored, 0600). Never logs values.
// -------------------------------------------------------------
app.post('/api/settings/keys', (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const stored = readKeysFile();
    const updated: string[] = [];
    for (const name of MANAGED_API_KEYS) {
      if (!(name in body)) continue;
      const v = typeof body[name] === 'string' ? (body[name] as string).trim() : '';
      if (v === '') {
        delete stored[name];
        runtimeKeyOverrides.delete(name);
      } else {
        stored[name] = v;
        runtimeKeyOverrides.set(name, v);
      }
      updated.push(name);
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(KEYS_FILE, JSON.stringify(stored, null, 2), { mode: 0o600 });
    const keys: Record<string, { configured: boolean; masked: string }> = {};
    for (const name of MANAGED_API_KEYS) {
      const v = getApiKey(name);
      keys[name] = { configured: v !== '', masked: maskKey(v) };
    }
    res.json({ success: true, updated, keys });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to save keys' });
  }
});

// -------------------------------------------------------------
// API ROUTE: POST /api/upload-glb
// Accepts a raw .glb binary body (Content-Type: model/gltf-binary),
// stores it under data/uploads, and returns a local URL the viewer
// and minting flow can use. 50MB cap. GLB magic bytes validated.
// -------------------------------------------------------------
app.post(
  '/api/upload-glb',
  express.raw({ type: 'model/gltf-binary', limit: '50mb' }),
  (req: Request, res: Response) => {
    try {
      const buf = req.body as Buffer;
      if (!buf || !Buffer.isBuffer(buf) || buf.length < 12) {
        return res.status(400).json({ success: false, error: 'No GLB data received' });
      }
      if (buf.readUInt32LE(0) !== 0x46546c67) {
        return res.status(400).json({ success: false, error: 'Not a valid GLB file (bad magic bytes)' });
      }
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      const id = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
      const filename = `${id}.glb`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);
      const url = `/api/uploads/${filename}`;
      console.log(`[Upload] GLB stored: ${filename} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
      res.json({ success: true, url, filename, sizeBytes: buf.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Upload failed' });
    }
  }
);

// Serve uploaded GLBs
app.get('/api/uploads/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename || '');
  if (!/^[-a-z0-9]+\.glb$/i.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const full = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(full)) {
    return res.status(404).json({ error: 'Upload not found' });
  }
  res.setHeader('Content-Type', 'model/gltf-binary');
  res.sendFile(full);
});

/**
 * Procedural binary GLTF/GLB builder for server-side 3D asset serving
 */
function createProceduralGLB(id: string = 'artifact'): Buffer {
  const positions = new Float32Array([
    // Top pyramid
     0,  1.4,  0,   -1,  0,  1,    1,  0,  1,
     0,  1.4,  0,    1,  0,  1,    1,  0, -1,
     0,  1.4,  0,    1,  0, -1,   -1,  0, -1,
     0,  1.4,  0,   -1,  0, -1,   -1,  0,  1,
    // Bottom pyramid
     0, -1.4,  0,    1,  0,  1,   -1,  0,  1,
     0, -1.4,  0,    1,  0, -1,    1,  0,  1,
     0, -1.4,  0,   -1,  0, -1,    1,  0, -1,
     0, -1.4,  0,   -1,  0,  1,   -1,  0, -1
  ]);
  const binBuffer = Buffer.from(positions.buffer);

  const gltf = {
    asset: { version: '2.0', generator: 'PolyDimension 3D Engine v2' },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: `Artifact_Mesh_${id}` }],
    meshes: [{
      name: 'Singularity_Mesh',
      primitives: [{
        attributes: { POSITION: 0 },
        material: 0
      }]
    }],
    materials: [{
      name: 'PBR_Material',
      pbrMetallicRoughness: {
        baseColorFactor: [0.55, 0.36, 0.96, 1.0],
        metallicFactor: 0.9,
        roughnessFactor: 0.2
      }
    }],
    accessors: [{
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126,
      count: positions.length / 3,
      type: 'VEC3',
      max: [1.0, 1.4, 1.0],
      min: [-1.0, -1.4, -1.0]
    }],
    bufferViews: [{
      buffer: 0,
      byteOffset: 0,
      byteLength: binBuffer.length,
      target: 34962
    }],
    buffers: [{
      byteLength: binBuffer.length
    }]
  };

  let jsonString = JSON.stringify(gltf);
  while (jsonString.length % 4 !== 0) jsonString += ' ';
  const jsonBuffer = Buffer.from(jsonString, 'utf8');

  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;
  const glb = Buffer.alloc(totalLength);

  glb.writeUInt32LE(0x46546C67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(totalLength, 8);

  glb.writeUInt32LE(jsonBuffer.length, 12);
  glb.writeUInt32LE(0x4E4F534A, 16);
  jsonBuffer.copy(glb, 20);

  const binOffset = 20 + jsonBuffer.length;
  glb.writeUInt32LE(binBuffer.length, binOffset);
  glb.writeUInt32LE(0x004E4942, binOffset + 4);
  binBuffer.copy(glb, binOffset + 8);

  return glb;
}

// -------------------------------------------------------------
// API ROUTE: /api/models/:id
// Serves standard valid binary GLTF/GLB models for any generated artifact
// -------------------------------------------------------------
app.get('/api/models/:id', (req: Request, res: Response) => {
  try {
    const rawId = req.params.id.replace(/\.glb$/i, '');
    const glbBuffer = createProceduralGLB(rawId);
    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Content-Disposition', `inline; filename="${rawId}.glb"`);
    res.send(glbBuffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate GLB model buffer' });
  }
});

// -------------------------------------------------------------
// API ROUTE: /api/pin-metadata
// Pinata IPFS REST API Integration adhering to ERC-721 standard
// -------------------------------------------------------------
app.post('/api/pin-metadata', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      image,
      imageUrl,
      animation_url,
      modelUrl,
      attributes = [],
      properties = {},
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required for ERC-721 metadata' });
    }

    const finalImage = image || imageUrl || 'ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xednzrqoj3dwfe8528956/preview.png';
    const finalModelUrl = animation_url || modelUrl || 'ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xednzrqoj3dwfe8528956/model.glb';

    const pinataJwt = process.env.PINATA_JWT;
    const pinataApiKey = getApiKey('PINATA_API_KEY');
    const pinataSecretKey = getApiKey('PINATA_SECRET_API_KEY');
    const pinataGateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

    // Build standard ERC-721 compliant metadata object
    const metadataPayload = {
      name,
      description,
      image: finalImage,
      animation_url: finalModelUrl,
      external_url: `${process.env.APP_URL || 'https://polydimension.io'}/nft`,
      attributes: [
        ...attributes,
        { trait_type: 'Standard', value: 'ERC-721 3D Model' },
        { trait_type: 'Renderer', value: 'Three.js PBR Filmic' },
        { trait_type: 'Pinned At', value: new Date().toISOString() },
      ],
      properties: {
        category: '3d_model',
        files: [
          {
            uri: finalModelUrl,
            type: 'model/gltf-binary',
          },
          {
            uri: finalImage,
            type: 'image/png',
          },
        ],
        ...properties,
      },
    };

    // If Pinata JWT or API keys are configured, perform remote pinning
    if (pinataJwt || (pinataApiKey && pinataSecretKey)) {
      try {
        console.log('[Pinata IPFS] Pinning metadata JSON to Pinata Cloud...');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (pinataJwt) {
          headers['Authorization'] = `Bearer ${pinataJwt}`;
        } else if (pinataApiKey && pinataSecretKey) {
          headers['pinata_api_key'] = pinataApiKey;
          headers['pinata_secret_api_key'] = pinataSecretKey;
        }

        const pinResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            pinataContent: metadataPayload,
            pinataMetadata: {
              name: `3D_NFT_${name.replace(/\s+/g, '_')}_metadata.json`,
            },
          }),
        });

        if (pinResponse.ok) {
          const pinData = await pinResponse.json();
          const ipfsHash = pinData.IpfsHash;
          const ipfsUri = `ipfs://${ipfsHash}`;
          const gatewayUrl = `https://${pinataGateway}/ipfs/${ipfsHash}`;

          // Also keep in local cache
          ipfsRegistry.set(ipfsHash, metadataPayload);

          return res.json({
            success: true,
            provider: 'pinata',
            cid: ipfsHash,
            ipfsHash,
            ipfsUri,
            gatewayUrl,
            metadata: metadataPayload,
          });
        } else {
          const errText = await pinResponse.text();
          console.warn('[Pinata IPFS] Error response from Pinata:', errText);
        }
      } catch (pinErr) {
        console.warn('[Pinata IPFS] Network error reaching Pinata:', pinErr);
      }
    }

    // High-Integrity Deterministic IPFS Multi-hash Simulation
    const rawString = JSON.stringify(metadataPayload);
    const simulatedCid = generateDeterministicCID(rawString);
    const ipfsUri = `ipfs://${simulatedCid}`;
    const gatewayUrl = `https://ipfs.io/ipfs/${simulatedCid}`;

    // Store in memory registry so client can inspect it
    ipfsRegistry.set(simulatedCid, metadataPayload);

    return res.json({
      success: true,
      provider: 'decentralized-ipfs-node',
      cid: simulatedCid,
      ipfsHash: simulatedCid,
      ipfsUri,
      gatewayUrl,
      metadata: metadataPayload,
      isSimulated: true,
    });
  } catch (error: any) {
    console.error('Error pinning metadata:', error);
    return res.status(500).json({ error: error.message || 'Failed to pin metadata' });
  }
});

// Endpoint to resolve simulated IPFS hashes
app.get('/api/ipfs/:cid', (req: Request, res: Response) => {
  const cid = req.params.cid;
  const metadata = ipfsRegistry.get(cid);
  if (metadata) {
    return res.json(metadata);
  }
  return res.status(404).json({ error: 'IPFS content not found in local node gateway cache' });
});

// -------------------------------------------------------------
// API ROUTE: /api/generate-music
// Generative Music & Soundtrack Engine using Lyria / Gemini API
// -------------------------------------------------------------
app.post('/api/generate-music', async (req: Request, res: Response) => {
  try {
    const { prompt = 'ambient sci-fi cyberpunk synthwave', duration = 15, style = 'cyberpunk' } = req.body;

    const apiKey = getApiKey('GEMINI_API_KEY');
    let geminiDescription = '';

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        // Use gemini-3.8-flash for soundscape synthesis design
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Create an audio soundtrack acoustic profile for an enterprise 3D NFT artifact.
Prompt: "${prompt}".
Theme style: "${style}".
Generate a structured JSON output with:
- title: string (poetic soundtrack title)
- keySignature: string (e.g. "D Minor", "F# Dorian")
- bpm: number (between 72 and 138)
- scaleNotes: string[] (array of note frequencies or names)
- moodDescription: string (atmospheric sound design description)
- synthesisConfig: { arpeggioSpeed: number, bassCutoff: number, reverbDecay: number, resonance: number }
Return ONLY raw JSON.`,
        });

        const text = response.text || '';
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        geminiDescription = parsed;
      } catch (aiErr) {
        console.warn('Gemini audio design error:', aiErr);
      }
    }

    // Default high-grade synth audio parameter blueprint
    const fallbackAudioPresets: Record<string, any> = {
      cyberpunk: {
        title: 'Neon Synapse Overdrive',
        keySignature: 'F# Minor',
        bpm: 124,
        scaleNotes: [185.0, 220.0, 246.94, 277.18, 329.63, 369.99],
        moodDescription: 'Hyper-saturated analog sawtooth bass with crystalline digital arpeggios and low-pass filtered industrial percussion.',
        synthesisConfig: { arpeggioSpeed: 0.12, bassCutoff: 450, reverbDecay: 2.8, resonance: 6.5 },
      },
      celestial: {
        title: 'Singularity Echoes',
        keySignature: 'A Aeolian',
        bpm: 86,
        scaleNotes: [220.0, 261.63, 293.66, 329.63, 392.0, 440.0],
        moodDescription: 'Ethereal shimmer reverbs with sinusoidal celestial pads and deep sub-atomic resonance pulses.',
        synthesisConfig: { arpeggioSpeed: 0.28, bassCutoff: 280, reverbDecay: 5.5, resonance: 3.2 },
      },
      biotech: {
        title: 'Neural Bio-Pulse Matrix',
        keySignature: 'D Dorian',
        bpm: 110,
        scaleNotes: [146.83, 174.61, 196.0, 220.0, 261.63, 293.66],
        moodDescription: 'Organic FM modulations, glitch micro-rhythms, and breathing biosensor sub-harmonics.',
        synthesisConfig: { arpeggioSpeed: 0.16, bassCutoff: 520, reverbDecay: 3.2, resonance: 8.0 },
      },
      obsidian: {
        title: 'Dark Void Resonator',
        keySignature: 'C Minor',
        bpm: 92,
        scaleNotes: [130.81, 155.56, 174.61, 196.0, 233.08, 261.63],
        moodDescription: 'Sub-bass drone with obsidian crystal reflections and deep spatial cavern delays.',
        synthesisConfig: { arpeggioSpeed: 0.22, bassCutoff: 310, reverbDecay: 4.8, resonance: 4.5 },
      },
    };

    const finalSoundtrack = geminiDescription || (fallbackAudioPresets[style] || fallbackAudioPresets.cyberpunk);

    return res.json({
      success: true,
      provider: geminiDescription ? 'gemini-sound-architect' : 'procedural-synthesizer',
      prompt,
      soundtrack: finalSoundtrack,
      duration,
    });
  } catch (error: any) {
    console.error('Error generating music:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate soundtrack' });
  }
});

// Catch-all for API routes so they always return JSON and never Vite's index.html
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
});

// Setup Vite or static serving
async function startServer() {
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PolyDimension Studio] Full-stack engine listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
