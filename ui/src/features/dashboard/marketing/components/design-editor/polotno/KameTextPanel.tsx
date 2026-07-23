import { useEffect } from 'react';

import { observer } from 'mobx-react-lite';

import {
  KameSidePanelGroup,
  KameSidePanelShell,
} from '@/features/dashboard/marketing/components/design-editor/polotno/KameSidePanelShell';
import type { PolotnoStore } from '@/features/dashboard/marketing/lib/polotno/polotnoStore';

import { cn } from '@/lib/utils';

import { SectionTab } from 'openpolotno/side-panel/side-panel';
import { Icon } from '@blueprintjs/core';
import { NewTextBox } from '@blueprintjs/icons';

type TextPreset = {
  id: string;
  preview: string;
  text: string;
  fontSize: number;
  previewClassName: string;
};

const TEXT_PRESETS: TextPreset[] = [
  {
    id: 'heading',
    preview: 'Heading',
    text: 'Heading',
    fontSize: 76,
    previewClassName: 'text-xl font-bold',
  },
  {
    id: 'subheading',
    preview: 'Subheading',
    text: 'Subheading',
    fontSize: 44,
    previewClassName: 'text-base font-semibold',
  },
  {
    id: 'body',
    preview: 'Body text',
    text: 'Body text',
    fontSize: 28,
    previewClassName: 'text-sm font-normal',
  },
];

function addTextToCanvas(
  store: PolotnoStore,
  attrs: { fontSize: number; text: string; fontFamily?: string }
) {
  const page = store.activePage as
    | {
        addElement: (el: Record<string, unknown>) => { toggleEditMode?: (on: boolean) => void };
      }
    | undefined;
  if (!page) return;

  const width = store.width / 2;
  const scale = (store.width + store.height) / 2160;
  const fontSize = attrs.fontSize * scale;
  const x = store.width / 2 - width / 2;
  const y = store.height / 2 - fontSize / 2;

  const el = page.addElement({
    type: 'text',
    fontFamily: attrs.fontFamily ?? 'Roboto',
    text: attrs.text,
    fontSize,
    width,
    x,
    y,
  });
  el.toggleEditMode?.(true);
}

export const KameTextPanel = observer(function KameTextPanel({ store }: { store: PolotnoStore }) {
  useEffect(() => {
    store.loadFont?.('Roboto');
  }, [store]);

  return (
    <KameSidePanelShell title="Text">
      <KameSidePanelGroup label="Add text">
        <div className="space-y-2">
          {TEXT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={cn(
                'border-border bg-background hover:bg-muted',
                'flex min-h-[48px] w-full items-center rounded-lg border px-3 text-left transition-colors'
              )}
              onClick={() =>
                addTextToCanvas(store, {
                  fontSize: preset.fontSize,
                  text: preset.text,
                })
              }
            >
              <span className={cn('text-foreground truncate', preset.previewClassName)}>
                {preset.preview}
              </span>
            </button>
          ))}
        </div>
      </KameSidePanelGroup>
    </KameSidePanelShell>
  );
});

export function createTextSection() {
  return {
    name: 'text',
    Tab: observer(function TextTab(props: Record<string, unknown>) {
      return (
        <SectionTab name="Text" iconSize={16} {...props}>
          <Icon icon={<NewTextBox />} />
        </SectionTab>
      );
    }),
    Panel: observer(function TextPanelWrapper({ store }: { store: PolotnoStore }) {
      return <KameTextPanel store={store} />;
    }),
  };
}
