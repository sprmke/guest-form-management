import type { ComponentType } from 'react';

import { CommandCenterScene, PortfolioScene } from './SceneAct1';
import {
  BookingsBoardScene,
  BookingWorkflowScene,
  ChannelSyncScene,
  DataImportScene,
} from './SceneAct2';
import { FinanceScene, MaintenanceScene, PricingScene } from './SceneAct3';
import {
  AiReceptionistScene,
  GuestInboxScene,
  MarketingStudioScene,
  PublicPagesScene,
  TemplatesScene,
} from './SceneAct4';
import {
  AiAssistantScene,
  HelpSupportScene,
  NotificationsScene,
  PlansBillingScene,
  TeamScene,
} from './SceneAct5';

/** Ordered to match `hostTourChapters` in data/hostTourChapters.ts (index-aligned). */
export const filmScenes: ComponentType[] = [
  PortfolioScene,
  CommandCenterScene,
  BookingWorkflowScene,
  BookingsBoardScene,
  DataImportScene,
  ChannelSyncScene,
  PricingScene,
  FinanceScene,
  MaintenanceScene,
  GuestInboxScene,
  AiReceptionistScene,
  MarketingStudioScene,
  PublicPagesScene,
  TemplatesScene,
  TeamScene,
  NotificationsScene,
  PlansBillingScene,
  AiAssistantScene,
  HelpSupportScene,
];
