import { OPTIMIZE_PRESETS, type OptimizePreset } from '@/lib/media/imageOptimizationPlan';

function optimizationDisabled(): boolean {
  return import.meta.env.VITE_DISABLE_IMAGE_OPTIMIZATION === '1';
}

function isImageFile(file: File): boolean {
  const mime = (file.type || '').trim().toLowerCase();
  if (mime.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|bmp|tiff?|avif|heic|heif)$/i.test(file.name);
}

function isPassThroughImage(file: File): boolean {
  const mime = (file.type || '').trim().toLowerCase();
  const name = file.name.toLowerCase();
  if (mime === 'image/svg+xml' || name.endsWith('.svg')) return true;
  if (mime === 'image/gif' || name.endsWith('.gif')) return true;
  if (mime === 'image/heic' || mime === 'image/heif' || /\.(heic|heif)$/.test(name)) return true;
  return false;
}

function replaceExtension(name: string, nextExt: string): string {
  return `${name.replace(/\.[^.]+$/, '')}.${nextExt}`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('undecodable'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
      type,
      quality
    );
  });
}

/**
 * Re-encode / downscale an image. Never upscales, never returns a larger file,
 * never throws — failures fall back to the original.
 */
export async function prepareImageForUpload(file: File, preset: OptimizePreset): Promise<File> {
  if (
    optimizationDisabled() ||
    preset === 'NONE' ||
    !isImageFile(file) ||
    isPassThroughImage(file)
  ) {
    return file;
  }

  const plan = OPTIMIZE_PRESETS[preset];
  if (!plan.maxLongEdge) return file;

  try {
    const image = await loadImage(file);
    const longEdge = Math.max(image.width, image.height);
    const scale = longEdge > plan.maxLongEdge ? plan.maxLongEdge / longEdge : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, width, height);

    const preferWebp = plan.preferWebp && file.type !== 'image/png';
    const fileType = preferWebp
      ? 'image/webp'
      : plan.preserveAlphaAsPng && file.type === 'image/png'
        ? 'image/png'
        : file.type.startsWith('image/')
          ? file.type
          : 'image/jpeg';

    const blob = await canvasToBlob(canvas, fileType, plan.quality);
    if (blob.size >= file.size) return file;

    const nextExt = fileType === 'image/webp' ? 'webp' : fileType === 'image/png' ? 'png' : 'jpg';
    return new File([blob], replaceExtension(file.name, nextExt), {
      type: fileType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
