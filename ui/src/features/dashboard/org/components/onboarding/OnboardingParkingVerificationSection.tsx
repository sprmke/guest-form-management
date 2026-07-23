import { OnboardingProofUpload } from '@/features/dashboard/org/components/onboarding/OnboardingProofUpload';
import { VerificationFieldLabel } from '@/features/dashboard/org/components/onboarding/VerificationFieldLabel';
import {
  ORG_PARKING_RELATIONSHIPS,
  parkingOwnershipProofHelp,
  parkingRelationshipNeedsContractEnd,
  validateVerificationFile,
  type OrgParkingRelationship,
} from '@/features/dashboard/org/lib/orgVerification';

import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  DATE_PICKER_DISPLAY_FORMAT,
  getManilaYmdToday,
  stringToDate,
  dateToString,
} from '@/utils/format/dates';

type Props = {
  relationship: OrgParkingRelationship | '';
  onRelationshipChange: (value: OrgParkingRelationship) => void;
  relationshipError: string | null;
  contractEndDate: string;
  onContractEndDateChange: (value: string) => void;
  contractEndDateError: string | null;
  proofFile: File | null;
  proofPreview: string | null;
  proofError: string | null;
  onProofChange: (file: File | null, preview: string | null) => void;
  onUploadError: (message: string | null) => void;
};

export function OnboardingParkingVerificationSection({
  relationship,
  onRelationshipChange,
  relationshipError,
  contractEndDate,
  onContractEndDateChange,
  contractEndDateError,
  proofFile,
  proofPreview,
  proofError,
  onProofChange,
  onUploadError,
}: Props) {
  const showContractEnd = parkingRelationshipNeedsContractEnd(relationship);
  const minContractEndDate = stringToDate(getManilaYmdToday());

  return (
    <div className="border-border space-y-4 rounded-xl border p-3 sm:p-4">
      <div className="space-y-0.5">
        <p className="text-foreground text-sm font-semibold">Parking verification</p>
        <p className="text-muted-foreground text-xs leading-snug">
          Tell us how you&apos;re connected to this slot and upload supporting proof.
        </p>
      </div>

      <div className="space-y-2">
        <VerificationFieldLabel
          label="Your relationship to this slot"
          help="Select option which best describes your parking slot arrangement, then upload the corresponding documents."
          required
        />
        <RadioGroup
          value={relationship || undefined}
          onValueChange={(value) => onRelationshipChange(value as OrgParkingRelationship)}
          className="gap-2"
          aria-invalid={Boolean(relationshipError)}
        >
          {ORG_PARKING_RELATIONSHIPS.map((option) => (
            <Label
              key={option.value}
              htmlFor={`parking-relationship-${option.value}`}
              className={cn(
                'border-border hover:bg-muted/40 flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                relationship === option.value && 'border-primary/40 bg-primary/5'
              )}
            >
              <RadioGroupItem
                id={`parking-relationship-${option.value}`}
                value={option.value}
                className="shrink-0"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </Label>
          ))}
        </RadioGroup>
        {relationshipError ? (
          <p role="alert" className="text-destructive text-xs">
            {relationshipError}
          </p>
        ) : null}
      </div>

      {showContractEnd ? (
        <div className="space-y-1.5">
          <VerificationFieldLabel
            htmlFor="parking-contract-end"
            label="Contract end date"
            help="When your lease or sublease ends. We will require verification again after this date."
            required
          />
          <DatePicker
            date={contractEndDate ? stringToDate(contractEndDate) : undefined}
            minDate={minContractEndDate}
            placeholder={DATE_PICKER_DISPLAY_FORMAT}
            onSelect={(date) => {
              onContractEndDateChange(date ? dateToString(date) : '');
            }}
            className={cn(contractEndDateError && 'border-destructive')}
          />
          {contractEndDateError ? (
            <p role="alert" className="text-destructive text-xs">
              {contractEndDateError}
            </p>
          ) : null}
        </div>
      ) : null}

      <OnboardingProofUpload
        id="parking-ownership-proof"
        label="Proof of ownership or management"
        help={parkingOwnershipProofHelp(relationship)}
        file={proofFile}
        previewUrl={proofPreview}
        error={proofError}
        onFileChange={(file, preview) => {
          if (file) {
            const err = validateVerificationFile(file);
            if (err) {
              onUploadError(err);
              onProofChange(null, null);
              return;
            }
          }
          onUploadError(null);
          onProofChange(file, preview);
        }}
      />
    </div>
  );
}
