import path from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import {
  buildScopedPolotnoBlueprintCss,
  isBlueprintSourceStylesheet,
  isPolotnoBlueprintEntry,
  POLOTNO_BLUEPRINT_ENTRY,
  scopeBlueprintCss,
} from './postcss.config.js';
import {
  patchOpenPolotnoHighlighter,
  openPolotnoHighlighterEsbuildPlugin,
} from './vite-plugins/patchOpenPolotnoHighlighter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const reactRoot = path.resolve(__dirname, '../node_modules/react');
const reactDomRoot = path.resolve(__dirname, '../node_modules/react-dom');
const blueprintCoreRoot = path.resolve(__dirname, '../node_modules/@blueprintjs/core');
const blueprintIconsRoot = path.resolve(__dirname, '../node_modules/@blueprintjs/icons');
const reactPopperRoot = path.resolve(__dirname, '../node_modules/react-popper');
const popperCoreRoot = path.resolve(__dirname, '../node_modules/@popperjs/core');
const useSyncExternalStoreShimRoot = path.resolve(
  __dirname,
  './src/lib/shims/use-sync-external-store/shim'
);
const classnamesShim = path.resolve(__dirname, './src/lib/shims/classnames.ts');

let scopedPolotnoBlueprintCache: string | null = null;

async function getScopedPolotnoBlueprintCss() {
  if (!scopedPolotnoBlueprintCache) {
    scopedPolotnoBlueprintCache = await buildScopedPolotnoBlueprintCss();
  }
  return scopedPolotnoBlueprintCache;
}

/**
 * Vite resolves @import before PostCSS can inline + scope Blueprint.
 * Provide fully scoped CSS from the entry file and block raw Blueprint sources.
 */
function scopeBlueprintCssPlugin(): Plugin {
  return {
    name: 'scope-blueprint-css',
    enforce: 'pre',
    async load(id) {
      const normalized = id.replace(/\\/g, '/');
      if (normalized.split('?')[0] === POLOTNO_BLUEPRINT_ENTRY.replace(/\\/g, '/')) {
        return await getScopedPolotnoBlueprintCss();
      }
      return null;
    },
    async transform(code, id) {
      if (!id.endsWith('.css')) return null;

      if (isPolotnoBlueprintEntry(id)) {
        return {
          code: await getScopedPolotnoBlueprintCss(),
          map: null,
        };
      }

      if (isBlueprintSourceStylesheet(id)) {
        return {
          code: await scopeBlueprintCss(code, id),
          map: null,
        };
      }

      return null;
    },
    configureServer(server) {
      server.watcher.on('change', (file) => {
        if (isPolotnoBlueprintEntry(file) || isBlueprintSourceStylesheet(file)) {
          scopedPolotnoBlueprintCache = null;
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [patchOpenPolotnoHighlighter(), scopeBlueprintCssPlugin(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: reactRoot,
      'react-dom': reactDomRoot,
      'react/jsx-runtime': path.join(reactRoot, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.join(reactRoot, 'jsx-dev-runtime.js'),
      '@blueprintjs/core': blueprintCoreRoot,
      '@blueprintjs/icons': blueprintIconsRoot,
      '@blueprintjs/select': path.resolve(__dirname, '../node_modules/@blueprintjs/select'),
      'react-popper': reactPopperRoot,
      '@popperjs/core': popperCoreRoot,
      classnames: classnamesShim,
      'use-sync-external-store/shim/index.js': path.join(useSyncExternalStoreShimRoot, 'index.ts'),
      'use-sync-external-store/shim/with-selector.js': path.join(
        useSyncExternalStoreShimRoot,
        'with-selector.ts'
      ),
      'use-sync-external-store/shim/with-selector': path.join(
        useSyncExternalStoreShimRoot,
        'with-selector.ts'
      ),
      'use-sync-external-store/shim': path.join(useSyncExternalStoreShimRoot, 'index.ts'),
    },
    dedupe: [
      'react',
      'react-dom',
      'react-konva',
      'konva',
      '@blueprintjs/core',
      '@blueprintjs/icons',
      '@blueprintjs/select',
      'react-popper',
      '@popperjs/core',
      'classnames',
      'use-sync-external-store',
    ],
  },
  css: {
    postcss: './postcss.config.js',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'openpolotno',
      '@blueprintjs/core',
      '@blueprintjs/icons',
      '@blueprintjs/select',
      'react-popper',
      '@popperjs/core',
      'classnames',
      'mobx',
      'mobx-react-lite',
      'mobx-state-tree',
      'konva',
      'react-konva',
      'react-konva-utils',
      'use-image',
      'swr',
      '@tiptap/react',
    ],
    esbuildOptions: {
      plugins: [openPolotnoHighlighterEsbuildPlugin()],
      alias: {
        react: reactRoot,
        'react-dom': reactDomRoot,
        classnames: classnamesShim,
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
