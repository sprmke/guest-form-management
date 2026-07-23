import { OnboardingProofUpload } from '@/features/dashboard/org/components/onboarding/OnboardingProofUpload';
import { SocialPlatformSelect } from '@/features/dashboard/org/components/verification/GetVerifiedModal';
import {
  propertyAccessScreenshotHelp,
  validateVerificationFile,
  type OrgSocialProofPlatform,
} from '@/features/dashboard/org/lib/orgVerification';

type Props = {
  sectionId: string;
  title: string;
  subtitle: string;
  platformLabel: string;
  platformHelp: string;
  platformValue: OrgSocialProofPlatform | '';
  onPlatformChange: (value: OrgSocialProofPlatform) => void;
  platformError: string | null;
  screenshotFile: File | null;
  screenshotPreview: string | null;
  screenshotError: string | null;
  onScreenshotChange: (file: File | null, preview: string | null) => void;
  onUploadError: (message: string | null) => void;
};

export function OnboardingHostAccessVerificationSection({
  sectionId,
  title,
  subtitle,
  platformLabel,
  platformHelp,
  platformValue,
  onPlatformChange,
  platformError,
  screenshotFile,
  screenshotPreview,
  screenshotError,
  onScreenshotChange,
  onUploadError,
}: Props) {
  const kind = sectionId.includes('parking') ? 'parking' : 'property';

  return (
    <div className="border-border space-y-4 rounded-xl border p-3 sm:p-4">
      <div className="space-y-0.5">
        <p className="text-foreground text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground text-xs leading-snug">{subtitle}</p>
      </div>
      <SocialPlatformSelect
        id={`${sectionId}-platform`}
        label={platformLabel}
        help={platformHelp}
        value={platformValue}
        onChange={onPlatformChange}
        error={platformError}
      />
      <OnboardingProofUpload
        id={`${sectionId}-access-screenshot`}
        label="Access screenshot"
        help={propertyAccessScreenshotHelp(platformValue, kind)}
        file={screenshotFile}
        previewUrl={screenshotPreview}
        error={screenshotError}
        onFileChange={(file, preview) => {
          if (file) {
            const err = validateVerificationFile(file);
            if (err) {
              onUploadError(err);
              onScreenshotChange(null, null);
              return;
            }
          }
          onUploadError(null);
          onScreenshotChange(file, preview);
        }}
      />
    </div>
  );
}
