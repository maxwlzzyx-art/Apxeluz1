export type LiquidGlassPresetKey = 'navbar' | 'card' | 'button' | 'panel';

export interface LiquidGlassPreset {
  id: string;
  displacementScale: number;
  blurPx: number;
  saturationPct: number;
  aberrationIntensity: number;
  elasticity: number;
  edgeThickness: number;
  mapWidth: number;
  mapHeight: number;
  overLight: boolean;
}

export const LIQUID_GLASS_PRESETS: Record<LiquidGlassPresetKey, LiquidGlassPreset> = {
  navbar: {
    id: 'apx-lg-navbar',
    displacementScale: 16,
    blurPx: 20,
    saturationPct: 185,
    aberrationIntensity: 1.5,
    elasticity: 0.12,
    edgeThickness: 0.22,
    mapWidth: 180,
    mapHeight: 56,
    overLight: true,
  },
  card: {
    id: 'apx-lg-card',
    displacementScale: 24,
    blurPx: 18,
    saturationPct: 185,
    aberrationIntensity: 2.0,
    elasticity: 0.22,
    edgeThickness: 0.18,
    mapWidth: 128,
    mapHeight: 160,
    overLight: true,
  },
  button: {
    id: 'apx-lg-button',
    displacementScale: 28,
    blurPx: 14,
    saturationPct: 190,
    aberrationIntensity: 2.2,
    elasticity: 0.35,
    edgeThickness: 0.28,
    mapWidth: 144,
    mapHeight: 48,
    overLight: true,
  },
  panel: {
    id: 'apx-lg-panel',
    displacementScale: 20,
    blurPx: 22,
    saturationPct: 180,
    aberrationIntensity: 1.6,
    elasticity: 0.1,
    edgeThickness: 0.14,
    mapWidth: 200,
    mapHeight: 150,
    overLight: true,
  },
};

export function smoothStep(a: number, b: number, t: number): number {
  if (b === a) return t >= b ? 1 : 0;
  const clamped = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return clamped * clamped * (3 - 2 * clamped);
}

export function roundedRectSDF(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  radius: number
): number {
  const qx = Math.abs(x) - halfWidth + radius;
  const qy = Math.abs(y) - halfHeight + radius;
  const outsideDist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const insideDist = Math.min(Math.max(qx, qy), 0);
  return insideDist + outsideDist - radius;
}

/**
 * Computes optical displacement UV offset for a rounded-rectangle liquid glass lens
 * (adapted from rdev/liquid-glass-react ShaderDisplacementGenerator for overLight UI).
 */
export function computeLiquidGlassUV(
  u: number,
  v: number,
  edgeThickness = 0.2
): { x: number; y: number } {
  const ix = u - 0.5;
  const iy = v - 0.5;
  const distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.24);
  const displacement = smoothStep(0.8, 0, distanceToEdge - edgeThickness);
  const scaled = smoothStep(0, 1, displacement);
  return {
    x: ix * scaled + 0.5,
    y: iy * scaled + 0.5,
  };
}

export interface AberrationChannelScales {
  effectiveScale: number;
  redScale: number;
  greenScale: number;
  blueScale: number;
  edgeBlurStdDev: number;
}

export function getLiquidGlassAberrationScales(
  preset: Pick<LiquidGlassPreset, 'displacementScale' | 'aberrationIntensity' | 'overLight'>
): AberrationChannelScales {
  const effectiveScale = preset.overLight
    ? preset.displacementScale * 0.5
    : preset.displacementScale;
  const aberration = preset.aberrationIntensity;

  return {
    effectiveScale,
    redScale: -effectiveScale,
    greenScale: -effectiveScale * (1 - aberration * 0.05),
    blueScale: -effectiveScale * (1 - aberration * 0.1),
    edgeBlurStdDev: Math.max(0.1, 0.5 - aberration * 0.1),
  };
}

/**
 * Generates an RGBA pixel buffer representing the SDF displacement vector field.
 * R = X displacement, G/B = Y displacement, A = 255.
 */
export function generateDisplacementPixels(
  width: number,
  height: number,
  edgeThickness = 0.2
): Uint8ClampedArray {
  const w = Math.max(8, Math.round(width));
  const h = Math.max(8, Math.round(height));
  const rawValues = new Float32Array(w * h * 2);
  let maxScale = 0;
  let ptr = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const uv = computeLiquidGlassUV(x / w, y / h, edgeThickness);
      const dx = uv.x * w - x;
      const dy = uv.y * h - y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx > maxScale) maxScale = absDx;
      if (absDy > maxScale) maxScale = absDy;
      rawValues[ptr++] = dx;
      rawValues[ptr++] = dy;
    }
  }

  maxScale = maxScale > 0 ? Math.max(maxScale, 1) : 1;

  const pixels = new Uint8ClampedArray(w * h * 4);
  ptr = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = rawValues[ptr++];
      const dy = rawValues[ptr++];
      const edgeDistance = Math.min(x, y, w - x - 1, h - y - 1);
      const edgeFactor = Math.min(1, edgeDistance / 2);
      const r = (dx * edgeFactor) / maxScale + 0.5;
      const g = (dy * edgeFactor) / maxScale + 0.5;
      const outIdx = (y * w + x) * 4;
      pixels[outIdx] = Math.max(0, Math.min(255, Math.round(r * 255)));
      pixels[outIdx + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
      pixels[outIdx + 2] = Math.max(0, Math.min(255, Math.round(g * 255)));
      pixels[outIdx + 3] = 255;
    }
  }

  return pixels;
}

const displacementMapCache = new Map<string, string>();

/**
 * Creates (and caches) a PNG data URL for the SVG <feImage> displacement map.
 * Safe in SSR/Node environments (returns empty string if canvas is unavailable).
 */
export function createDisplacementDataUrl(preset: LiquidGlassPreset): string {
  const cacheKey = `${preset.id}:${preset.mapWidth}x${preset.mapHeight}:${preset.edgeThickness}`;
  const cached = displacementMapCache.get(cacheKey);
  if (cached) return cached;

  if (typeof document === 'undefined') return '';

  try {
    const canvas = document.createElement('canvas');
    canvas.width = preset.mapWidth;
    canvas.height = preset.mapHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const pixels = generateDisplacementPixels(
      preset.mapWidth,
      preset.mapHeight,
      preset.edgeThickness
    );
    const imageData = ctx.createImageData(preset.mapWidth, preset.mapHeight);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    const url = canvas.toDataURL('image/png');
    displacementMapCache.set(cacheKey, url);
    return url;
  } catch {
    return '';
  }
}
