-- Separate staff daily summary template when there are no active bookings today.

ALTER TABLE public.telegram_staff_settings
  ADD COLUMN IF NOT EXISTS daily_summary_no_bookings_template TEXT NOT NULL DEFAULT E'📋 No bookings for today.

Kindly do a general cleaning, especially the following items:

* Clean the aircon filter
* Clean the tower fan
* Clean behind the sofa
* Clean the exhaust fan
* Remove dust and cobwebs from the ceiling
* Clean the balcony (including underneath the grass)
* Clean the bathroom tiles & shower head
* Clean the walls and cabinets

Next Bookings
{{next_bookings}}';
