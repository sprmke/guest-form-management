# Testing Mode Guide 🧪

## Quick Start

### Enable Testing Mode in Production
Simply add `?testing=true` to any URL:

```
https://your-production-app.com/?testing=true
```

### Combine with Booking ID
You can combine testing mode with other query parameters:

```
https://your-production-app.com/?testing=true&bookingId=abc-123
```

---

## What Does Testing Mode Do?

When you add `?testing=true` to the URL in production, you get:

### ✅ Developer Controls Card Appears
A card titled **"Testing Controls (Testing Mode)"** shows up with 6 checkboxes to control API actions.

### ✅ All Actions Disabled by Default
All checkboxes start unchecked, so you can selectively enable only what you want to test.

### ✅ Generate New Data Button
The "Generate New Data" button appears (when no bookingId is present) to quickly populate the form with test data.

### ✅ Form Doesn't Reset
After successful submission, the form keeps all values so you can easily resubmit with modifications.

---

## Available Controls

| Checkbox | What It Controls |
|----------|------------------|
| **Save data to database** | Creates/updates records in Supabase database |
| **Save image assets to Supabase Storage** | Uploads files (valid ID, payment receipt, pet images) |
| **Generate PDF** | Creates the GAF PDF document |
| **Send email notification** | Sends confirmation email to all parties |
| **Update Google Calendar** | Creates/updates calendar event |
| **Update Google Sheets** | Appends/updates row in spreadsheet |

---

## Common Testing Scenarios

### 1. Test Form UI Only (No Side Effects)
**Goal**: Test the form itself without touching any backend systems

**Checkboxes**: ☐ All unchecked

**Result**: Form submits successfully but nothing is saved or sent

---

### 2. Test Database Logic Only
**Goal**: Test database operations without other side effects

**Checkboxes**: 
- ☑ Save data to database
- ☑ Save image assets to Supabase Storage
- ☐ All others unchecked

**Result**: Data saved to database and files uploaded, but no PDF/email/calendar/sheets

---

### 3. Test PDF Generation
**Goal**: Test PDF generation without sending emails

**Checkboxes**: 
- ☑ Save data to database
- ☑ Save image assets to Supabase Storage
- ☑ Generate PDF
- ☐ All others unchecked

**Result**: PDF is generated (check server logs) but not emailed

---

### 4. Test Email Flow
**Goal**: Test email sending with PDF attachment

**Checkboxes**: 
- ☑ Save data to database
- ☑ Save image assets to Supabase Storage
- ☑ Generate PDF
- ☑ Send email notification
- ☐ Calendar and Sheets unchecked

**Result**: Email sent with PDF, but calendar and sheets not updated

---

### 5. Test Calendar Integration
**Goal**: Test calendar updates without affecting sheets

**Checkboxes**: 
- ☑ Save data to database
- ☑ Save image assets to Supabase Storage
- ☑ Update Google Calendar
- ☐ All others unchecked

**Result**: Calendar event created/updated, but no email/PDF/sheets

---

### 6. Full Integration Test
**Goal**: Test entire flow end-to-end in production

**Checkboxes**: ☑ All checked

**Result**: Complete flow executes (same as normal production)

---

## Important Notes

### 🔒 Security
- The `?testing=true` parameter is only a UI control
- It doesn't bypass any authentication or authorization
- Backend API still requires valid credentials

### 🏷️ Test Markers
When testing mode is active:
- Calendar events get `[TEST]` prefix in the title
- Google Sheets entries get `[TEST]` prefix in the name field
- This helps identify test data from real bookings

### 🔄 URL Persistence
- The `?testing=true` parameter stays in the URL after form submission
- This is intentional - you can keep testing without re-adding it
- To exit testing mode, just remove `?testing=true` from the URL

### 📝 Server Logs
Check your edge function logs to see detailed output:
- Flag states are logged at the start
- Skip warnings show when operations are skipped
- This helps debug what's actually happening

---

## Troubleshooting

### Controls Not Showing
**Problem**: Added `?testing=true` but controls still hidden

**Solution**: Make sure:
1. The parameter is in the URL correctly: `?testing=true` (not `?testing=1`)
2. You've refreshed the page after adding the parameter
3. Check browser console for any errors

### Some Actions Still Happening
**Problem**: Unchecked a box but action still executed

**Solution**: 
1. Verify the checkbox was unchecked BEFORE submitting
2. Check server logs to see what flags were received
3. Clear browser cache if needed

### Can't Generate Test Data
**Problem**: "Generate New Data" button not appearing

**Solution**: 
1. Make sure `?testing=true` is in the URL
2. Make sure there's NO `bookingId` parameter (remove it)
3. The button only shows for new forms, not when editing

---

## Examples

### Test Database Save (Production)
```
1. Go to: https://your-app.com/?testing=true
2. Check: ☑ Save data to database
3. Check: ☑ Save image assets to Supabase Storage
4. Click "Generate New Data" (optional)
5. Submit form
6. Check Supabase dashboard to verify data
```

### Test Email Without Affecting Production Calendar
```
1. Go to: https://your-app.com/?testing=true
2. Check: ☑ Save data to database
3. Check: ☑ Save image assets to Supabase Storage
4. Check: ☑ Generate PDF
5. Check: ☑ Send email notification
6. Submit form
7. Check email inbox to verify email received
8. Verify calendar was NOT updated
```

### Update Existing Booking Without Side Effects
```
1. Go to: https://your-app.com/?testing=true&bookingId=YOUR_ID
2. Check: ☑ Save data to database
3. Make changes to the form
4. Submit form
5. Only database is updated, nothing else
```

---

## Development vs Testing Mode

| Feature | Development | Testing Mode | Normal Production |
|---------|-------------|--------------|-------------------|
| Controls Visible | ✅ Always | ✅ With ?testing=true | ❌ Never |
| Default State | All unchecked | All unchecked | All enabled |
| Generate Data | ✅ Available | ✅ Available | ❌ Hidden |
| Form Reset | ❌ Keeps data | ❌ Keeps data | ✅ Resets |
| [TEST] Markers | ✅ Added | ✅ Added | ❌ Not added |

---

**Happy Testing!** 🚀

For questions or issues, check:
- `DEV_FLAGS_AUDIT.md` for technical implementation details
- Server logs for detailed execution information
- Browser console for frontend errors

