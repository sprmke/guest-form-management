# Pet Form PDF and Email Implementation Summary

## Overview

This document summarizes the implementation of the Pet Form PDF generation and separate Pet Request email functionality.

## Changes Made

### 1. Frontend Changes

#### Schema Updates (`ui/src/features/guest-form/schemas/guestFormSchema.ts`)

- ✅ Added `petType` field to the schema (optional string)
- ✅ Added validation for `petType` when `hasPets` is true (required field)

#### Form UI Updates (`ui/src/features/guest-form/components/GuestForm.tsx`)

- ✅ Added Pet Type input field between Pet Name and Pet Breed fields
- ✅ Field uses `toCapitalCase` transformation like other pet fields
- ✅ Placeholder: "Ex. Dog, Cat"
- ✅ Shows red asterisk (\*) when `hasPets` is true
- ✅ Default value: "Dog"

#### Default Form Values (`ui/src/features/guest-form/constants/guestFormData.ts`)

- ✅ Added `petType: 'Dog'` to default form values to prevent uncontrolled component warning

### 2. Backend Changes

#### Types Updates (`supabase/functions/_shared/types.ts`)

- ✅ Added `petType?: string` to `GuestFormData` interface
- ✅ Added `pet_type?: string` to `GuestSubmission` interface (database schema)
- ✅ Updated `transformFormToSubmission` function to include `petType`

#### Database Service Updates (`supabase/functions/_shared/databaseService.ts`)

- ✅ Added `petType` to the data transformation when fetching form data

#### Database Migration (`supabase/migrations/20250220000000_add_pet_type.sql`)

- ✅ Created migration to add `pet_type` column to `guest_submissions` table
- ✅ Added column comment for documentation

#### Calendar Service Updates (`supabase/functions/_shared/calendarService.ts`)

- ✅ Added Pet Type to the calendar event description
- ✅ Displays in the Pet Information section
- ⚠️ **Note:** Pet Type is NOT added to Google Sheets as per requirements

#### PDF Service Updates (`supabase/functions/_shared/pdfService.ts`)

- ✅ Updated `getTemplateBytes()` to accept template name parameter
- ✅ Created helper function `extractTowerAndUnit()` to parse tower and unit number
- ✅ Created new `generatePetPDF()` function with the following mappings:
  - `unitOwner` - from formData.unitOwner
  - `unitNumber` - extracted from towerAndUnitNumber
  - `unitTower` - extracted from towerAndUnitNumber
  - `checkInDate` - from formData.checkInDate
  - `unitOwnerSignatureName` - same as unitOwner
  - `petName` - from formData.petName
  - `petType` - from formData.petType (NEW)
  - `petAge` - from formData.petAge
  - `petBreed` - from formData.petBreed
  - `petVaccinationDate` - from formData.petVaccinationDate

#### Email Service Updates (`supabase/functions/_shared/emailService.ts`)

- ✅ Created new `sendPetEmail()` function with:
  - Subject: `Monaco 2604 - Pet Request (${checkInDate})`
  - From: `Monaco 2604 - Pet Request <mail@kamehomes.space>`
  - Same email config (to, cc, reply_to) as GAF email
  - Professional email content explaining the pet request
  - Displays all pet details in the email body including Pet Type
  - Attachments:
    - Pet Form PDF (if generated)
    - Pet vaccination record (downloaded from Supabase Storage using authenticated client)
    - Pet image (downloaded from Supabase Storage using authenticated client)
  - Uses Supabase client to download files from storage with proper authentication
  - Includes detailed logging of attachment process

#### Submit Form Updates (`supabase/functions/submit-form/index.ts`)

- ✅ Imported `generatePetPDF` and `sendPetEmail` functions
- ✅ Added logic to check if guest has pets and all required pet fields are filled
- ✅ Generates Pet PDF when `generatePdf=true` flag is set
- ✅ Sends Pet Request email when `sendEmail=true` flag is set
- ✅ Both operations happen after the GAF email is sent
- ✅ Error handling: Pet PDF/email errors don't stop the main flow

## Required Action

### ⚠️ IMPORTANT: Upload Pet Form Template PDF

You need to upload the Pet Form PDF template to Supabase Storage:

1. Make sure your Pet Form PDF from Adobe Acrobat has the following field names:

   - `unitOwner`
   - `unitNumber`
   - `unitTower`
   - `checkInDate`
   - `unitOwnerSignatureName`
   - `petName`
   - `petType` (NEW FIELD)
   - `petAge`
   - `petBreed`
   - `petVaccinationDate`

2. Upload the PDF file to Supabase Storage:

   - Bucket: `templates`
   - Filename: `pet-form-template.pdf`
   - Path: `/templates/pet-form-template.pdf`

3. You can upload via:
   - Supabase Dashboard: Storage → templates bucket → Upload
   - Or use the Supabase CLI

## How It Works

### User Flow

1. Guest enables "Has Pet" checkbox on the form
2. Guest fills in all required pet fields including the new **Pet Type** field
3. Guest uploads pet vaccination record and pet image
4. Guest submits the form

### Backend Processing

1. Form data is processed and saved to database (including pet_type)
2. **GAF Request** email is sent with GAF PDF
3. If guest has pets and all pet fields are filled:
   - Pet Form PDF is generated with all pet details
   - Pet Request email is sent with:
     - Pet Form PDF attached
     - Pet vaccination record attached
     - Pet image attached
4. Google Calendar event is created/updated with pet information (including Pet Type)
5. Google Sheets is updated (Pet Type is NOT included as per requirements)

### Email Details

**GAF Request Email:**

- Subject: `Monaco 2604 - GAF Request (${checkInDate})`
- From: `Monaco 2604 - GAF Request <mail@kamehomes.space>`
- Attachments: GAF PDF

**Pet Request Email:**

- Subject: `Monaco 2604 - Pet Request (${checkInDate})`
- From: `Monaco 2604 - Pet Request <mail@kamehomes.space>`
- Content: Professional pet request letter with all pet details
- Attachments:
  - Pet Form PDF
  - Pet vaccination record image
  - Pet image

Both emails use the same recipient configuration (to, cc, reply_to).

## Testing Checklist

- [ ] Upload pet-form-template.pdf to Supabase Storage
- [ ] Run database migration: `supabase migration up`
- [ ] Test form submission with pets enabled
- [ ] Verify Pet Type field appears and is required when "Has Pet" is checked
- [ ] Verify Pet Form PDF is generated with correct data
- [ ] Verify Pet Request email is sent separately from GAF email
- [ ] Verify pet images are attached to the Pet Request email
- [ ] Verify Google Calendar event includes Pet Type
- [ ] Verify Google Sheets does NOT include Pet Type column

## Files Modified

### Frontend (UI)

1. `ui/src/features/guest-form/schemas/guestFormSchema.ts`
2. `ui/src/features/guest-form/components/GuestForm.tsx`
3. `ui/src/features/guest-form/constants/guestFormData.ts`

### Backend (Supabase Functions)

1. `supabase/functions/_shared/types.ts`
2. `supabase/functions/_shared/databaseService.ts`
3. `supabase/functions/_shared/calendarService.ts`
4. `supabase/functions/_shared/pdfService.ts`
5. `supabase/functions/_shared/emailService.ts`
6. `supabase/functions/submit-form/index.ts`

### Database

1. `supabase/migrations/20250220000000_add_pet_type.sql` (NEW)

## Notes

- Pet Type is displayed in Google Calendar event description
- Pet Type is NOT added to Google Sheets as per requirements
- Pet PDF generation and email sending are separate from GAF processing
- Errors in Pet PDF/email processing won't affect the main form submission
- The implementation follows the same pattern as the existing GAF PDF generation
