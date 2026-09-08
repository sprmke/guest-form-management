#!/bin/bash
set -euo pipefail

# Never commit a pre-existing staged index — only paths listed per batch.
git reset HEAD >/dev/null 2>&1 || true

git add -- 'supabase/functions/_shared/dashboardAssistantBlocks.ts' 'supabase/functions/dashboard-assistant-global-settings/index.ts' 'ui/src/features/dashboard/ai-assistant/components/AiAssistantPanel.tsx' 'ui/src/features/dashboard/ai-assistant/components/AssistantMessageCard.tsx' 'ui/src/features/dashboard/ai-assistant/components/ChatBlockRenderer.tsx' 'ui/src/features/dashboard/ai-assistant/components/ChatComposer.tsx' 'ui/src/features/dashboard/ai-assistant/components/ChatThread.tsx' 'ui/src/features/dashboard/ai-assistant/hooks/useAiAssistantChat.ts' 'ui/src/features/dashboard/ai-assistant/lib/chatBlockDisplay.ts' 'ui/src/features/dashboard/ai-assistant/lib/contextPickerRegistry.ts' 'ui/src/features/dashboard/ai-assistant/components/ChatContextPillSuggestions.tsx' 'ui/src/features/dashboard/ai-assistant/components/blocks/DynamicFormBlock.tsx'
git commit -m "api(supabase): add dashboard ai assistant services batch 1"
echo "OK: api(supabase): add dashboard ai assistant services batch 1 (12 files)"

git add -- 'supabase/.env.dev.example' 'supabase/.env.example' 'supabase/config.toml' 'supabase/functions/_shared/cors.ts' 'supabase/functions/_shared/notificationService.ts' 'supabase/functions/_shared/parkingBroadcastActions.ts' 'supabase/functions/_shared/parkingBroadcastExpireCron.ts' 'supabase/functions/_shared/planEntitlements.ts' 'supabase/functions/_shared/subscriptionOrchestrator.ts' 'supabase/functions/_shared/workflowOrchestrator.ts' 'supabase/functions/accept-org-invite/index.ts' 'supabase/functions/accept-parking-invite/index.ts'
git commit -m "api(supabase): sync shared services and edge function updates batch 1"
echo "OK: api(supabase): sync shared services and edge function updates batch 1 (12 files)"

git add -- 'supabase/functions/accept-property-invite/index.ts' 'supabase/functions/ai-platform-credit-wallet/index.ts' 'supabase/functions/ai-platform-global-settings/index.ts' 'supabase/functions/approval-email-webhook/index.ts' 'supabase/functions/approve-org-verification/index.ts' 'supabase/functions/cancel-booking/index.ts' 'supabase/functions/claim-parking-booking/index.ts' 'supabase/functions/create-organization/index.ts' 'supabase/functions/create-parking/index.ts' 'supabase/functions/create-property/index.ts' 'supabase/functions/decide-contract-consideration/index.ts' 'supabase/functions/decline-parking-booking/index.ts'
git commit -m "api(supabase): sync shared services and edge function updates batch 2"
echo "OK: api(supabase): sync shared services and edge function updates batch 2 (12 files)"

git add -- 'supabase/functions/delete-organization/index.ts' 'supabase/functions/delete-parking/index.ts' 'supabase/functions/delete-property/index.ts' 'supabase/functions/import-commit/index.ts' 'supabase/functions/import-revert/index.ts' 'supabase/functions/org-subscriptions-admin/index.ts' 'supabase/functions/org-team-members/index.ts' 'supabase/functions/parking-team-custom-roles/index.ts' 'supabase/functions/parking-team-invitations/index.ts' 'supabase/functions/parking-team-members/index.ts' 'supabase/functions/platform-payment-settings/index.ts' 'supabase/functions/platform-settings/index.ts'
git commit -m "api(supabase): sync shared services and edge function updates batch 3"
echo "OK: api(supabase): sync shared services and edge function updates batch 3 (12 files)"

git add -- 'supabase/functions/pricing-plans/index.ts' 'supabase/functions/property-team-custom-roles/index.ts' 'supabase/functions/property-team-invitations/index.ts' 'supabase/functions/property-team-members/index.ts' 'supabase/functions/sd-refund-cron/index.ts' 'supabase/functions/submit-form/index.ts' 'supabase/functions/submit-org-verification/index.ts' 'supabase/functions/submit-sd-form/index.ts' 'supabase/functions/transition-booking/index.ts' 'supabase/functions/transition-parking-booking/index.ts' 'supabase/functions/update-organization/index.ts' 'supabase/functions/update-parking/index.ts'
git commit -m "api(supabase): sync shared services and edge function updates batch 4"
echo "OK: api(supabase): sync shared services and edge function updates batch 4 (12 files)"

git add -- 'supabase/functions/update-property/index.ts' 'supabase/functions/_shared/activityLog.ts' 'supabase/functions/_shared/activityLog_test.ts' 'supabase/functions/_shared/hostVerificationReward.ts' 'supabase/functions/_shared/hostVerificationReward_test.ts' 'supabase/functions/_shared/parkingActivity.ts' 'supabase/functions/_shared/propertyAssetClone.ts' 'supabase/functions/_shared/propertySettingsClone.ts' 'supabase/functions/_shared/propertySettingsCloneGroups.ts' 'supabase/functions/_shared/propertySettingsCloneHelpers.ts' 'supabase/functions/_shared/propertySettingsClonePhase23.ts' 'supabase/functions/_shared/propertySettingsCloneRun.ts'
git commit -m "api(supabase): sync shared services and edge function updates batch 5"
echo "OK: api(supabase): sync shared services and edge function updates batch 5 (12 files)"

git add -- 'supabase/functions/_shared/propertySettingsCloneTypes.ts' 'supabase/functions/_shared/propertySettingsClone_test.ts' 'supabase/functions/_shared/propertySettingsCopyLogList.ts' 'supabase/functions/_shared/superAdminStepUpEmail.ts' 'supabase/functions/_shared/superAdminVerification.ts' 'supabase/functions/_shared/teamActivity.ts' 'supabase/functions/activity-log-export/index.ts' 'supabase/functions/copy-property-settings/index.ts' 'supabase/functions/get-host-reward-offer/index.ts' 'supabase/functions/list-activity-log/index.ts' 'supabase/functions/setup-guide-state/index.ts' 'supabase/functions/super-admin-verification/index.ts'
git commit -m "api(supabase): sync shared services and edge function updates batch 6"
echo "OK: api(supabase): sync shared services and edge function updates batch 6 (12 files)"

git add -- 'supabase/migrations/20261305140000_super_admin_verification_challenges.sql' 'supabase/migrations/20261306120000_property_settings_copy_log.sql' 'supabase/migrations/20261306120100_property_settings_copied_notification_type.sql' 'supabase/migrations/20261306130000_set_org_setup_guide_state_rpc.sql' 'supabase/migrations/20261306140000_host_verification_reward.sql' 'supabase/migrations/20261306150000_activity_log.sql' 'supabase/migrations/20261306150100_activity_log_guest_submissions_trigger.sql'
git commit -m "api(supabase): sync shared services and edge function updates"
echo "OK: api(supabase): sync shared services and edge function updates (7 files)"

git add -- 'ui/src/features/dashboard/announcements/components/AdminAnnouncementBanner.tsx' 'ui/src/features/dashboard/announcements/components/HostAnnouncementBannerStrip.tsx' 'ui/src/features/dashboard/announcements/components/HostAnnouncementCard.tsx' 'ui/src/features/dashboard/announcements/components/HostAnnouncementDetailCard.tsx' 'ui/src/features/dashboard/announcements/components/HostAnnouncementEditor.tsx' 'ui/src/features/dashboard/announcements/hooks/useHostAnnouncementBannerDismiss.ts' 'ui/src/features/dashboard/announcements/lib/hostAnnouncementBannerDismiss.ts' 'ui/src/features/dashboard/announcements/lib/hostAnnouncementDetail.ts' 'ui/src/features/dashboard/announcements/lib/hostAnnouncementSchedule.ts' 'ui/src/features/dashboard/announcements/lib/hostAnnouncementTypes.ts' 'ui/src/features/dashboard/announcements/components/HostAnnouncementAdminList.tsx' 'ui/src/features/dashboard/announcements/components/HostAnnouncementFormFields.tsx'
git commit -m "ui(org): add host announcements dashboard module"
echo "OK: ui(org): add host announcements dashboard module (12 files)"

git add -- 'ui/src/features/dashboard/marketing/components/calendar-builder/components/CalendarBuilder.tsx' 'ui/src/features/dashboard/marketing/components/design-editor/PolotnoDesignStudio.tsx' 'ui/src/features/dashboard/marketing/components/design-editor/polotno/usePolotnoOverlayDebug.ts' 'ui/src/features/dashboard/marketing/components/publishing/PublishDialog.tsx' 'ui/src/features/dashboard/marketing/components/shared/MarketingNameDialog.tsx' 'ui/src/features/dashboard/marketing/components/shared/SaveMarketingTemplateButton.tsx' 'ui/src/features/dashboard/marketing/components/video-editor/VideoEditor.tsx' 'ui/src/features/dashboard/marketing/lib/calendarPresets.ts' 'ui/src/features/dashboard/marketing/lib/marketingBookedDates.ts' 'ui/src/features/dashboard/marketing/lib/marketingReviewDesignSeed.ts' 'ui/src/features/dashboard/marketing/lib/polotno/polotnoCampaignDocuments.ts' 'ui/src/features/dashboard/marketing/lib/videoCampaignTemplates.ts'
git commit -m "ui(org): sync marketing studio design and video editor"
echo "OK: ui(org): sync marketing studio design and video editor (12 files)"

git add -- 'ui/src/features/dashboard/notifications/lib/notificationsApi.ts' 'ui/src/features/dashboard/notifications/lib/notificationsDisplay.ts' 'ui/src/features/dashboard/org/components/RequireOrgContext.tsx' 'ui/src/features/dashboard/org/components/RequireParkingContext.tsx' 'ui/src/features/dashboard/org/components/org-properties/OrgPropertyCard.tsx' 'ui/src/features/dashboard/org/components/property-settings/PropertyAmenitiesManageDialog.tsx' 'ui/src/features/dashboard/org/components/property-settings/PropertyHouseRulesManageDialog.tsx' 'ui/src/features/dashboard/org/components/property-settings/PropertyLocationSettingsBlock.tsx' 'ui/src/features/dashboard/org/components/property-settings/PropertyOperationalSettingsSections.tsx' 'ui/src/features/dashboard/org/components/property-settings/PropertyProfileSettingsSections.tsx' 'ui/src/features/dashboard/org/components/verification/GetVerifiedModal.tsx' 'ui/src/features/dashboard/org/lib/edgeClient.ts'
git commit -m "ui(ui): sync dashboard shell components and styles batch 1"
echo "OK: ui(ui): sync dashboard shell components and styles batch 1 (12 files)"

git add -- 'ui/src/features/dashboard/org/pages/OnboardingPage.tsx' 'ui/src/features/dashboard/org/pages/OrgDashboardPage.tsx' 'ui/src/features/dashboard/org/pages/OrgPropertiesPage.tsx' 'ui/src/features/dashboard/org/pages/OrgSettingsPage.tsx' 'ui/src/features/dashboard/org/routes/index.tsx' 'ui/src/features/dashboard/property/pages/DashboardPage.tsx' 'ui/src/features/dashboard/routes/index.tsx' 'ui/src/features/dashboard/super-admin/components/SuperAdminShell.tsx' 'ui/src/features/dashboard/super-admin/hooks/usePlatformSettings.ts' 'ui/src/features/dashboard/super-admin/hooks/usePricingPlans.ts' 'ui/src/features/dashboard/super-admin/pages/SuperAdminPlatformSettingsPage.tsx' 'ui/src/features/dashboard/activity/components/ActivityDetailSheet.tsx'
git commit -m "ui(ui): sync dashboard shell components and styles batch 2"
echo "OK: ui(ui): sync dashboard shell components and styles batch 2 (12 files)"

git add -- 'ui/src/features/dashboard/activity/components/ActivityFilters.tsx' 'ui/src/features/dashboard/activity/components/ActivityRow.tsx' 'ui/src/features/dashboard/activity/components/EntityActivityHistory.tsx' 'ui/src/features/dashboard/activity/hooks/useActivityLog.ts' 'ui/src/features/dashboard/activity/lib/activityApi.ts' 'ui/src/features/dashboard/activity/lib/activityCatalog.ts' 'ui/src/features/dashboard/activity/lib/activityFormat.ts' 'ui/src/features/dashboard/activity/pages/ActivityLogPage.tsx' 'ui/src/features/dashboard/activity/routes/index.tsx' 'ui/src/features/dashboard/org/components/org-properties/CopyPropertySettingsDialog.tsx' 'ui/src/features/dashboard/org/components/org-properties/CopyPropertySettingsHistory.tsx' 'ui/src/features/dashboard/org/hooks/useCopyPropertySettings.ts'
git commit -m "ui(ui): sync dashboard shell components and styles batch 3"
echo "OK: ui(ui): sync dashboard shell components and styles batch 3 (12 files)"

git add -- 'ui/src/features/dashboard/org/hooks/useOrgSettingsController.ts' 'ui/src/features/dashboard/org/hooks/useParkingSettingsController.ts' 'ui/src/features/dashboard/org/hooks/usePropertySettingsController.ts' 'ui/src/features/dashboard/org/hooks/usePropertySettingsCopyLogs.ts' 'ui/src/features/dashboard/org/lib/copyPropertySettingsApi.ts' 'ui/src/features/dashboard/org/lib/copyPropertySettingsGroups.test.ts' 'ui/src/features/dashboard/org/lib/copyPropertySettingsGroups.ts' 'ui/src/features/dashboard/setup-guide/components/SetupGuideLauncher.tsx' 'ui/src/features/dashboard/setup-guide/components/SetupGuideOverlay.tsx' 'ui/src/features/dashboard/setup-guide/components/SetupGuideProvider.tsx' 'ui/src/features/dashboard/setup-guide/components/SetupGuideSettingsHost.tsx' 'ui/src/features/dashboard/setup-guide/components/SetupGuideSidebarEntry.tsx'
git commit -m "ui(ui): sync dashboard shell components and styles batch 4"
echo "OK: ui(ui): sync dashboard shell components and styles batch 4 (12 files)"

git add -- 'ui/src/features/dashboard/setup-guide/components/SetupGuideStepBody.tsx' 'ui/src/features/dashboard/setup-guide/hooks/useHostRewardOffer.ts' 'ui/src/features/dashboard/setup-guide/hooks/useSetupGuideListingCompletions.ts' 'ui/src/features/dashboard/setup-guide/hooks/useSetupGuideProgress.ts' 'ui/src/features/dashboard/setup-guide/hooks/useSetupGuideStateWrite.ts' 'ui/src/features/dashboard/setup-guide/lib/setupGuideIssuesStore.ts' 'ui/src/features/dashboard/setup-guide/lib/setupGuideProgress.ts' 'ui/src/features/dashboard/setup-guide/lib/setupGuideState.ts' 'ui/src/features/dashboard/setup-guide/lib/setupGuideSteps.test.ts' 'ui/src/features/dashboard/setup-guide/lib/setupGuideSteps.ts' 'ui/src/features/dashboard/setup-guide/lib/setupGuideTypes.ts' 'ui/src/features/dashboard/super-admin/components/HostVerificationRewardCard.tsx'
git commit -m "ui(ui): sync dashboard shell components and styles batch 5"
echo "OK: ui(ui): sync dashboard shell components and styles batch 5 (12 files)"

git add -- 'docs/PROJECT.md' 'docs/architecture/ai-dashboard-assistant.md' 'docs/architecture/data-model.md' 'docs/architecture/edge-functions.md' 'docs/architecture/routing.md' 'docs/architecture/validation-and-env.md' 'docs/archive/operations/migration-runbook.md' 'docs/guides/routes/README.md' 'docs/guides/routes/admin/announcements.md' 'docs/guides/routes/admin/org-subscriptions.md' 'docs/guides/routes/admin/orgs.md' 'docs/guides/routes/admin/overview.md'
git commit -m "docs(docs): sync architecture route guides and shipped workflow docs batch 1"
echo "OK: docs(docs): sync architecture route guides and shipped workflow docs batch 1 (12 files)"

git add -- 'docs/guides/routes/admin/parking-payouts.md' 'docs/guides/routes/admin/payment-settings.md' 'docs/guides/routes/admin/platform-tools.md' 'docs/guides/routes/admin/pricing-plans.md' 'docs/guides/routes/onboarding.md' 'docs/guides/routes/org/parking/settings.md' 'docs/guides/routes/org/properties.md' 'docs/guides/routes/org/property/bookings-detail.md' 'docs/guides/routes/org/property/finance.md' 'docs/guides/routes/org/property/maintenance.md' 'docs/guides/routes/org/property/marketing.md' 'docs/guides/routes/org/property/notifications.md'
git commit -m "docs(docs): sync architecture route guides and shipped workflow docs batch 2"
echo "OK: docs(docs): sync architecture route guides and shipped workflow docs batch 2 (12 files)"

git add -- 'docs/guides/routes/org/property/pricing.md' 'docs/guides/routes/org/property/public-pages.md' 'docs/guides/routes/org/property/settings.md' 'docs/guides/routes/org/property/team.md' 'docs/guides/routes/org/property/templates.md' 'docs/guides/routes/org/settings.md' 'docs/guides/testing/ai-dashboard-assistant-manual.md' 'docs/workflow/done/README.md' 'docs/workflow/done/ai-dashboard-assistant-features.md' 'docs/workflow/for-testing/README.md' 'docs/workflow/planned/README.md' 'docs/workflow/planned/module-status-management.md'
git commit -m "docs(docs): sync architecture route guides and shipped workflow docs batch 3"
echo "OK: docs(docs): sync architecture route guides and shipped workflow docs batch 3 (12 files)"

git add -- 'docs/workflow/planned/super-admin-console-followups.md' 'docs/guides/routes/org/activity.md' 'docs/guides/routes/org/parking/activity.md' 'docs/guides/routes/org/property/activity.md' 'docs/guides/routes/org/setup-guide.md' 'docs/workflow/done/super-admin-ai-usage-dashboard.md' 'docs/workflow/done/super-admin-audit-log.md' 'docs/workflow/done/super-admin-console-overhaul.md' 'docs/workflow/done/super-admin-global-search.md' 'docs/workflow/done/super-admin-platform-settings.md' 'docs/workflow/for-testing/host-onboarding-setup-guide.md' 'docs/workflow/for-testing/property-settings-copy-to-properties.md'
git commit -m "docs(docs): sync architecture route guides and shipped workflow docs batch 4"
echo "OK: docs(docs): sync architecture route guides and shipped workflow docs batch 4 (12 files)"

git add -- '.cursor/rules/README.md' '.cursor/rules/admin-auth.mdc' '.cursor/rules/booking-workflow.mdc' '.cursor/rules/documentation-maintenance.mdc' '.cursor/rules/supabase-edge-functions.mdc' '.agent/skills/audit-logging/SKILL.md' '.cursor/rules/audit-logging.mdc' '.cursor/skills/audit-logging'
git commit -m "chore(*): sync agent skills and cursor rules"
echo "OK: chore(*): sync agent skills and cursor rules (8 files)"

git add -- 'ui/src/features/dashboard/super-admin/components/SuperAdminOtpDialog.tsx' 'ui/src/features/dashboard/super-admin/components/SuperAdminStepUpProvider.tsx' 'ui/src/features/dashboard/super-admin/hooks/useSuperAdminVerification.ts' 'docs/workflow/planned/ai-paid-provider-and-production-quotas.md' 'docs/workflow/planned/host-analytics-module.md' 'docs/workflow/planned/super-admin-service-cost-monitoring.md'
git commit -m "feat(admin): add super admin step-up otp verification"
echo "OK: feat(admin): add super admin step-up otp verification (6 files)"

git add -- 'package.json' 'deno.lock' 'supabase/functions/_shared/dashboardAssistantBookingAssetTools.ts' 'supabase/functions/_shared/dashboardAssistantTools.ts' 'ui/src/features/dashboard/parking/components/ParkingDetailsSection.tsx' 'ui/src/features/dashboard/parking/components/ParkingSettingsCard.tsx' 'ui/src/features/dashboard/parking/pages/ParkingDashboardPage.tsx' 'ui/src/features/dashboard/parking/lib/parkingSettingsSavePlan.ts'
git commit -m "chore(deps): update root and ui package locks"
echo "OK: chore(deps): update root and ui package locks (7 files)"

git add -- 'ui/src/features/dashboard/ai-assistant/lib/dynamicFormValidation.ts' 'ui/src/features/dashboard/ai-assistant/lib/moduleSuggestions.ts' 'supabase/functions/_shared/parkingCancellation.ts' 'supabase/functions/_shared/parkingPaymentOrchestrator.ts' 'supabase/functions/parking-payouts/index.ts' 'supabase/functions/platform-parking-settings/index.ts' 'ui/src/features/dashboard/bookings/components/AdminLayout.tsx' 'ui/src/features/dashboard/bookings/components/AdminSectionNavLayout.tsx'
git commit -m "api(supabase): add dashboard ai assistant services"
echo "OK: api(supabase): add dashboard ai assistant services (8 files)"

git add -- 'scripts/README.md' 'scripts/dev/reorder-workflow-scratchpads.mjs' 'scripts/dev/reorganize-env-files.mjs' 'scripts/dev/sync-dev-env.mjs' 'scripts/dev/sync-vercel-dev-env.mjs' '.agent/skills/documentation-maintenance/SKILL.md' '.claude/README.md' 'CLAUDE.md' 'opencode.json' '.claude/skills/audit-logging'
git commit -m "chore(*): sync remaining project config"
echo "OK: chore(*): sync remaining project config (10 files)"

git add -- 'supabase/functions/update-platform-host-settings/index.ts' 'supabase/functions/_shared/calendarSyncRun.ts' 'ui/src/features/dashboard/team/lib/orgPermissions.ts' 'ui/src/features/dashboard/team/lib/parkingPermissions.ts' 'ui/src/features/dashboard/team/lib/propertyPermissions.ts' 'ui/src/features/dashboard/bookings/components/PropertySettingsCard.tsx' 'ui/src/features/dashboard/bookings/components/booking-detail/RescheduleBookingModal.tsx' 'ui/src/features/dashboard/bookings/hooks/useRescheduleBooking.ts' 'ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts' 'ui/src/features/dashboard/bookings/lib/bookingStatus.ts' 'ui/src/features/dashboard/bookings/pages/BookingDetailPage.tsx'
git commit -m "ui(org): add granular property team permissions ui"
echo "OK: ui(org): add granular property team permissions ui (11 files)"

echo "DONE ${#batches} commits"