import type { CSSProperties, ReactNode } from 'react';

import type { VideoScene } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import { slotIsActive } from '@/features/dashboard/marketing/lib/video/videoSceneElements';
import type { VideoTextSlotId } from '@/features/dashboard/marketing/lib/video/videoTextSlots';

export function scaleForVideoFormat(width: number, height: number): number {
  const base = 1080;
  return Math.min(width / base, height / base, 1.35);
}

function titleStyle(): CSSProperties {
  return {
    color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 700,
    textShadow: '0 2px 16px rgba(0,0,0,0.45)',
  };
}

export function slotHasVisibleText(scene: VideoScene, slot: VideoTextSlotId): boolean {
  if (!slotIsActive(scene, slot)) return false;
  const { texts } = scene;
  switch (slot) {
    case 'headline':
      return Boolean(texts.headline?.trim());
    case 'subheadline':
      return Boolean(texts.subheadline?.trim());
    case 'promoLine':
      return Boolean(texts.promoLine?.trim());
    case 'ctaLine':
      return Boolean(texts.ctaLine?.trim());
    case 'rulesLine':
      return Boolean(texts.rulesLine?.trim());
    case 'slotLabels':
      return texts.slotLabels.some((label) => label.trim().length > 0);
    default:
      return false;
  }
}

export function VideoTextSlotBody({
  scene,
  slot,
  brandColor,
  scale,
}: {
  scene: VideoScene;
  slot: VideoTextSlotId;
  brandColor: string;
  scale: number;
}): ReactNode {
  const { texts } = scene;

  if (scene.kind === 'photo' && slot === 'headline' && texts.headline) {
    return (
      <div
        style={{
          ...titleStyle(),
          fontSize: Math.round(52 * scale),
          color: brandColor,
          WebkitTextStroke: '2px #fff',
        }}
      >
        {texts.headline}
      </div>
    );
  }

  if (scene.kind === 'promo') {
    if (slot === 'headline' && texts.headline) {
      return (
        <div
          style={{
            ...titleStyle(),
            fontSize: Math.round(52 * scale),
            color: brandColor,
            WebkitTextStroke: '2px #fff',
          }}
        >
          {texts.headline}
        </div>
      );
    }
    if (slot === 'subheadline' && texts.subheadline) {
      return (
        <div
          style={{
            ...titleStyle(),
            fontSize: Math.round(36 * scale),
            color: '#fff8f0',
          }}
        >
          {texts.subheadline}
        </div>
      );
    }
    if (slot === 'promoLine' && texts.promoLine) {
      return (
        <div
          style={{
            ...titleStyle(),
            fontSize: Math.round(88 * scale),
            color: '#fff8f0',
            WebkitTextStroke: '3px #5c3d2e',
            lineHeight: 1,
          }}
        >
          {texts.promoLine}
        </div>
      );
    }
    if (slot === 'ctaLine' && texts.ctaLine) {
      return (
        <div
          style={{
            ...titleStyle(),
            fontSize: Math.round(32 * scale),
          }}
        >
          {texts.ctaLine}
        </div>
      );
    }
    if (slot === 'rulesLine' && texts.rulesLine) {
      return (
        <div
          style={{
            ...titleStyle(),
            fontSize: Math.round(26 * scale),
            color: '#fff8f0',
          }}
        >
          {texts.rulesLine}
        </div>
      );
    }
  }

  if (scene.kind === 'slots') {
    if (slot === 'headline' && texts.headline) {
      return (
        <div
          style={{
            ...titleStyle(),
            fontSize: Math.round(56 * scale),
            color: brandColor,
            WebkitTextStroke: '2px #fff',
          }}
        >
          {texts.headline}
        </div>
      );
    }
    if (slot === 'subheadline' && texts.subheadline) {
      return (
        <div
          style={{
            backgroundColor: '#2563eb',
            borderRadius: 999,
            padding: `${Math.round(10 * scale)}px ${Math.round(28 * scale)}px`,
            fontSize: Math.round(26 * scale),
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {texts.subheadline}
        </div>
      );
    }
    if (slot === 'slotLabels' && texts.slotLabels.length > 0) {
      return (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: Math.round(16 * scale),
            justifyContent: 'center',
          }}
        >
          {texts.slotLabels.map((label) => (
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
    if (slot === 'ctaLine' && texts.ctaLine) {
      return (
        <div
          style={{
            ...titleStyle(),
            fontSize: Math.round(32 * scale),
          }}
        >
          {texts.ctaLine}
        </div>
      );
    }
    if (slot === 'rulesLine' && texts.rulesLine) {
      return (
        <div
          style={{
            ...titleStyle(),
            fontSize: Math.round(26 * scale),
            color: '#fff8f0',
          }}
        >
          {texts.rulesLine}
        </div>
      );
    }
  }

  if (scene.kind === 'cta') {
    if (slot === 'ctaLine' && texts.ctaLine) {
      return (
        <div
          style={{
            backgroundColor: brandColor,
            borderRadius: 999,
            padding: `${Math.round(14 * scale)}px ${Math.round(36 * scale)}px`,
            fontSize: Math.round(28 * scale),
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {texts.ctaLine}
        </div>
      );
    }
    if (slot === 'rulesLine' && texts.rulesLine) {
      return (
        <div
          style={{
            ...titleStyle(),
            fontSize: Math.round(26 * scale),
            color: '#fff8f0',
          }}
        >
          {texts.rulesLine}
        </div>
      );
    }
  }

  return null;
}
