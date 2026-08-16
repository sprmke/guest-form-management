import '@/features/dashboard/marketing/lib/polotno/configurePolotnoOverlays';

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';

import { Popover, Tooltip } from '@blueprintjs/core';
import { RaeditorContainer, SidePanelWrap, WorkspaceWrap } from 'openpolotno';
import Workspace from 'openpolotno/canvas/workspace';
import SidePanel from 'openpolotno/side-panel/side-panel';
import Toolbar from 'openpolotno/toolbar/toolbar';
import ZoomButtons from 'openpolotno/toolbar/zoom-buttons';

import {
  createElementsSection,
  createLayersSection,
} from '@/features/dashboard/marketing/components/design-editor/polotno/KameBuiltinPanels';
import { KamePolotnoToolbarHistory } from '@/features/dashboard/marketing/components/design-editor/polotno/KamePolotnoToolbarHistory';
import { KameSidePanelCollapse } from '@/features/dashboard/marketing/components/design-editor/polotno/KameSidePanelCollapse';
import { createTextSection } from '@/features/dashboard/marketing/components/design-editor/polotno/KameTextPanel';
import {
  createBackgroundSection,
  createUploadSection,
} from '@/features/dashboard/marketing/components/design-editor/polotno/PropertyMediaPanels';
import { usePolotnoOverlayAnchor } from '@/features/dashboard/marketing/components/design-editor/polotno/usePolotnoOverlayAnchor';
import { usePolotnoOverlayDebug } from '@/features/dashboard/marketing/components/design-editor/polotno/usePolotnoOverlayDebug';
import { usePolotnoSessionMedia } from '@/features/dashboard/marketing/components/design-editor/polotno/usePolotnoSessionMedia';
import type { PolotnoStore } from '@/features/dashboard/marketing/lib/polotno/polotnoStore';
import { polotnoWorkspaceChrome } from '@/features/dashboard/marketing/lib/polotno/polotnoWorkspaceTheme';
import { propertyMediaItems } from '@/features/dashboard/marketing/lib/polotno/propertyMedia';

import { useTheme } from '@/components/theme/ThemeProvider';

type Props = {
  store: PolotnoStore;
  propertyImageUrls: string[];
  brandColor: string;
  logoUrl?: string | null;
  style?: CSSProperties;
  onResetDesign?: () => void;
  resetDisabled?: boolean;
};

export function KamePolotnoEditor({
  store,
  propertyImageUrls,
  brandColor,
  logoUrl = null,
  style,
  onResetDesign,
  resetDisabled = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const workspaceChrome = useMemo(
    () => polotnoWorkspaceChrome(resolvedTheme === 'dark'),
    [resolvedTheme]
  );
  usePolotnoOverlayAnchor(rootRef);
  usePolotnoOverlayDebug(rootRef);

  useEffect(() => {
    const portal = portalRef.current;
    if (!portal) return;

    const popoverDefaults = Popover.defaultProps ?? {};
    const tooltipDefaults = Tooltip.defaultProps ?? {};

    Popover.defaultProps = {
      ...popoverDefaults,
      portalContainer: portal,
    };
    Tooltip.defaultProps = {
      ...tooltipDefaults,
      portalContainer: portal,
    };

    return () => {
      Popover.defaultProps = popoverDefaults;
      Tooltip.defaultProps = tooltipDefaults;
    };
  }, []);

  const propertyImages = useMemo(() => propertyMediaItems(propertyImageUrls), [propertyImageUrls]);
  const sessionMedia = usePolotnoSessionMedia();

  const sections = useMemo(
    () => [
      createTextSection(),
      createElementsSection(logoUrl),
      createUploadSection(propertyImages, sessionMedia),
      createBackgroundSection(propertyImages, brandColor, sessionMedia),
      createLayersSection(),
    ],
    [
      propertyImages,
      brandColor,
      logoUrl,
      sessionMedia.sessionUploads,
      sessionMedia.isUploading,
      sessionMedia.appendFiles,
    ]
  );

  const toolbarComponents = useMemo(
    () => ({
      ActionControls: null,
      History: (props: { store: PolotnoStore }) => (
        <KamePolotnoToolbarHistory
          store={props.store}
          onReset={onResetDesign}
          resetDisabled={resetDisabled}
        />
      ),
    }),
    [onResetDesign, resetDisabled]
  );

  return (
    <div ref={rootRef} className="kame-polotno-shell relative min-h-0 flex-1">
      <div ref={portalRef} className="kame-polotno-portal" aria-hidden />
      <RaeditorContainer className="raeditor-app-container kame-polotno-editor" style={style}>
        <SidePanelWrap className="kame-side-panel-wrap" data-tour="side-panel">
          <SidePanel store={store as never} sections={sections as never} defaultSection="" />
          <KameSidePanelCollapse store={store} />
        </SidePanelWrap>
        <WorkspaceWrap data-tour="canvas">
          <Toolbar
            store={store as never}
            downloadButtonEnabled={false}
            components={toolbarComponents as never}
          />
          <Workspace store={store as never} {...workspaceChrome} />
          <ZoomButtons store={store as never} />
        </WorkspaceWrap>
      </RaeditorContainer>
    </div>
  );
}
