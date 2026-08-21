import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type {
  StayGuideChapterConfig,
  StayGuideSectionConfig,
} from '@/features/guest/stay-guide/lib/api';
import { defaultStayGuideSectionConfig } from '@/features/guest/stay-guide/lib/stayGuideChapters';

const HISTORY_LIMIT = 50;

type StayGuideEditorState = {
  config: StayGuideSectionConfig;
  history: StayGuideSectionConfig[];
  historyIndex: number;
  isDirty: boolean;
  hydrated: boolean;
};

type StayGuideEditorActions = {
  hydrate: (config: StayGuideSectionConfig) => void;
  reset: () => void;
  setSectionVisible: (
    key: Exclude<keyof StayGuideSectionConfig, 'version' | 'chapters'>,
    visible: boolean
  ) => void;
  setChapterVisible: (id: StayGuideChapterConfig['id'], visible: boolean) => void;
  reorderChapters: (orderedIds: StayGuideChapterConfig['id'][]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  markClean: () => void;
};

function cloneConfig(config: StayGuideSectionConfig): StayGuideSectionConfig {
  return JSON.parse(JSON.stringify(config)) as StayGuideSectionConfig;
}

function pushHistory(state: StayGuideEditorState) {
  const next = state.history.slice(0, state.historyIndex + 1);
  next.push(cloneConfig(state.config));
  if (next.length > HISTORY_LIMIT) next.shift();
  state.history = next;
  state.historyIndex = next.length - 1;
}

export const useStayGuideEditorStore = create<StayGuideEditorState & StayGuideEditorActions>()(
  immer((set, get) => ({
    config: defaultStayGuideSectionConfig(),
    history: [defaultStayGuideSectionConfig()],
    historyIndex: 0,
    isDirty: false,
    hydrated: false,

    hydrate: (config) =>
      set((state) => {
        const next = cloneConfig(config);
        state.config = next;
        state.history = [cloneConfig(next)];
        state.historyIndex = 0;
        state.isDirty = false;
        state.hydrated = true;
      }),

    reset: () =>
      set((state) => {
        const next = defaultStayGuideSectionConfig();
        state.config = next;
        state.history = [cloneConfig(next)];
        state.historyIndex = 0;
        state.isDirty = false;
        state.hydrated = false;
      }),

    setSectionVisible: (key, visible) =>
      set((state) => {
        state.config[key].visible = visible;
        state.isDirty = true;
        pushHistory(state);
      }),

    setChapterVisible: (id, visible) =>
      set((state) => {
        const chapter = state.config.chapters.find((entry) => entry.id === id);
        if (!chapter) return;
        chapter.visible = visible;
        state.isDirty = true;
        pushHistory(state);
      }),

    reorderChapters: (orderedIds) =>
      set((state) => {
        const byId = new Map(state.config.chapters.map((chapter) => [chapter.id, chapter]));
        const next: StayGuideChapterConfig[] = [];
        for (const id of orderedIds) {
          const chapter = byId.get(id);
          if (chapter) next.push(chapter);
        }
        for (const chapter of state.config.chapters) {
          if (!orderedIds.includes(chapter.id)) next.push(chapter);
        }
        next.forEach((chapter, order) => {
          chapter.order = order;
        });
        state.config.chapters = next;
        state.isDirty = true;
        pushHistory(state);
      }),

    undo: () =>
      set((state) => {
        if (state.historyIndex <= 0) return;
        state.historyIndex -= 1;
        const previous = state.history[state.historyIndex];
        if (previous) {
          state.config = cloneConfig(previous);
          state.isDirty = true;
        }
      }),

    redo: () =>
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) return;
        state.historyIndex += 1;
        const next = state.history[state.historyIndex];
        if (next) {
          state.config = cloneConfig(next);
          state.isDirty = true;
        }
      }),

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    markClean: () =>
      set((state) => {
        state.isDirty = false;
      }),
  }))
);
