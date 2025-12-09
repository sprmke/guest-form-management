# Copy-Paste Booking Information Feature

## Overview

This feature allows guests to copy their booking information when form submission fails, making it easy to share their details via Facebook Messenger for manual assistance. It also provides developers with a quick way to resubmit forms by pasting the copied information.

## User Flow

### For Guests (When Error Occurs)

1. **Guest fills out the booking form** with all their information
2. **Submission fails** (e.g., due to network error, server error, or booking overlap)
3. **Error toast appears** with a "Copy Booking Info" button
4. **Guest clicks the button** to copy all their booking information to clipboard
5. **Success notification** confirms the data has been copied
6. **Guest pastes the information** in Facebook Messenger to request assistance

### For Developers/Admins (Resubmitting Forms)

1. **Receive booking information** from guest via Facebook Messenger
2. **Copy the booking information text** from the message
3. **Open the guest form** in dev/testing mode
4. **Click "Paste Booking Info from Clipboard"** button in Dev Controls section
5. **Form auto-populates** with all the guest's information
6. **Upload file attachments** (payment receipt, valid ID, pet documents)
7. **Review and submit** the form on behalf of the guest

## Booking Information Format

The booking information is formatted as a human-readable, structured text that includes:

```
=== BOOKING INFORMATION ===

--- Guest Information ---
Facebook Name: John Doe
Primary Guest: John Doe
Email: john.doe@example.com
Phone: 09123456789
Address: Manila, Metro Manila
Nationality: Filipino

--- Booking Details ---
Check-in Date: 2025-12-01
Check-in Time: 14:00
Check-out Date: 2025-12-03
Check-out Time: 11:00
Number of Adults: 2
Number of Children: 1
Guest 2 Name: Jane Doe
Guest 3 Name: Junior Doe

--- Parking Information ---
Need Parking: Yes
Car Plate Number: ABC1234
Car Brand/Model: Toyota Vios
Car Color: White

--- Pet Information ---
Has Pets: Yes
Pet Name: Buddy
Pet Type: Dog
Pet Breed: Golden Retriever
Pet Age: 2 years
Pet Vaccination Date: 2025-11-01

--- Additional Information ---
How did you find us: Facebook
Special Requests: Early check-in if possible

--- Property Information ---
Unit Owner: Arianna Perez
Tower/Unit Number: Monaco 2604
Onsite Contact Person: Arianna Perez
Contact Number: 0962 541 2941

=== END BOOKING INFORMATION ===

Notes:
- Please do not modify or edit any information to prevent
- File attachments (payment receipt, valid ID, pet documents) cannot be copied. Please keep them ready for resubmission.
```

## Technical Implementation

### New Files

- **`ui/src/utils/bookingFormatter.ts`**: Contains utility functions for formatting and parsing booking information

### Modified Files

- **`ui/src/features/guest-form/components/GuestForm.tsx`**:
  - Added import for booking formatter utilities
  - Added import for `ClipboardPaste` icon from lucide-react
  - Added "Copy Booking Info" button to error toast messages
  - Added `handlePasteFromClipboard()` function to parse and populate form
  - Added "Paste Booking Info from Clipboard" button in Dev Controls section

### Key Functions

1. **`formatBookingInfoForClipboard(formData, bookingId)`**

   - Takes form data and booking ID
   - Returns formatted, human-readable string
   - Includes all text fields (files cannot be copied)

2. **`parseBookingInfoFromClipboard(clipboardText)`**

   - Takes clipboard text
   - Validates format (checks for markers)
   - Parses and returns form data object
   - Returns `null` if invalid format

3. **`handleCopyBookingInfo()`** (in GuestForm component)

   - Gets current form values
   - Formats booking info
   - Copies to clipboard
   - Shows success/error toast

4. **`handlePasteFromClipboard()`** (in GuestForm component)
   - Reads from clipboard
   - Parses booking info
   - Populates form fields
   - Shows success/error toast

## Features

### ✅ Human-Readable Format

- Easy to read in messenger conversations
- Clear section headers and labels
- Organized by category

### ✅ Machine-Parseable

- Consistent format with markers
- Line-by-line parsing
- Key-value pair structure

### ✅ Comprehensive Data

- All text fields included
- Boolean values as Yes/No
- Optional fields handled gracefully

### ✅ Error Handling

- Validates clipboard format
- Graceful fallback on errors
- Clear error messages for users

### ✅ Dev-Only Feature

- Paste button only shown in dev/testing mode
- Controlled by `showDevControls` flag
- Safe for production environment

## Usage Examples

### Example 1: Network Error Recovery

1. Guest fills form and submits
2. Network error occurs: "Failed to submit form"
3. Guest clicks "Copy Booking Info" in error toast
4. Guest messages Facebook page with booking info
5. Admin opens form with `?testing=true`
6. Admin clicks "Paste Booking Info from Clipboard"
7. Form populates automatically
8. Admin uploads files and submits successfully

### Example 2: Booking Overlap

1. Guest tries to book dates already reserved
2. "Dates Already Booked" error appears
3. Guest copies booking info
4. Admin reviews in messenger
5. Admin suggests alternative dates
6. Guest provides alternative dates
7. Admin pastes info, updates dates, submits

## Browser Compatibility

The feature uses the modern Clipboard API:

- ✅ Chrome 66+
- ✅ Firefox 63+
- ✅ Safari 13.1+
- ✅ Edge 79+

## Security Considerations

- Clipboard access requires user interaction (button click)
- No automatic clipboard reading
- No sensitive data exposed (files not included)
- Paste feature only available in dev/testing mode
- No authentication data in copied text

## Future Enhancements

Potential improvements for future iterations:

1. **Base64 File Encoding**: Include files as base64 strings (may be too large)
2. **QR Code Generation**: Generate QR code for easy mobile sharing
3. **JSON Export**: Alternative format for programmatic processing
4. **Partial Import**: Allow selective field import
5. **Validation on Paste**: Validate pasted data before populating

## Testing

To test the feature:

1. Start dev server: `npm run dev`
2. Fill out form with various fields
3. Trigger submission error (disconnect network or use invalid data)
4. Click "Copy Booking Info" in error toast
5. Paste in text editor to verify format
6. Open new form instance
7. Click "Paste Booking Info from Clipboard"
8. Verify all fields populated correctly
9. Check edge cases (empty optional fields, special characters)

## Support

If you encounter issues:

- Check browser clipboard permissions
- Ensure you're in dev/testing mode for paste feature
- Verify booking info format includes markers
- Review browser console for error messages
