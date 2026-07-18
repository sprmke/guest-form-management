declare module 'openpolotno' {
  import type { CSSProperties } from 'react';

  export type PolotnoStore = {
    addPage: () => void;
    history: { clear: () => void; undo: () => void; redo: () => void };
    loadJSON: (json: unknown) => void;
    toJSON: () => Record<string, unknown>;
    openSidePanel: (name: string) => void;
    waitLoading: (opts?: { _skipTimeout?: boolean }) => Promise<void>;
    toBlob: (opts?: {
      mimeType?: string;
      pixelRatio?: number;
      quality?: number;
    }) => Promise<Blob | null>;
  };

  export function RaeditorApp(props: {
    store: PolotnoStore;
    sections?: string[];
    style?: CSSProperties;
  }): JSX.Element;

  export const RaeditorContainer: React.ComponentType<React.HTMLAttributes<HTMLDivElement>>;
}

declare module 'openpolotno/model/store' {
  export function createStore(opts?: {
    key?: string;
    showCredit?: boolean;
  }): import('openpolotno').PolotnoStore;
}

declare module 'openpolotno/side-panel/side-panel' {
  import type { ComponentType, ReactNode } from 'react';

  export type PolotnoSection = {
    name: string;
    Tab: ComponentType<Record<string, unknown>>;
    Panel: ComponentType<{ store: unknown }>;
    visibleInList?: boolean;
  };

  export const TextSection: PolotnoSection;
  export const ElementsSection: PolotnoSection;
  export const LayersSection: PolotnoSection;
  export const SizeSection: PolotnoSection;
  export const SectionTab: ComponentType<{
    name: string;
    children?: ReactNode;
    onClick?: () => void;
    active?: boolean;
    iconSize?: number;
  }>;
  export const ImagesGrid: ComponentType<Record<string, unknown>>;
  export default function SidePanel(props: {
    store: unknown;
    sections: PolotnoSection[];
    defaultSection?: string;
  }): JSX.Element;
}

declare module 'openpolotno/side-panel/elements-panel' {
  import type { ComponentType } from 'react';

  export const NounprojectPanel: ComponentType<{ store: unknown; query: string }>;
}

declare module 'openpolotno/utils/figure-to-svg' {
  export const TYPES: Record<string, unknown>;
  export function figureToSvg(element: Record<string, unknown>): string;
}

declare module 'openpolotno/utils/svg' {
  export function svgToURL(svg: string): string;
}

declare module 'openpolotno/side-panel/select-image' {
  export function selectImage(args: {
    src: string;
    store: unknown;
    droppedPos?: { x: number; y: number };
    targetElement?: unknown;
  }): Promise<void>;
}

declare module 'openpolotno/toolbar/toolbar' {
  import type { ComponentType } from 'react';

  export default function Toolbar(props: {
    store: unknown;
    downloadButtonEnabled?: boolean;
    components?: { ActionControls?: ComponentType<{ store: unknown }> | null };
  }): JSX.Element;
}

declare module 'openpolotno/toolbar/zoom-buttons' {
  export default function ZoomButtons(props: { store: unknown }): JSX.Element;
}

declare module 'openpolotno/canvas/workspace' {
  export default function Workspace(props: { store: unknown }): JSX.Element;
}

declare module 'openpolotno/config' {
  export function setUploadFunc(
    fn: (file: File, attrs?: Record<string, unknown>) => Promise<string>
  ): void;
}
