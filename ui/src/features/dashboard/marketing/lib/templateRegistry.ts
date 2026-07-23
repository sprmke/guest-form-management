export type DesignTemplateFormat = 'instagram-post' | 'instagram-story' | 'facebook-post';

export type DesignPlaceholder =
  'propertyName' | 'propertyPhoto' | 'nightlyRate' | 'availabilityText';

export type DesignTemplateElement = {
  type: 'rect' | 'text' | 'image';
  left: number;
  top: number;
  width: number;
  height: number;
  fill?: string;
  text?: string;
  placeholder?: DesignPlaceholder;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  opacity?: number;
  rx?: number;
};

export type DesignTemplate = {
  id: string;
  name: string;
  format: DesignTemplateFormat;
  width: number;
  height: number;
  background: string;
  elements: DesignTemplateElement[];
};

export const DESIGN_FORMAT_DIMENSIONS: Record<
  DesignTemplateFormat,
  { width: number; height: number; label: string }
> = {
  'instagram-post': { width: 1080, height: 1080, label: 'Instagram Post' },
  'instagram-story': { width: 1080, height: 1920, label: 'Instagram Story' },
  'facebook-post': { width: 1200, height: 630, label: 'Facebook Post' },
};

const PALETTES = [
  { bg: '#0f172a', accent: '#06b6d4', text: '#f8fafc' },
  { bg: '#1e1b4b', accent: '#a78bfa', text: '#ede9fe' },
  { bg: '#14532d', accent: '#4ade80', text: '#ecfdf5' },
  { bg: '#7c2d12', accent: '#fb923c', text: '#fff7ed' },
  { bg: '#831843', accent: '#f472b6', text: '#fdf2f8' },
  { bg: '#164e63', accent: '#22d3ee', text: '#ecfeff' },
  { bg: '#312e81', accent: '#818cf8', text: '#eef2ff' },
  { bg: '#3f3f46', accent: '#facc15', text: '#fafafa' },
];

function photoElement(format: DesignTemplateFormat): DesignTemplateElement {
  const dims = DESIGN_FORMAT_DIMENSIONS[format];
  const isStory = format === 'instagram-story';
  const isFb = format === 'facebook-post';

  if (isStory) {
    return {
      type: 'image',
      left: 0,
      top: 0,
      width: dims.width,
      height: Math.round(dims.height * 0.62),
      placeholder: 'propertyPhoto',
    };
  }

  if (isFb) {
    return {
      type: 'image',
      left: dims.width - 520,
      top: 0,
      width: 520,
      height: dims.height,
      placeholder: 'propertyPhoto',
    };
  }

  return {
    type: 'image',
    left: 0,
    top: 0,
    width: dims.width,
    height: Math.round(dims.height * 0.55),
    placeholder: 'propertyPhoto',
  };
}

function buildTemplate(
  id: string,
  name: string,
  format: DesignTemplateFormat,
  paletteIndex: number,
  variant: 'minimal' | 'bold' | 'split'
): DesignTemplate {
  const palette = PALETTES[paletteIndex % PALETTES.length]!;
  const dims = DESIGN_FORMAT_DIMENSIONS[format];
  const isStory = format === 'instagram-story';
  const isFb = format === 'facebook-post';

  const elements: DesignTemplateElement[] = [photoElement(format)];

  const overlayTop = isStory
    ? Math.round(dims.height * 0.52)
    : isFb
      ? 0
      : Math.round(dims.height * 0.45);
  const overlayHeight = isStory
    ? dims.height - overlayTop
    : isFb
      ? dims.height
      : dims.height - overlayTop;

  if (variant !== 'split' || isFb) {
    elements.push({
      type: 'rect',
      left: 0,
      top: overlayTop,
      width: isFb ? dims.width - 520 : dims.width,
      height: overlayHeight,
      fill: palette.bg,
      opacity: isFb ? 0.92 : 0.88,
    });
  }

  const textLeft = isFb ? 48 : 64;
  const textWidth = isFb ? dims.width - 600 : dims.width - 128;
  const nameTop = isStory ? overlayTop + 80 : isFb ? 120 : overlayTop + 48;

  elements.push(
    {
      type: 'text',
      left: textLeft,
      top: nameTop,
      width: textWidth,
      height: 120,
      placeholder: 'propertyName',
      fontSize: isStory ? 56 : isFb ? 44 : 48,
      fontWeight: 700,
      color: palette.text,
      textAlign: 'left',
    },
    {
      type: 'text',
      left: textLeft,
      top: nameTop + (isStory ? 100 : 72),
      width: textWidth,
      height: 80,
      placeholder: 'nightlyRate',
      fontSize: isStory ? 36 : 28,
      fontWeight: 600,
      color: palette.accent,
      textAlign: 'left',
    },
    {
      type: 'text',
      left: textLeft,
      top: nameTop + (isStory ? 170 : 120),
      width: textWidth,
      height: 64,
      placeholder: 'availabilityText',
      fontSize: isStory ? 28 : 22,
      fontWeight: 500,
      color: palette.text,
      textAlign: 'left',
      opacity: 0.9,
    }
  );

  if (variant === 'bold') {
    elements.push({
      type: 'rect',
      left: textLeft,
      top: nameTop - 24,
      width: 120,
      height: 8,
      fill: palette.accent,
      rx: 4,
    });
  }

  return {
    id,
    name,
    format,
    width: dims.width,
    height: dims.height,
    background: palette.bg,
    elements,
  };
}

const FORMATS: DesignTemplateFormat[] = ['instagram-post', 'instagram-story', 'facebook-post'];
const VARIANTS: Array<'minimal' | 'bold' | 'split'> = ['minimal', 'bold', 'split'];
const NAMES = [
  'Coastal Calm',
  'Urban Nights',
  'Forest Retreat',
  'Sunset Glow',
  'Rose Garden',
  'Arctic Breeze',
  'Indigo Suite',
  'Golden Hour',
  'Lagoon',
  'Midnight',
];

function generateTemplates(): DesignTemplate[] {
  const templates: DesignTemplate[] = [];

  for (const format of FORMATS) {
    for (let i = 0; i < 8; i++) {
      const variant = VARIANTS[i % VARIANTS.length]!;
      const name = NAMES[i % NAMES.length]!;
      const formatLabel = DESIGN_FORMAT_DIMENSIONS[format].label.split(' ')[0];
      templates.push(
        buildTemplate(`${format}-${variant}-${i}`, `${name} ${formatLabel}`, format, i, variant)
      );
    }
  }

  return templates;
}

export const DESIGN_TEMPLATES: DesignTemplate[] = generateTemplates();

export function templatesForFormat(format: DesignTemplateFormat): DesignTemplate[] {
  return DESIGN_TEMPLATES.filter((t) => t.format === format);
}

export function getDesignTemplate(id: string): DesignTemplate | undefined {
  return DESIGN_TEMPLATES.find((t) => t.id === id);
}
