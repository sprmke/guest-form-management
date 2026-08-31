export type OptimizePreset = 'PHOTO_MASTER' | 'CONTENT' | 'AVATAR' | 'DOCUMENT' | 'NONE';

export type OptimizePresetPlan = {
  maxLongEdge: number | null;
  quality: number;
  preferWebp: boolean;
  preserveAlphaAsPng: boolean;
};

export const OPTIMIZE_PRESETS: Record<Exclude<OptimizePreset, 'NONE'>, OptimizePresetPlan> = {
  PHOTO_MASTER: {
    maxLongEdge: 3840,
    quality: 0.82,
    preferWebp: true,
    preserveAlphaAsPng: false,
  },
  CONTENT: {
    maxLongEdge: 2048,
    quality: 0.82,
    preferWebp: true,
    preserveAlphaAsPng: false,
  },
  AVATAR: {
    maxLongEdge: 512,
    quality: 0.85,
    preferWebp: true,
    preserveAlphaAsPng: true,
  },
  DOCUMENT: {
    maxLongEdge: 3000,
    quality: 0.95,
    preferWebp: false,
    preserveAlphaAsPng: true,
  },
};

export function isOptimizePreset(value: unknown): value is OptimizePreset {
  return (
    value === 'PHOTO_MASTER' ||
    value === 'CONTENT' ||
    value === 'AVATAR' ||
    value === 'DOCUMENT' ||
    value === 'NONE'
  );
}
