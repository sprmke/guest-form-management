#!/usr/bin/env node
/**
 * Renders email HTML templates with real guest_submissions row data (or a demo
 * fallback) into supabase/functions/_shared/email-templates/_preview/
 *
 * Env (from supabase/.env.local or process.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   EMAIL_LOGO_URL (optional) — absolute URL for the Kame Home logo in `<img src>`; default `https://kamehomes.space/images/logo.png`
 *
 * Run: npm run preview:emails:db
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TPL_DIR = path.join(
  ROOT,
  'supabase',
  'functions',
  '_shared',
  'email-templates',
);
const OUT_DIR = path.join(TPL_DIR, '_preview');

function loadDotEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function escapeHtml(s) {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function replacePlaceholders(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function loadTemplate(name) {
  const rel = name.endsWith('.html') ? name : `${name}.html`;
  return fs.readFileSync(path.join(TPL_DIR, rel), 'utf8');
}

function pesoFormat(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DEFAULT_EMAIL_LOGO_URL = 'https://kamehomes.space/images/logo.png';

function buildEmailHeaderLogoHtml(logoUrl) {
  const frag = loadTemplate('fragments/email-header-logo');
  return replacePlaceholders(frag, { logoUrl: escapeHtml(logoUrl) });
}

/**
 * The house-rules file is an HTML fragment (no head/styles). Wrap it so
 * browser preview matches how it appears inside ready-for-check-in.
 */
function wrapHouseRulesStandalonePreview(fragmentHtml, emailHeaderLogo) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Important reminders (preview)</title>
    <style type="text/css">
      body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: #f3f4f6 !important;
        -webkit-text-size-adjust: 100%;
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
          Arial, sans-serif;
      }
      table {
        border-collapse: collapse;
      }
      .shell-pad {
        padding: 32px 16px 44px;
      }
      .email-wrapper {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border: 2px solid #e2e8f0;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 12px 40px rgba(15, 23, 42, 0.06);
      }
      .content-pad {
        padding: 36px 40px 40px;
        color: #333333;
      }
      .section-label {
        margin: 0 0 14px 0;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #5f954c;
      }
      .section-label-mt-sm {
        margin: 28px 0 10px 0;
      }
      .hr-subtitle {
        margin: 0 0 14px 0;
        color: #666666;
        font-size: 14px;
        line-height: 1.5;
      }
      .data-table {
        width: 100%;
        table-layout: fixed;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        border-collapse: separate;
        border-spacing: 0;
        overflow: hidden;
        font-size: 14px;
      }
      .data-table tr:first-child td:first-child {
        border-top-left-radius: 16px;
      }
      .data-table tr:first-child td:last-child {
        border-top-right-radius: 16px;
      }
      .data-table tr:last-child td:first-child {
        border-bottom-left-radius: 16px;
      }
      .data-table tr:last-child td:last-child {
        border-bottom-right-radius: 16px;
      }
      .tbl-label {
        padding: 12px 16px;
        background-color: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        font-weight: 600;
        color: #475569;
        vertical-align: top;
        width: 34%;
      }
      .tbl-value {
        padding: 12px 16px;
        background-color: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        color: #333333;
        line-height: 1.55;
        vertical-align: top;
      }
      .text-strong {
        color: #111827;
        font-weight: 700;
      }
      .email-logo-wrap {
        padding: 0 0 22px 0;
        text-align: center;
      }
      .email-logo {
        display: block;
        margin: 0 auto;
        width: 80px;
        height: 80px;
        border: 0;
        border-radius: 50%;
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
      }
      .brand-block {
        margin-bottom: 22px;
      }
      .brand-line {
        padding-bottom: 4px;
      }
      .brand-micro {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #666666;
      }
      .text-subheading {
        font-size: 15px;
        font-weight: 700;
        color: #333333;
      }
      .legal-footer {
        padding: 22px 16px 0;
        font-size: 12px;
        line-height: 1.55;
        color: #666666;
        text-align: center;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background-color: #0f172a !important;
        }
        .email-wrapper {
          background: #1e293b !important;
          border-color: #334155 !important;
        }
        .content-pad {
          color: #f1f5f9 !important;
        }
        .section-label {
          color: #affd93 !important;
        }
        .hr-subtitle {
          color: #94a3b8 !important;
        }
        .tbl-label,
        .tbl-value {
          background-color: #1e293b !important;
          border-bottom-color: #334155 !important;
          color: #e2e8f0 !important;
        }
        .text-strong {
          color: #f8fafc !important;
        }
        .brand-micro {
          color: #94a3b8 !important;
        }
        .text-subheading {
          color: #f1f5f9 !important;
        }
        .legal-footer {
          color: #cbd5e1 !important;
        }
      }
    </style>
  </head>
  <body>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center" class="shell-pad">
          <table role="presentation" class="email-wrapper" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td class="content-pad">
                ${emailHeaderLogo}
                <table role="presentation" class="brand-block" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td class="brand-line">
                      <span class="brand-micro">Kame Home</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span class="text-subheading">Monaco 2604</span>
                    </td>
                  </tr>
                </table>
                ${fragmentHtml}
              </td>
            </tr>
            <tr>
              <td align="center" class="legal-footer">
                &copy; 2025 Kame Home - Azure North. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

/** Rich demo row when DB has no suitable booking (offline / empty DB). */
const DEMO_BOOKING = {
  id: 'demo-preview-id',
  guest_facebook_name: 'Alex Rivera (Demo)',
  guest_email: 'guest.demo@example.com',
  check_in_date: '06-15-2026',
  check_out_date: '06-18-2026',
  check_in_time: '2:00 PM',
  check_out_time: '12:00 PM',
  number_of_adults: 2,
  number_of_children: 1,
  tower_and_unit_number: 'Tower 1 · Unit 2604',
  owner_onsite_contact_person: 'Arianna Perez',
  owner_contact_number: '+63 917 000 0000',
  need_parking: true,
  car_brand_model: 'Toyota Fortuner',
  car_color: 'Pearl White',
  car_plate_number: 'ABC 1234',
  has_pets: true,
  pet_name: 'Milo',
  pet_type: 'Dog',
  pet_breed: 'Shih Tzu',
  pet_age: '3 years',
  pet_vaccination_date: '01-10-2026',
  booking_rate: 12500,
  down_payment: 5000,
  balance: 7500,
  security_deposit: 1500,
  parking_rate_guest: 500,
  pet_fee: 300,
  status: 'READY_FOR_CHECKIN',
  is_test_booking: false,
};

function buildParkingPaymentRow(booking) {
  if (!booking.need_parking) return '';
  return `
    <tr class="fee-addon-row">
      <td class="tbl-label">Guest parking fee</td>
      <td class="tbl-num">${pesoFormat(booking.parking_rate_guest)}</td>
      <td class="tbl-note"><em class="italic-note">Non-refundable; no rescheduling</em></td>
    </tr>`;
}

function buildPetPaymentRow(booking) {
  if (!booking.has_pets) return '';
  return `
    <tr class="fee-addon-row">
      <td class="tbl-label">Pet fee</td>
      <td class="tbl-num">${pesoFormat(booking.pet_fee)}</td>
      <td class="tbl-note"></td>
    </tr>`;
}

/** Booking rate balance + security deposit + optional parking & pet fees. */
function computeTotalDueAtCheckin(booking) {
  const bal =
    booking.balance != null
      ? Number(booking.balance)
      : (Number(booking.booking_rate) || 0) -
        (Number(booking.down_payment) || 0);
  const sec = Number(booking.security_deposit) || 0;
  const park = booking.need_parking
    ? Number(booking.parking_rate_guest) || 0
    : 0;
  const pet = booking.has_pets ? Number(booking.pet_fee) || 0 : 0;
  return (Number.isFinite(bal) ? bal : 0) + sec + park + pet;
}

function buildDocumentRemindersSection(booking) {
  const gafReminderHtml = `
    <table role="presentation" class="callout-outer callout-doc callout-doc--gaf" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td>
          <span class="callout-title">Guest Advise Form (GAF)</span>
          Your GAF has been approved. No need to print it! Simply present it at the guard house upon arrival and to the lobby receptionist during registration.
        </td>
      </tr>
    </table>`;

  const parkingReminderHtml = booking.need_parking
    ? `
    <table role="presentation" class="callout-outer callout-doc callout-doc--parking" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td>
          <span class="callout-title">Parking</span>
          Your parking slot is confirmed. The guest parking fee is <strong class="callout-strong">non-refundable</strong>, and once confirmed your parking dates <strong class="callout-strong">cannot be rescheduled</strong>.
        </td>
      </tr>
    </table>`
    : '';

  const petReminderHtml = booking.has_pets
    ? `
    <table role="presentation" class="callout-outer callout-doc callout-doc--pet" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td>
          <span class="callout-title">Pet</span>
          Your pet has been approved for this stay. Please keep your pet on a leash at all times and keep them within designated pet areas.
        </td>
      </tr>
    </table>`
    : '';

  return gafReminderHtml + parkingReminderHtml + petReminderHtml;
}

function gafBodyParagraphs(booking) {
  const u = escapeHtml(booking.tower_and_unit_number);
  const ci = escapeHtml(booking.check_in_date);
  const co = escapeHtml(booking.check_out_date);
  return `<p>Kindly review the Guest Advise Form (GAF) request for <strong>${u}</strong>, dated from <strong>${ci} to ${co}</strong>, for your approval.</p>`;
}

function petBodyParagraphs(booking) {
  const u = escapeHtml(booking.tower_and_unit_number);
  const ci = escapeHtml(booking.check_in_date);
  const co = escapeHtml(booking.check_out_date);
  return `<p>May we kindly request approval for our guest to bring a pet during their stay at <strong>${u}</strong> during their stay from <strong>${ci}</strong> to <strong>${co}</strong>.</p>`;
}

const URGENT_BLOCK = '';

async function pickBooking(supabase) {
  const base = () =>
    supabase
      .from('guest_submissions')
      .select('*')
      .or('is_test_booking.eq.false,is_test_booking.is.null')
      .neq('status', 'CANCELLED')
      .neq('status', 'canceled');

  let q = await base()
    .eq('has_pets', true)
    .eq('need_parking', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (q.error) throw q.error;
  if (q.data) return { row: q.data, label: 'has_pets + need_parking' };

  q = await base()
    .or('has_pets.eq.true,need_parking.eq.true')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (q.error) throw q.error;
  if (q.data) return { row: q.data, label: 'has_pets or need_parking' };

  q = await base()
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (q.error) throw q.error;
  if (q.data) return { row: q.data, label: 'latest non-cancelled' };

  return { row: null, label: null };
}

function renderAll(booking, meta, emailLogoUrl) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const emailHeaderLogo = buildEmailHeaderLogoHtml(emailLogoUrl);
  const testWarning = '';
  const updateSuffix = '';

  const gafTpl = loadTemplate('gaf-request');
  const gafHtml = replacePlaceholders(gafTpl, {
    emailHeaderLogo,
    testWarning,
    updateSuffix,
    urgentBlock: URGENT_BLOCK,
    checkInDate: escapeHtml(booking.check_in_date),
    checkOutDate: escapeHtml(booking.check_out_date),
    bodyParagraphs: gafBodyParagraphs(booking),
  });
  fs.writeFileSync(path.join(OUT_DIR, 'gaf-request.html'), gafHtml, 'utf8');

  const petTpl = loadTemplate('pet-request');
  const petHtml = replacePlaceholders(petTpl, {
    emailHeaderLogo,
    testWarning,
    updateSuffix,
    urgentBlock: URGENT_BLOCK,
    checkInDate: escapeHtml(booking.check_in_date),
    checkOutDate: escapeHtml(booking.check_out_date),
    bodyParagraphs: petBodyParagraphs(booking),
    petName: escapeHtml(booking.pet_name || 'N/A'),
    petType: escapeHtml(booking.pet_type || 'N/A'),
    petBreed: escapeHtml(booking.pet_breed || 'N/A'),
    petAge: escapeHtml(booking.pet_age || 'N/A'),
    petVaccinationDate: escapeHtml(booking.pet_vaccination_date || 'N/A'),
  });
  fs.writeFileSync(path.join(OUT_DIR, 'pet-request.html'), petHtml, 'utf8');

  const ackTpl = loadTemplate('booking-acknowledgement');
  const ackHtml = replacePlaceholders(ackTpl, {
    emailHeaderLogo,
    testWarning,
    guestFacebookName: escapeHtml(booking.guest_facebook_name),
    towerAndUnitNumber: escapeHtml(booking.tower_and_unit_number),
    checkInDate: escapeHtml(booking.check_in_date),
    checkOutDate: escapeHtml(booking.check_out_date),
  });
  fs.writeFileSync(
    path.join(OUT_DIR, 'booking-acknowledgement.html'),
    ackHtml,
    'utf8',
  );

  const parkTpl = loadTemplate('parking-broadcast');
  const parkHtml = replacePlaceholders(parkTpl, {
    emailHeaderLogo,
    testWarning,
    checkInDate: escapeHtml(booking.check_in_date),
    checkOutDate: escapeHtml(booking.check_out_date),
    towerAndUnitNumber: escapeHtml(booking.tower_and_unit_number),
    checkInTime: escapeHtml(booking.check_in_time || '2:00 PM'),
    checkOutTime: escapeHtml(booking.check_out_time || '12:00 PM'),
    carBrandModel: escapeHtml(booking.car_brand_model || 'N/A'),
    carColor: escapeHtml(booking.car_color || 'N/A'),
    carPlate: escapeHtml(booking.car_plate_number || 'N/A'),
  });
  fs.writeFileSync(
    path.join(OUT_DIR, 'parking-broadcast.html'),
    parkHtml,
    'utf8',
  );

  const pax =
    (Number(booking.number_of_adults) || 0) +
    (Number(booking.number_of_children) || 0);
  const balance =
    booking.balance != null
      ? Number(booking.balance)
      : (Number(booking.booking_rate) || 0) -
        (Number(booking.down_payment) || 0);
  const displayCheckInTime = escapeHtml(booking.check_in_time || '2:00 PM');
  const displayCheckOutTime = escapeHtml(booking.check_out_time || '12:00 PM');

  const houseRulesTpl = loadTemplate('ready-for-checkin-house-rules');
  const houseRulesSection = replacePlaceholders(houseRulesTpl, {
    pax: String(pax),
    checkInTime: displayCheckInTime,
    checkOutTime: displayCheckOutTime,
    securityDepositFormatted: pesoFormat(booking.security_deposit),
  });
  const houseRulesPreviewHtml = wrapHouseRulesStandalonePreview(
    houseRulesSection,
    emailHeaderLogo,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'ready-for-checkin-house-rules.html'),
    houseRulesPreviewHtml,
    'utf8',
  );

  const rfiTpl = loadTemplate('ready-for-checkin');
  const rfiHtml = replacePlaceholders(rfiTpl, {
    emailHeaderLogo,
    testWarning,
    checkInDate: escapeHtml(booking.check_in_date),
    checkOutDate: escapeHtml(booking.check_out_date),
    guestFacebookName: escapeHtml(booking.guest_facebook_name),
    documentRemindersSection: buildDocumentRemindersSection(booking),
    pax: String(pax),
    towerAndUnitNumber: escapeHtml(booking.tower_and_unit_number),
    checkInTime: displayCheckInTime,
    checkOutTime: displayCheckOutTime,
    bookingRate: pesoFormat(booking.booking_rate),
    downPayment: pesoFormat(booking.down_payment),
    balance: pesoFormat(balance),
    securityDeposit: pesoFormat(booking.security_deposit),
    totalBalanceDue: pesoFormat(computeTotalDueAtCheckin(booking)),
    parkingPaymentRow: buildParkingPaymentRow(booking),
    petPaymentRow: buildPetPaymentRow(booking),
    houseRulesSection,
  });
  fs.writeFileSync(
    path.join(OUT_DIR, 'ready-for-checkin.html'),
    rfiHtml,
    'utf8',
  );

  const metaPath = path.join(OUT_DIR, 'preview-meta.json');
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        source: meta.source,
        queryLabel: meta.queryLabel,
        bookingId: booking.id ?? null,
        guest_facebook_name: booking.guest_facebook_name,
        has_pets: booking.has_pets,
        need_parking: booking.need_parking,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  );
}

async function main() {
  const envPath = path.join(ROOT, 'supabase', '.env.local');
  const fileEnv = loadDotEnv(envPath);
  const emailLogoUrl = (
    process.env.EMAIL_LOGO_URL ||
    fileEnv.EMAIL_LOGO_URL ||
    DEFAULT_EMAIL_LOGO_URL
  ).trim();
  const url = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

  let booking;
  let meta = { source: 'demo', queryLabel: null };

  if (url && key) {
    const supabase = createClient(url, key);
    try {
      const { row, label } = await pickBooking(supabase);
      if (row) {
        booking = row;
        meta = { source: 'database', queryLabel: label };
        console.log(`Using guest_submissions row: ${booking.id} (${label})`);
      }
    } catch (e) {
      console.warn('Supabase query failed, using demo data:', e.message || e);
    }
  } else {
    console.warn(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — using built-in demo data.',
    );
    console.warn(`Expected in ${envPath} or process.env`);
  }

  if (!booking) {
    booking = { ...DEMO_BOOKING };
    console.log('Using built-in DEMO_BOOKING (no DB row).');
  }

  renderAll(booking, meta, emailLogoUrl);
  console.log(`Wrote filled previews to ${path.relative(ROOT, OUT_DIR)}/`);
  console.log(
    'Open http://localhost:3334/ and use the "Filled from database" links (run npm run preview:emails:serve if the server is not up).',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
