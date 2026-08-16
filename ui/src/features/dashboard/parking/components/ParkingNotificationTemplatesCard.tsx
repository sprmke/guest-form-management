import { useState } from 'react';

import { toast } from 'sonner';

import {
  useParkingSettings,
  useUpdateParkingSettings,
} from '@/features/dashboard/parking/hooks/useParkingSettings';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  embedded?: boolean;
};

const TEMPLATE_KEYS = [
  { key: 'reservation_request', label: 'Reservation request' },
  { key: 'check_in_reminder', label: 'Check-in reminder' },
  { key: 'payment_received', label: 'Payment received' },
] as const;

export function ParkingNotificationTemplatesCard({ embedded = false }: Props) {
  const { data, isLoading } = useParkingSettings();
  const updateSettings = useUpdateParkingSettings();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const templates = { ...(data?.parkingNotificationTemplates ?? {}), ...draft };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ parkingNotificationTemplates: templates });
      setDraft({});
      toast.success('Saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const content = (
    <div className="space-y-4">
      {TEMPLATE_KEYS.map(({ key, label }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`template-${key}`}>{label}</Label>
          <Textarea
            id={`template-${key}`}
            value={templates[key] ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
            rows={3}
            disabled={isLoading}
          />
        </div>
      ))}
      <Button type="button" onClick={() => void handleSave()} className="min-h-[44px]">
        Save
      </Button>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">{content}</CardContent>
    </Card>
  );
}
