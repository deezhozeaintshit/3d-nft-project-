import type { MintedNFTItem } from '../components/GalleryDrawer';

export type RarityLabel = 'Mythic' | 'Legendary' | 'Common';

export interface MaterialAttributes {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  roughness: number;
  metalness: number;
  emissiveIntensity: number;
}

export interface RarityAnalysisResult {
  rarity: RarityLabel;
  score: number;
  polyScore: number;
  materialScore: number;
  noveltyScore: number;
  polyPercentile: number;
  metrics: {
    polyCount: number;
    collectionAvgPoly: number;
    roughness: number;
    metalness: number;
    emissiveIntensity: number;
    colorDistinctness: number;
  };
  explanation: string;
}

/**
 * Converts a hex color string to RGB components (0-255)
 */
function hexToRgb(hex?: string): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  return null;
}

/**
 * Calculates Euclidean color distance between two hex colors (0-441 range)
 */
function getColorDistance(hexA?: string, hexB?: string): number {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) return 200; // default moderate distance
  const dr = rgbA.r - rgbB.r;
  const dg = rgbA.g - rgbB.g;
  const db = rgbA.b - rgbB.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Core Rarity Engine
 *
 * Analyzes polyCount and material attributes against existing collection items
 * to automatically assign a 'Mythic', 'Legendary', or 'Common' rarity label before minting.
 *
 * Evaluation Criteria:
 * 1. Geometry Complexity (polyCount):
 *    - Compares polyCount against the distribution of existing collection items.
 *    - Higher poly counts (>80th percentile or >1.2x collection average) indicate high-tier geometry.
 * 2. PBR Material Extremes (roughness & metalness):
 *    - Mirror chrome (metalness > 0.88, roughness < 0.15) and void obsidian finishes
 *      exhibit high physical rarity compared to average medium-roughness materials.
 * 3. Radiant Core Energy (emissiveIntensity):
 *    - Singular / plasma cores with high emissive values (>2.5) are statistically rarer.
 * 4. Color Palette Novelty:
 *    - Evaluates Euclidean color space distance against existing minted NFTs to reward distinctive palettes.
 */
export function calculateRarity(
  polyCount: number,
  materialsConfig: MaterialAttributes,
  existingCollection: MintedNFTItem[] = []
): RarityLabel {
  const analysis = calculateRarityDetailed(polyCount, materialsConfig, existingCollection);
  return analysis.rarity;
}

/**
 * Detailed Rarity Calculator returning numeric scores and diagnostic breakdown
 */
export function calculateRarityDetailed(
  polyCount: number,
  materialsConfig: MaterialAttributes,
  existingCollection: MintedNFTItem[] = []
): RarityAnalysisResult {
  const validCount = Number.isFinite(polyCount) && polyCount > 0 ? polyCount : 18000;
  const {
    roughness = 0.25,
    metalness = 0.85,
    emissiveIntensity = 2.0,
    primaryColor = '#8b5cf6',
  } = materialsConfig || {};

  // -------------------------------------------------------------------------
  // 1. PolyCount Analysis against Existing Collection
  // -------------------------------------------------------------------------
  let polyScore = 0;
  let collectionAvgPoly = validCount;
  let polyPercentile = 50;

  if (existingCollection.length > 0) {
    const polyCounts = existingCollection
      .map((item) => item.polyCount)
      .filter((count) => typeof count === 'number' && Number.isFinite(count));

    if (polyCounts.length > 0) {
      const sum = polyCounts.reduce((acc, val) => acc + val, 0);
      collectionAvgPoly = Math.round(sum / polyCounts.length);

      // Calculate percentile rank in existing collection
      const itemsBelow = polyCounts.filter((c) => c <= validCount).length;
      polyPercentile = Math.round((itemsBelow / polyCounts.length) * 100);

      // Scoring based on relative distribution
      if (validCount >= collectionAvgPoly * 1.2 || polyPercentile >= 80 || validCount > 25000) {
        polyScore = 35; // Top tier geometry
      } else if (validCount >= collectionAvgPoly * 0.95 || polyPercentile >= 40 || validCount > 18000) {
        polyScore = 22; // Mid tier geometry
      } else {
        polyScore = 10; // Baseline geometry
      }
    } else {
      polyScore = validCount >= 24000 ? 35 : validCount >= 18000 ? 22 : 10;
    }
  } else {
    // Intrinsic thresholds if collection has no items yet
    if (validCount >= 24000) polyScore = 35;
    else if (validCount >= 18000) polyScore = 22;
    else polyScore = 10;
  }

  // -------------------------------------------------------------------------
  // 2. Material Attributes Analysis (PBR Finishes & Emissive Radiance)
  // -------------------------------------------------------------------------
  let materialScore = 0;

  // Emissive Radiance Analysis
  let emissiveScore = 0;
  if (emissiveIntensity >= 2.8) {
    emissiveScore = 20; // Hyper-radiant singularity
  } else if (emissiveIntensity >= 1.9) {
    emissiveScore = 12; // Active plasma resonance
  } else {
    emissiveScore = 5; // Standard illumination
  }

  // PBR Metalness & Roughness Extremes Analysis
  let pbrScore = 0;
  const isMirrorChrome = metalness >= 0.88 && roughness <= 0.15;
  const isObsidianVoid = metalness >= 0.94 && roughness <= 0.10;
  const isPureMatteStealth = metalness <= 0.25 && roughness >= 0.70;

  if (isObsidianVoid || isMirrorChrome) {
    pbrScore = 25; // Pristine ultra-rare finish
  } else if (isPureMatteStealth || metalness >= 0.80 || roughness <= 0.20) {
    pbrScore = 15; // Refined metallic / specular finish
  } else {
    pbrScore = 8; // Standard surface finish
  }

  materialScore = emissiveScore + pbrScore;

  // -------------------------------------------------------------------------
  // 3. Color Palette Novelty compared to Collection
  // -------------------------------------------------------------------------
  let noveltyScore = 10;
  let minColorDistance = 255;

  if (existingCollection.length > 0) {
    const existingColors = existingCollection
      .map((item) => item.materialsConfig?.primaryColor)
      .filter(Boolean) as string[];

    if (existingColors.length > 0) {
      existingColors.forEach((col) => {
        const dist = getColorDistance(primaryColor, col);
        if (dist < minColorDistance) minColorDistance = dist;
      });

      // If distance from closest item is large, palette is rare/novel
      if (minColorDistance > 140) {
        noveltyScore = 20; // High palette novelty
      } else if (minColorDistance > 80) {
        noveltyScore = 14; // Moderate palette distinction
      } else {
        noveltyScore = 6; // Similar to existing items in collection
      }
    }
  } else {
    // If first item in collection, standard baseline
    noveltyScore = 15;
  }

  // -------------------------------------------------------------------------
  // 4. Composite Rarity Score & Tier Classification
  // -------------------------------------------------------------------------
  // Total Score Range: 0 to 100
  const totalScore = Math.min(100, Math.max(0, polyScore + materialScore + noveltyScore));

  let rarity: RarityLabel;
  let explanation = '';

  if (totalScore >= 70) {
    rarity = 'Mythic';
    explanation = `Mythic tier determined by high geometric density (${validCount.toLocaleString()} Polys, ${polyPercentile}th percentile) and hyper-specular PBR finish with glowing emissive core.`;
  } else if (totalScore >= 45) {
    rarity = 'Legendary';
    explanation = `Legendary tier determined by balanced high-spec PBR materials (${Math.round(metalness * 100)}% metalness, ${Math.round(roughness * 100)}% roughness) and distinctive collection palette.`;
  } else {
    rarity = 'Common';
    explanation = `Common tier assigned based on standard geometric complexity and baseline PBR parameters matching collection norms.`;
  }

  return {
    rarity,
    score: totalScore,
    polyScore,
    materialScore,
    noveltyScore,
    polyPercentile,
    metrics: {
      polyCount: validCount,
      collectionAvgPoly,
      roughness,
      metalness,
      emissiveIntensity,
      colorDistinctness: Math.round(minColorDistance),
    },
    explanation,
  };
}
