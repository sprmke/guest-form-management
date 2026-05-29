-- New booking admin Telegram template: mirror new-booking-request email sections.

UPDATE public.telegram_admin_settings
SET
  new_booking_template = E'🆕 New Booking Request\n{{urgent_notice}}{{tower_and_unit_number}}\n\nStay details\nCheck-in: {{check_in_date}}\nCheck-out: {{check_out_date}}\nNights: {{nights}}\nPax: {{pax}}\n\nGuest details\nFacebook: {{guest_facebook_name}}\nPrimary guest: {{primary_guest_name}}\nAddress: {{guest_address}}\nPhone: {{guest_phone}}\nEmail: {{guest_email}}\nSource: {{booking_source}}\n\nNotable information\nPay parking: {{need_parking}}\nPet approval: {{has_pets}}\nSurprise decor: {{surprise_decor}}\n\n{{booking_link}}',
  updated_at = NOW()
WHERE id = 1;
