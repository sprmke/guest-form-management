# Cleanup Feature - UI Integration Update

## Summary

Added a "Clean Up All Test Data" button to the Dev Controls section of the Guest Form, and improved the Google Calendar cleanup functionality.

## Changes Made

### 1. Fixed Google Calendar Cleanup

**File**: `supabase/functions/cleanup-test-data/index.ts`

**Improvements**:
- Added time range filter to fetch events from the last year
- Increased `maxResults` to 2500 to fetch more events
- Added `singleEvents=true` to handle recurring events properly
- Improved logging to show which events are found and deleted
- Better error handling with status codes 404 and 410 (already deleted/gone)
- Added detailed console output for debugging

**Key Changes**:
```typescript
// Now fetches events with time range and better pagination
const response = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
  `timeMin=${oneYearAgo.toISOString()}&` +
  `maxResults=2500&` +
  `singleEvents=true`,
  ...
);
```

### 2. Added Cleanup Button to Guest Form

**File**: `ui/src/features/guest-form/components/GuestForm.tsx`

**New Features**:
- Added "Clean Up All Test Data" button in Dev Controls section
- Button shows loading state while cleaning up
- Displays confirmation dialog before cleanup
- Shows success toast with deletion summary
- Refreshes booked dates after cleanup
- Button is destructive (red) to indicate dangerous action

**New UI Components**:
```tsx
<Button
  type="button"
  variant="destructive"
  onClick={handleCleanupTestData}
  disabled={isCleaningUp}
  className="w-full"
>
  {isCleaningUp ? (
    <>
      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
      Cleaning up test data...
    </>
  ) : (
    <>
      <Trash2 className="mr-2 w-4 h-4" />
      Clean Up All Test Data
    </>
  )}
</Button>
```

**New Handler Function**:
- `handleCleanupTestData()` - Calls the cleanup API endpoint
- Shows confirmation dialog with details
- Displays success/error toast notifications
- Refreshes booked dates after cleanup

### 3. Extracted `fetchBookedDates` Function

Moved `fetchBookedDates` outside of `useEffect` so it can be reused by:
- Initial data load on mount
- Cleanup handler to refresh dates after deletion

## User Experience

### Before
- Had to run bash script manually: `./cleanup-test-data.sh`
- Google Calendar events weren't being deleted properly

### After
1. **Easy Access**: Just click the "Clean Up All Test Data" button in Dev Controls
2. **Safety**: Confirmation dialog explains what will be deleted
3. **Feedback**: Loading state shows progress, toast shows results
4. **Working**: Calendar events now properly deleted

## How It Looks

In the **Dev Controls** section (visible in dev mode or with `?testing=true`):

```
┌─────────────────────────────────────────────┐
│ Developer Controls (Dev Mode)               │
├─────────────────────────────────────────────┤
│ ☑ Save data to database                    │
│ ☑ Save image assets to Supabase Storage    │
│ ☑ Generate PDF                             │
│ ☑ Send email notification                  │
│ ☑ Update Google Calendar                   │
│ ☑ Update Google Sheets                     │
│ ─────────────────────────────────────────  │
│ [🗑️ Clean Up All Test Data]               │
│ Removes all test data from database,       │
│ storage, calendar, and sheets              │
└─────────────────────────────────────────────┘
```

## Testing

To test the cleanup feature:

1. **Create test data**:
   - Enable all Dev Controls checkboxes
   - Submit the form (with `?testing=true` if in production)

2. **Clean up**:
   - Click "Clean Up All Test Data" button
   - Confirm the dialog
   - Check the success toast for deletion summary

3. **Verify**:
   - Check database (Supabase Dashboard)
   - Check storage buckets
   - Check Google Calendar
   - Check Google Sheets

## API Endpoint

The button calls: `POST ${apiUrl}/cleanup-test-data`

Request body:
```json
{
  "confirm": true
}
```

Response:
```json
{
  "success": true,
  "summary": {
    "totalDeleted": {
      "database": 5,
      "storage": 14,
      "calendar": 5,
      "sheets": 5
    },
    "grandTotal": 29
  }
}
```

## Benefits

✅ **Faster**: No need to leave the browser or run scripts
✅ **Safer**: Confirmation dialog prevents accidents
✅ **Visual**: Clear feedback on what was deleted
✅ **Complete**: Cleans all test data in one click
✅ **Integrated**: Works seamlessly with existing dev workflow

## Notes

- Button only visible in dev mode or with `?testing=true`
- Requires confirmation before deletion
- Automatically refreshes booked dates after cleanup
- Shows detailed deletion summary in toast notification
- Google Calendar cleanup now properly handles all events

