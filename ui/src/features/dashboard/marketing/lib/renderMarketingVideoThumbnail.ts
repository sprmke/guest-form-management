import { renderStillOnWeb } from '@remotion/web-renderer';

import { CampaignVideoComposition } from '@/features/dashboard/marketing/components/video-editor/VideoCompositions';
import type { DesignBinding } from '@/features/dashboard/marketing/lib/designCanvasTypes';
import { blobToDataUrl } from '@/features/dashboard/marketing/lib/exportVideoMedia';
import { resolveMarketingThumbBinding } from '@/features/dashboard/marketing/lib/marketingDefaultBinding';
import { VIDEO_FORMAT_DIMENSIONS } from '@/features/dashboard/marketing/lib/video/videoFormatDimensions';
import { buildDefaultVideoProject } from '@/features/dashboard/marketing/lib/video/videoProjectDefaults';
import type {
  VideoFormat,
  VideoProject,
} from '@/features/dashboard/marketing/lib/video/videoProjectTypes';
import {
  sceneDurationInFrames,
  sceneStartFrame,
  videoProjectDurationInFrames,
} from '@/features/dashboard/marketing/lib/video/videoProjectUtils';
import {
  getVideoCampaignTemplate,
  type VideoCampaignTemplateDef,
} from '@/features/dashboard/marketing/lib/videoCampaignTemplates';
import { runVideoThumbnailCapture } from '@/features/dashboard/marketing/lib/videoThumbnailCapture';

const THUMB_SCALE = 0.16;

function categoryForTemplate(template: VideoCampaignTemplateDef | undefined) {
  return template?.category ?? 'soft-stay';
}

async function preloadProjectImages(project: VideoProject): Promise<void> {
  const urls = [
    ...new Set(project.scenes.map((scene) => scene.imageUrl).filter(Boolean)),
  ] as string[];
  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  );
}

function thumbnailFrameForProject(project: VideoProject): number {
  const durationInFrames = videoProjectDurationInFrames(project);
  const sceneIndex = 0;
  const scene = project.scenes[sceneIndex];
  if (!scene) return 0;

  const start = sceneStartFrame(project, sceneIndex);
  const sceneFrames = sceneDurationInFrames(scene, project.fps);
  // Early in the first clip — after enter animation, still on scene 1.
  const minOffset = Math.max(1, Math.ceil(project.fps / 5));
  const frameInScene = Math.min(
    Math.max(Math.floor(sceneFrames * 0.2), minOffset),
    Math.max(sceneFrames - 1, 0)
  );
  return Math.min(start + frameInScene, Math.max(durationInFrames - 1, 0));
}

export async function renderVideoPresetThumbnail(
  templateId: string,
  format: VideoFormat,
  binding: DesignBinding,
  brandColor?: string
): Promise<string | null> {
  const template = getVideoCampaignTemplate(templateId);
  const project = buildDefaultVideoProject(
    templateId,
    categoryForTemplate(template),
    resolveMarketingThumbBinding(binding),
    format
  );
  return renderVideoProjectThumbnail(project, brandColor);
}

export async function renderVideoProjectThumbnail(
  project: VideoProject,
  brandColor?: string
): Promise<string | null> {
  if (typeof document !== 'undefined' && document.hidden) {
    return null;
  }

  return runVideoThumbnailCapture(async () => {
    const dims = VIDEO_FORMAT_DIMENSIONS[project.format];
    const durationInFrames = videoProjectDurationInFrames(project);
    const frame = thumbnailFrameForProject(project);

    try {
      await Promise.race([
        document.fonts.ready,
        new Promise<void>((resolve) => window.setTimeout(resolve, 400)),
      ]);
      await preloadProjectImages(project);

      // Stills don't need audio — skip Jamendo CDN URLs (CORS) entirely.
      const stillProps = {
        project: {
          ...project,
          music: project.music ? { ...project.music, url: null } : project.music,
        },
        brandColor,
        previewMuted: true,
      };

      const result = await renderStillOnWeb({
        composition: {
          id: project.templateId,
          component: CampaignVideoComposition,
          width: dims.width,
          height: dims.height,
          fps: project.fps,
          durationInFrames,
          defaultProps: stillProps,
        },
        inputProps: stillProps,
        frame,
        scale: THUMB_SCALE,
      });

      const blob = await result.blob({ format: 'jpeg', quality: 0.78 });
      if (!blob || blob.size < 64) return null;
      return blobToDataUrl(blob);
    } catch {
      return null;
    }
  });
}
