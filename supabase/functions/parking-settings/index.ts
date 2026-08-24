/**
 * parking-settings — Admin GET/PATCH for per-parking operator config.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  buildParkingIntegrationStatus,
  buildPlatformSecretsStatus,
} from '../_shared/propertyIntegrationStatus.ts';
import { ensureParkingSettings } from '../_shared/parkingSettingsSeed.ts';
import {
  mergeParkingAutomationToggles,
  parseParkingAutomationTogglesPatch,
} from '../_shared/parkingAutomationToggles.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { resolveScopedParkingAccess } from '../_shared/parkingScope.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

function serializeParkingSettingsRow(
  row: Record<string, unknown>,
  extras?: {
    parkingIntegrations?: Awaited<ReturnType<typeof buildParkingIntegrationStatus>>;
    platformSecrets?: ReturnType<typeof buildPlatformSecretsStatus>;
  }
) {
  return {
    parkingId: row.parking_id,
    paymentProvider: row.payment_provider ?? null,
    gcashName: row.gcash_name ?? null,
    gcashNumber: row.gcash_number ?? null,
    gcashQrImageUrl: row.gcash_qr_image_url ?? null,
    paymentMethods: row.payment_methods ?? [],
    parkingNotificationTemplates: row.parking_notification_templates ?? {},
    automationToggles: mergeParkingAutomationToggles(row.automation_toggles),
    updatedAt: row.updated_at,
    parkingIntegrations: extras?.parkingIntegrations,
    platformSecrets: extras?.platformSecrets,
  };
}

serveAuthenticated('parking-settings', async (req) => {
  const permission = req.method === 'GET' ? 'org:parkings:view' : 'org:parkings:manage';
  const { parkingRow } = await resolveScopedParkingAccess(req, permission);
  const parkingId = parkingRow.id;
  const supabase = createServiceClient();

  if (req.method === 'GET') {
    await ensureParkingSettings(parkingId);
    const { data, error } = await supabase
      .from('parking_settings')
      .select('*')
      .eq('parking_id', parkingId)
      .maybeSingle();
    if (error || !data) {
      return jsonError(req, 'Failed to load parking settings', 500);
    }
    return jsonSuccess(
      req,
      serializeParkingSettingsRow(data as Record<string, unknown>, {
        parkingIntegrations: await buildParkingIntegrationStatus(parkingId),
        platformSecrets: buildPlatformSecretsStatus(),
      })
    );
  }

  if (req.method === 'PATCH') {
    requireHttpMethod(req, 'PATCH');
    const body = await readJsonBody(req);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.gcashName === 'string') patch.gcash_name = body.gcashName.trim() || null;
    if (typeof body.gcashNumber === 'string') patch.gcash_number = body.gcashNumber.trim() || null;
    if (typeof body.gcashQrImageUrl === 'string') {
      patch.gcash_qr_image_url = body.gcashQrImageUrl.trim() || null;
    }
    if (typeof body.paymentProvider === 'string') {
      patch.payment_provider = body.paymentProvider.trim() || null;
    }
    if (Array.isArray(body.paymentMethods)) {
      patch.payment_methods = body.paymentMethods;
    }
    if (
      body.parkingNotificationTemplates &&
      typeof body.parkingNotificationTemplates === 'object'
    ) {
      patch.parking_notification_templates = body.parkingNotificationTemplates;
    }

    const automationPatch = parseParkingAutomationTogglesPatch(body.automationToggles);
    if (automationPatch) {
      const { data: existingRow } = await supabase
        .from('parking_settings')
        .select('automation_toggles')
        .eq('parking_id', parkingId)
        .maybeSingle();
      const merged = {
        ...mergeParkingAutomationToggles(existingRow?.automation_toggles),
        ...automationPatch,
      };
      patch.automation_toggles = merged;
    }

    if (Object.keys(patch).length <= 1) {
      return jsonError(req, 'No valid fields to update');
    }

    await ensureParkingSettings(parkingId);
    const { data, error } = await supabase
      .from('parking_settings')
      .update(patch)
      .eq('parking_id', parkingId)
      .select('*')
      .single();

    if (error) {
      console.error('[parking-settings]', error.message);
      return jsonError(req, 'Failed to update parking settings', 500);
    }

    return jsonSuccess(req, serializeParkingSettingsRow(data as Record<string, unknown>));
  }

  return jsonError(req, `Method ${req.method} not allowed`, 405);
});
