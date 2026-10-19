/**
 * Next.js Route Handler for 3D Generation Pipeline
 * Integrates with Agnes AI 3D Gateway and procedural PBR fallback
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Valid prompt string is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Strict Seed Validation & Normalization
    const rawSeed = body.seed;
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
    const rawPreset = (body.stylePreset || '').toString().toLowerCase().trim();
    const validatedStylePreset: AllowedStylePreset = ALLOWED_STYLE_PRESETS.includes(rawPreset as any)
      ? (rawPreset as AllowedStylePreset)
      : 'cyberpunk';

    const agnesApiKey = process.env.AGNES_API_KEY;
    let agnesDiagnostic: {
      attempted: boolean;
      status?: number;
      statusText?: string;
      errorDetails?: any;
      networkError?: string;
    } | null = null;

    // 3. Agnes AI 3D Gateway with Detailed Error Logging & Diagnostics
    if (agnesApiKey && agnesApiKey.trim() !== '') {
      try {
        console.log(`[Agnes AI] Submitting 3D task for prompt: "${prompt}" [style: ${validatedStylePreset}, seed: ${validatedSeed}]`);
        const agnesStartTime = Date.now();
        const agnesResponse = await fetch('https://apihub.agnes-ai.com/v1/generations/3d', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agnesApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            stylePreset: validatedStylePreset,
            seed: validatedSeed,
          }),
        });

        const elapsedMs = Date.now() - agnesStartTime;

        if (agnesResponse.ok) {
          const agnesData = await agnesResponse.json();
          console.log(`[Agnes AI] API Response Succeeded in ${elapsedMs}ms:`, {
            taskId: agnesData.taskId || agnesData.id,
            status: agnesData.status,
            modelUrl: agnesData.modelUrl || agnesData.output?.glb || null,
          });

          return new Response(
            JSON.stringify({
              success: true,
              provider: 'agnes-ai',
              taskId: agnesData.taskId || agnesData.id,
              status: agnesData.status || 'completed',
              modelUrl: agnesData.modelUrl || agnesData.output?.glb || null,
              prompt,
              stylePreset: validatedStylePreset,
              seed: validatedSeed,
              agnesDiagnostic: {
                attempted: true,
                status: agnesResponse.status,
                statusText: agnesResponse.statusText,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } else {
          // Robust Agnes AI Error Logging
          let errorBody: any;
          const rawText = await agnesResponse.text();
          try {
            errorBody = JSON.parse(rawText);
          } catch {
            errorBody = rawText;
          }

          console.error(`[Agnes AI] Gateway Error [HTTP ${agnesResponse.status} ${agnesResponse.statusText}] after ${elapsedMs}ms:`, {
            status: agnesResponse.status,
            statusText: agnesResponse.statusText,
            url: 'https://apihub.agnes-ai.com/v1/generations/3d',
            headers: Object.fromEntries(agnesResponse.headers.entries()),
            responseBody: errorBody,
          });

          agnesDiagnostic = {
            attempted: true,
            status: agnesResponse.status,
            statusText: agnesResponse.statusText,
            errorDetails: errorBody,
          };
        }
      } catch (agnesErr: any) {
        console.error('[Agnes AI] Connection Exception during fetch:', {
          message: agnesErr.message,
          code: agnesErr.code,
          stack: agnesErr.stack,
        });

        agnesDiagnostic = {
          attempted: true,
          networkError: agnesErr.message || 'Network error reaching Agnes AI Gateway',
        };
      }
    }

    // Procedural PBR Fallback
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

    const rarityTiers = ['Rare', 'Epic', 'Legendary', 'Mythic'];
    const rarity = rarityTiers[validatedSeed % rarityTiers.length];

    // Generate real AI image asset via Agnes Image Generation API if key is available
    let aiImageUrl = `https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80`;
    if (agnesApiKey && agnesApiKey.trim() !== '') {
      try {
        console.log(`[Agnes AI] Generating 3D artifact hero render for prompt: "${prompt}"`);
        const imgResponse = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agnesApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'agnes-image-2.5-flash',
            prompt: `3D digital art rendering of ${prompt}, ${validatedStylePreset} style, dark studio background, cinematic PBR lighting, 8k octane render`,
          }),
        });

        if (imgResponse.ok) {
          const imgData = await imgResponse.json();
          if (imgData.data?.[0]?.url) {
            aiImageUrl = imgData.data[0].url;
          }
        }
      } catch (imgErr: any) {
        console.warn('[Agnes AI] Image generation call caught exception in Next route:', imgErr.message);
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

    return new Response(JSON.stringify(proceduralArtifact), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error generating 3D model:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate 3D model' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
