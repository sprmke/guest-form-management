import { useEffect, useMemo, useRef, useState } from 'react';

import { Camera, Loader2, MapPin, Phone } from 'lucide-react';

import {
  useGuestProfile,
  useGuestProfileMutations,
} from '@/features/guest/account/hooks/useGuestProfile';
import {
  guestInitials,
  resolveGuestAvatarUrl,
  resolveGuestDisplayName,
} from '@/features/guest/account/lib/guestAccountIdentity';
import { useGuestSession } from '@/features/guest/auth/hooks/useGuestSession';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const BIO_MAX = 500;

interface ProfileDraft {
  displayName: string;
  bio: string;
  phone: string;
  locationLabel: string;
}

function draftFromProfile(
  session: ReturnType<typeof useGuestSession>['session'],
  profile: ReturnType<typeof useGuestProfile>['data']
): ProfileDraft {
  return {
    displayName: profile?.displayName ?? resolveGuestDisplayName(session, profile),
    bio: profile?.bio ?? '',
    phone: profile?.phone ?? '',
    locationLabel: profile?.locationLabel ?? '',
  };
}

function draftsEqual(a: ProfileDraft, b: ProfileDraft): boolean {
  return (
    a.displayName.trim() === b.displayName.trim() &&
    a.bio.trim() === b.bio.trim() &&
    a.phone.trim() === b.phone.trim() &&
    a.locationLabel.trim() === b.locationLabel.trim()
  );
}

export function GuestProfileForm() {
  const { session } = useGuestSession();
  const { data: profile, isLoading } = useGuestProfile();
  const { updateProfile, uploadAvatar } = useGuestProfileMutations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<ProfileDraft>({
    displayName: '',
    bio: '',
    phone: '',
    locationLabel: '',
  });
  const [savedDraft, setSavedDraft] = useState<ProfileDraft>(draft);

  useEffect(() => {
    if (!profile && !session) return;
    const next = draftFromProfile(session, profile);
    setDraft(next);
    setSavedDraft(next);
  }, [profile, session]);

  const avatarUrl = resolveGuestAvatarUrl(session, profile);
  const displayNamePreview = draft.displayName.trim() || 'Guest';
  const initials = guestInitials(displayNamePreview);
  const email = profile?.email ?? session?.user?.email ?? '';
  const isDirty = useMemo(() => !draftsEqual(draft, savedDraft), [draft, savedDraft]);
  const bioRemaining = BIO_MAX - draft.bio.length;

  const patchField = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    updateProfile.mutate(
      {
        displayName: draft.displayName.trim(),
        bio: draft.bio.trim() || null,
        phone: draft.phone.trim() || null,
        locationLabel: draft.locationLabel.trim() || null,
      },
      {
        onSuccess: () => {
          const trimmed: ProfileDraft = {
            displayName: draft.displayName.trim(),
            bio: draft.bio.trim(),
            phone: draft.phone.trim(),
            locationLabel: draft.locationLabel.trim(),
          };
          setDraft(trimmed);
          setSavedDraft(trimmed);
        },
      }
    );
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadAvatar.mutate(file);
    event.target.value = '';
  };

  if (isLoading) {
    return (
      <div className="border-border bg-card w-full overflow-hidden rounded-2xl border shadow-sm">
        <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:p-10">
          <div className="flex flex-col items-center gap-4 sm:items-start">
            <div className="bg-muted size-28 shrink-0 animate-pulse rounded-full sm:size-32" />
            <div className="w-full space-y-2 text-center sm:text-left">
              <div className="bg-muted mx-auto h-6 w-40 animate-pulse rounded-md sm:mx-0" />
              <div className="bg-muted mx-auto h-4 w-32 animate-pulse rounded-md sm:mx-0" />
            </div>
          </div>

          <div className="space-y-6 lg:space-y-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
              <div className="space-y-2 lg:col-span-2">
                <div className="bg-muted h-4 w-24 animate-pulse rounded-md" />
                <div className="bg-muted h-11 animate-pulse rounded-md" />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <div className="bg-muted h-4 w-16 animate-pulse rounded-md" />
                <div className="bg-muted h-[120px] animate-pulse rounded-md" />
              </div>
              <div className="space-y-2">
                <div className="bg-muted h-4 w-16 animate-pulse rounded-md" />
                <div className="bg-muted h-11 animate-pulse rounded-md" />
              </div>
              <div className="space-y-2">
                <div className="bg-muted h-4 w-20 animate-pulse rounded-md" />
                <div className="bg-muted h-11 animate-pulse rounded-md" />
              </div>
            </div>
            <div className="border-border flex justify-end border-t pt-6 lg:pt-8">
              <div className="bg-muted h-11 w-32 animate-pulse rounded-md" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border bg-card w-full overflow-hidden rounded-2xl border shadow-sm">
      <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:p-10">
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-4 sm:items-start">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative shrink-0"
              aria-label="Change profile photo"
            >
              <Avatar className="ring-background size-28 shadow-md ring-4 sm:size-32">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback className="from-primary/90 to-primary bg-gradient-to-br text-2xl text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="bg-background/90 absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {uploadAvatar.isPending ? (
                  <Loader2 className="text-foreground size-6 animate-spin" aria-hidden />
                ) : (
                  <Camera className="text-foreground size-6" aria-hidden />
                )}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="min-w-0 space-y-3 text-center sm:text-left">
            <div>
              <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                {displayNamePreview}
              </h2>
              {email ? (
                <p className="text-muted-foreground mt-1 truncate text-sm">{email}</p>
              ) : null}
            </div>
            {(draft.locationLabel.trim() || draft.phone.trim() || draft.bio.trim()) && (
              <div className="text-muted-foreground space-y-1.5 text-sm">
                {draft.locationLabel.trim() ? (
                  <p className="flex items-center justify-center gap-1.5 sm:justify-start">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{draft.locationLabel.trim()}</span>
                  </p>
                ) : null}
                {draft.phone.trim() ? (
                  <p className="flex items-center justify-center gap-1.5 sm:justify-start">
                    <Phone className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{draft.phone.trim()}</span>
                  </p>
                ) : null}
                {draft.bio.trim() ? (
                  <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                    {draft.bio.trim()}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 lg:space-y-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="guest-display-name">Display name</Label>
              <Input
                id="guest-display-name"
                value={draft.displayName}
                onChange={(event) => patchField('displayName', event.target.value)}
                maxLength={80}
                className="h-11"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <div className="flex items-end justify-between gap-3">
                <Label htmlFor="guest-bio">Bio</Label>
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    bioRemaining < 40 ? 'text-destructive' : 'text-muted-foreground'
                  )}
                  aria-live="polite"
                >
                  {bioRemaining}
                </span>
              </div>
              <Textarea
                id="guest-bio"
                value={draft.bio}
                onChange={(event) => patchField('bio', event.target.value)}
                rows={4}
                maxLength={BIO_MAX}
                className="min-h-[120px] resize-y"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-phone">Phone</Label>
              <div className="relative">
                <Phone
                  className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  id="guest-phone"
                  value={draft.phone}
                  onChange={(event) => patchField('phone', event.target.value)}
                  className="h-11 pl-10"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest-location">Location</Label>
              <div className="relative">
                <MapPin
                  className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  id="guest-location"
                  value={draft.locationLabel}
                  onChange={(event) => patchField('locationLabel', event.target.value)}
                  className="h-11 pl-10"
                  maxLength={120}
                  autoComplete="address-level2"
                />
              </div>
            </div>
          </div>

          <div
            className={cn(
              'border-border flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-end lg:pt-8',
              isDirty && 'lg:justify-between'
            )}
          >
            {isDirty ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-[44px] sm:mr-auto"
                onClick={() => setDraft(savedDraft)}
                disabled={updateProfile.isPending}
              >
                Cancel
              </Button>
            ) : (
              <span className="hidden sm:block" aria-hidden />
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || updateProfile.isPending}
              className="min-h-[44px] min-w-[7.5rem]"
            >
              {updateProfile.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
