import { VideoPropertyImagePicker } from '@/features/dashboard/marketing/components/video-editor/VideoPropertyImagePicker';
import type { PropertyMediaItem } from '@/features/dashboard/marketing/lib/polotno/propertyMedia';
import { inferBackgroundMediaType } from '@/features/dashboard/marketing/lib/propertyBindingMedia';
import type {
  VideoScene,
  VideoSceneKind,
  VideoSceneTextFields,
  VideoTransition,
} from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import { VIDEO_SCENE_DURATION } from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import { applySceneKindChange } from '@/features/dashboard/marketing/lib/video/videoSceneKindChange';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SCENE_KINDS: { value: VideoSceneKind; label: string }[] = [
  { value: 'photo', label: 'Photo' },
  { value: 'promo', label: 'Promo' },
  { value: 'slots', label: 'Slots' },
  { value: 'cta', label: 'CTA' },
];

const TRANSITIONS: { value: VideoTransition; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide-left', label: 'Slide left' },
  { value: 'slide-up', label: 'Slide up' },
  { value: 'wipe', label: 'Wipe' },
];

type SceneChangeHandler = (scene: VideoScene) => void;

function useScenePatch(scene: VideoScene, onChange: SceneChangeHandler) {
  const patch = (partial: Partial<VideoScene>) => onChange({ ...scene, ...partial });
  const patchText = (key: keyof VideoScene['texts'], value: string | string[]) => {
    onChange({
      ...scene,
      texts: { ...scene.texts, [key]: value },
    });
  };
  return { patch, patchText };
}

export function VideoSceneMetaSettings({
  scene,
  sceneIndex,
  onChange,
  templateTextSeed,
}: {
  scene: VideoScene;
  sceneIndex: number;
  onChange: SceneChangeHandler;
  templateTextSeed?: VideoSceneTextFields;
}) {
  const { patch } = useScenePatch(scene, onChange);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="scene-label">Label</Label>
        <Input
          id="scene-label"
          value={scene.label}
          onChange={(e) => patch({ label: e.target.value })}
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scene-kind">Layout</Label>
        <Select
          value={scene.kind}
          onValueChange={(value) => {
            const kind = value as VideoSceneKind;
            if (kind === scene.kind) return;
            onChange(applySceneKindChange(scene, kind, templateTextSeed));
          }}
        >
          <SelectTrigger id="scene-kind" className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCENE_KINDS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scene-duration">
          Duration ({VIDEO_SCENE_DURATION.min}–{VIDEO_SCENE_DURATION.max}s)
        </Label>
        <Input
          id="scene-duration"
          type="number"
          min={VIDEO_SCENE_DURATION.min}
          max={VIDEO_SCENE_DURATION.max}
          step={0.5}
          value={scene.durationSec}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) {
              patch({
                durationSec: Math.min(
                  VIDEO_SCENE_DURATION.max,
                  Math.max(VIDEO_SCENE_DURATION.min, next)
                ),
              });
            }
          }}
          className="h-10"
        />
      </div>

      {sceneIndex > 0 ? (
        <div className="space-y-2">
          <Label htmlFor="scene-transition">Transition in</Label>
          <Select
            value={scene.transition}
            onValueChange={(value) => patch({ transition: value as VideoTransition })}
          >
            <SelectTrigger id="scene-transition" className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSITIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

export function VideoScenePhotoSettings({
  scene,
  propertyImages,
  onChange,
}: {
  scene: VideoScene;
  propertyImages: PropertyMediaItem[];
  onChange: SceneChangeHandler;
}) {
  const { patch } = useScenePatch(scene, onChange);

  return (
    <div className="space-y-2">
      <VideoPropertyImagePicker
        images={propertyImages}
        selectedUrl={scene.imageUrl}
        onSelect={(url) => {
          const item = propertyImages.find((entry) => entry.url === url);
          patch({
            imageUrl: url,
            backgroundMediaType: item?.type ?? inferBackgroundMediaType(url),
          });
        }}
      />
    </div>
  );
}

export function VideoSceneTextSettings({
  scene,
  onChange,
}: {
  scene: VideoScene;
  onChange: SceneChangeHandler;
}) {
  const { patchText } = useScenePatch(scene, onChange);

  const showPromoFields = scene.kind === 'promo' || scene.kind === 'slots';
  const showSlotsField = scene.kind === 'slots';
  const showCtaFields = scene.kind === 'cta' || scene.kind === 'slots' || scene.kind === 'promo';

  return (
    <div className="space-y-3">
      {(scene.kind === 'photo' || showPromoFields) && (
        <div className="space-y-2">
          <Label htmlFor="scene-headline">Headline</Label>
          <Input
            id="scene-headline"
            value={scene.texts.headline}
            onChange={(e) => patchText('headline', e.target.value)}
            className="h-10"
          />
        </div>
      )}

      {showPromoFields ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="scene-subheadline">Subheadline</Label>
            <Input
              id="scene-subheadline"
              value={scene.texts.subheadline}
              onChange={(e) => patchText('subheadline', e.target.value)}
              className="h-10"
            />
          </div>
          {scene.kind === 'promo' ? (
            <div className="space-y-2">
              <Label htmlFor="scene-promo">Promo line</Label>
              <Input
                id="scene-promo"
                value={scene.texts.promoLine}
                onChange={(e) => patchText('promoLine', e.target.value)}
                className="h-10"
              />
            </div>
          ) : null}
        </>
      ) : null}

      {showSlotsField ? (
        <div className="space-y-2">
          <Label htmlFor="scene-slots">Slots (one per line)</Label>
          <textarea
            id="scene-slots"
            value={scene.texts.slotLabels.join('\n')}
            onChange={(e) =>
              patchText(
                'slotLabels',
                e.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
              )
            }
            rows={4}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[88px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>
      ) : null}

      {showCtaFields ? (
        <div className="space-y-2">
          <Label htmlFor="scene-cta">CTA</Label>
          <Input
            id="scene-cta"
            value={scene.texts.ctaLine}
            onChange={(e) => patchText('ctaLine', e.target.value)}
            className="h-10"
          />
        </div>
      ) : null}

      {(scene.kind === 'cta' || scene.kind === 'promo' || scene.kind === 'slots') && (
        <div className="space-y-2">
          <Label htmlFor="scene-footer">Footer</Label>
          <Input
            id="scene-footer"
            value={scene.texts.rulesLine}
            onChange={(e) => patchText('rulesLine', e.target.value)}
            className="h-10"
          />
        </div>
      )}
    </div>
  );
}

/** @deprecated Use VideoEditorSettings sections instead */
export function VideoSceneSettings({
  scene,
  sceneIndex,
  propertyImages,
  onChange,
}: {
  scene: VideoScene;
  sceneIndex: number;
  propertyImages: PropertyMediaItem[];
  onChange: SceneChangeHandler;
}) {
  return (
    <div className="space-y-3">
      <VideoSceneMetaSettings scene={scene} sceneIndex={sceneIndex} onChange={onChange} />
      <VideoScenePhotoSettings scene={scene} propertyImages={propertyImages} onChange={onChange} />
      <VideoSceneTextSettings scene={scene} onChange={onChange} />
    </div>
  );
}
