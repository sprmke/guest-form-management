import { figureToSvg, TYPES } from 'openpolotno/utils/figure-to-svg';
import { svgToURL } from 'openpolotno/utils/svg';

const DEFAULT_FILL = 'rgba(191, 191, 191, 100)';
const DEFAULT_STROKE = '#0c0c0c';

export type KamePolotnoShape = {
  subType: string;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius?: number;
  url: string;
  /** Drop size on canvas when set (preview thumb may differ). */
  canvasWidth?: number;
  canvasHeight?: number;
};

const MARKETING_SHAPES: Omit<KamePolotnoShape, 'url'>[] = [
  {
    subType: 'rect',
    width: 280,
    height: 88,
    cornerRadius: 44,
    fill: DEFAULT_FILL,
    stroke: DEFAULT_STROKE,
    strokeWidth: 0,
    canvasWidth: 480,
    canvasHeight: 96,
  },
  {
    subType: 'rect',
    width: 220,
    height: 120,
    cornerRadius: 20,
    fill: DEFAULT_FILL,
    stroke: DEFAULT_STROKE,
    strokeWidth: 0,
    canvasWidth: 320,
    canvasHeight: 160,
  },
];

const BASE_SHAPE = {
  width: 300,
  height: 300,
  fill: DEFAULT_FILL,
  stroke: DEFAULT_STROKE,
  strokeWidth: 0,
};

function withPreviewUrl(shape: Omit<KamePolotnoShape, 'url'>): KamePolotnoShape {
  return {
    ...shape,
    url: svgToURL(figureToSvg(shape)),
  };
}

export function buildKamePolotnoShapes(): KamePolotnoShape[] {
  const shapes: KamePolotnoShape[] = MARKETING_SHAPES.map(withPreviewUrl);

  for (const subType of Object.keys(TYPES)) {
    shapes.push(withPreviewUrl({ subType, ...BASE_SHAPE }));
  }

  return shapes;
}

export const KAME_POLOTNO_DEFAULT_SHAPE_FILL = DEFAULT_FILL;
