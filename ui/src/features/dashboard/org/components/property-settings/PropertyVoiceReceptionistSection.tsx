import * as React from 'react';

import { Mic } from 'lucide-react';
import { toast } from 'sonner';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import {
  buildVoiceReceptionistPatch,
  useUpdateVoiceReceptionistSettings,
  useVoiceReceptionistSettings,
  voiceReceptionistFormIsDirty,
  voiceReceptionistToFormValues,
  type VoiceReceptionistFormValues,
} from '@/features/dashboard/bookings/hooks/useVoiceReceptionistSettings';
import { SettingsField } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

function VoiceReceptionistSectionSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="bg-muted h-10 animate-pulse rounded-lg" />
      <div className="bg-muted h-10 animate-pulse rounded-lg" />
      <div className="bg-muted h-24 animate-pulse rounded-lg" />
    </div>
  );
}

export function PropertyVoiceReceptionistSection() {
  const { data, isLoading, isError, error } = useVoiceReceptionistSettings();
  const update = useUpdateVoiceReceptionistSettings();

  const [draft, setDraft] = React.useState<VoiceReceptionistFormValues | null>(null);
  const [baseline, setBaseline] = React.useState<VoiceReceptionistFormValues | null>(null);
  const dirtyRef = React.useRef(false);

  React.useEffect(() => {
    if (!data) return;
    if (dirtyRef.current) return;
    const values = voiceReceptionistToFormValues(data);
    setDraft(values);
    setBaseline(values);
  }, [data]);

  const isDirty = draft && baseline ? voiceReceptionistFormIsDirty(draft, baseline) : false;
  dirtyRef.current = isDirty;

  const setField = <K extends keyof VoiceReceptionistFormValues>(
    key: K,
    value: VoiceReceptionistFormValues[K]
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const busy = isLoading || update.isPending;

  const handleSave = () => {
    if (!draft) return;
    update.mutate(buildVoiceReceptionistPatch(draft), {
      onSuccess: (saved) => {
        const values = voiceReceptionistToFormValues(saved);
        setDraft(values);
        setBaseline(values);
        toast.success('Voice receptionist settings saved');
      },
      onError: (err: unknown) => toast.error(friendlyToastError(err, 'Could not save settings')),
    });
  };

  return (
    <AdminSection
      id="voice-receptionist"
      title="Voice Receptionist"
      icon={Mic}
      description="AI phone-style assistant guests can talk to for check-in, wifi, parking, and other stay questions."
    >
      {isError ? (
        <p className="text-destructive text-sm">
          {(error as Error)?.message ?? 'Could not load voice receptionist settings'}
        </p>
      ) : null}

      {isLoading || !draft ? (
        <VoiceReceptionistSectionSkeleton />
      ) : (
        <div className="space-y-4">
          <div className="border-border/40 bg-muted/15 flex min-h-[44px] items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
            <label htmlFor="voice-receptionist-enabled" className="text-sm font-medium">
              Enable voice receptionist
            </label>
            <Switch
              id="voice-receptionist-enabled"
              checked={draft.enabled}
              disabled={busy}
              onCheckedChange={(checked) => setField('enabled', checked)}
              aria-label="Enable voice receptionist"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingsField id="voice-receptionist-voice" label="Voice">
              <NativeSelect
                id="voice-receptionist-voice"
                disabled={busy}
                value={draft.voiceId}
                onChange={(event) => setField('voiceId', event.target.value)}
              >
                {data?.availableVoices.map((voice) => (
                  <option key={voice} value={voice}>
                    {voice}
                  </option>
                ))}
              </NativeSelect>
            </SettingsField>
          </div>

          <SettingsField
            id="voice-receptionist-persona"
            label="Persona prompt"
            hintBelow="Optional tone/personality guidance appended to the guest-safe instructions."
          >
            <Textarea
              id="voice-receptionist-persona"
              rows={3}
              disabled={busy}
              value={draft.personaPrompt}
              onChange={(event) => setField('personaPrompt', event.target.value)}
              maxLength={2000}
            />
          </SettingsField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SettingsField id="voice-receptionist-max-seconds" label="Max session length (sec)">
              <Input
                id="voice-receptionist-max-seconds"
                type="number"
                min={1}
                disabled={busy}
                value={draft.maxSessionSeconds}
                onChange={(event) => setField('maxSessionSeconds', Number(event.target.value) || 1)}
                className="h-10"
              />
            </SettingsField>
            <SettingsField id="voice-receptionist-max-daily" label="Max sessions per guest / day">
              <Input
                id="voice-receptionist-max-daily"
                type="number"
                min={1}
                disabled={busy}
                value={draft.maxSessionsPerGuestPerDay}
                onChange={(event) =>
                  setField('maxSessionsPerGuestPerDay', Number(event.target.value) || 1)
                }
                className="h-10"
              />
            </SettingsField>
            <SettingsField id="voice-receptionist-max-concurrent" label="Max concurrent sessions">
              <Input
                id="voice-receptionist-max-concurrent"
                type="number"
                min={1}
                disabled={busy}
                value={draft.maxConcurrentSessions}
                onChange={(event) =>
                  setField('maxConcurrentSessions', Number(event.target.value) || 1)
                }
                className="h-10"
              />
            </SettingsField>
          </div>

          <div className={cn('flex justify-end', !isDirty && 'hidden')}>
            <Button
              type="button"
              size="sm"
              className="min-h-[44px]"
              disabled={busy}
              onClick={handleSave}
            >
              {update.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </AdminSection>
  );
}
