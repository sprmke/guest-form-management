import type { ReactNode } from 'react';

import {
  resolveLayerTypography,
  typographyToCss,
} from '@/features/dashboard/marketing/lib/video/videoLayerTypography';
import type { VideoSceneLayer } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';

export function layerHasContent(layer: VideoSceneLayer): boolean {
  switch (layer.kind) {
    case 'background':
      return true;
    case 'image':
    case 'logo':
      return Boolean(layer.imageUrl?.trim());
    case 'slots':
      return Boolean(layer.lines?.some((line) => line.trim()));
    case 'text':
    case 'cta':
      return Boolean(layer.text?.trim());
    default:
      return false;
  }
}

export function VideoLayerBody({
  layer,
  brandColor,
  scale,
}: {
  layer: VideoSceneLayer;
  brandColor: string;
  scale: number;
}): ReactNode {
  if (layer.kind === 'logo' && layer.imageUrl) {
    return (
      <img
        src={layer.imageUrl}
        alt=""
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    );
  }

  if (layer.kind === 'image' && layer.imageUrl) {
    return (
      <img
        src={layer.imageUrl}
        alt=""
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          borderRadius: Math.round(12 * scale),
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        }}
      />
    );
  }

  if (layer.kind === 'slots' && layer.lines?.length) {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: Math.round(16 * scale),
          justifyContent: 'center',
        }}
      >
        {layer.lines.map((label) => (
          <div
            key={label}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: Math.round(20 * scale),
              padding: `${Math.round(20 * scale)}px ${Math.round(28 * scale)}px`,
              minWidth: Math.round(140 * scale),
              textAlign: 'center',
              color: '#7c4a2d',
              fontSize: Math.round(28 * scale),
              fontWeight: 800,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    );
  }

  if ((layer.kind === 'text' || layer.kind === 'cta') && layer.text) {
    const typography = resolveLayerTypography(layer, brandColor);
    const css = typographyToCss(typography, scale, { isCta: layer.kind === 'cta' });
    const whiteSpace = layer.text.includes('\n') ? 'pre-wrap' : 'nowrap';
    return (
      <div style={{ ...css, whiteSpace, display: 'inline-block', maxWidth: '100%' }}>
        {layer.text}
      </div>
    );
  }

  return null;
}
