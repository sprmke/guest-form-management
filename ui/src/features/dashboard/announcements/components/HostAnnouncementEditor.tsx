import type { ReactNode } from 'react';

import { SettingsField } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import {
  emptyHostAnnouncement,
  type HostAnnouncementDraft,
  type HostAnnouncementSeverity,
} from '@/features/dashboard/announcements/lib/hostAnnouncementTypes';
import {
  announcementScheduleEndFromDate,
  announcementScheduleStartFromDate,
  announcementScheduleToDate,
} from '@/features/dashboard/announcements/lib/hostAnnouncementSchedule';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DATE_PICKER_DISPLAY_FORMAT } from '@/utils/format/dates';

const SEVERITY_OPTIONS: Array<{ value: HostAnnouncementSeverity; label: string }> = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

type Props = {
  announcements: HostAnnouncementDraft[];
  disabled?: boolean;
  onChange: (announcements: HostAnnouncementDraft[]) => void;
  /** Optional actions rendered beside “Add announcement” (e.g. link to developments). */
  trailingActions?: ReactNode;
};

export function HostAnnouncementEditor({
  announcements,
  disabled = false,
  onChange,
  trailingActions,
}: Props) {
  const updateAnnouncement = (index: number, patch: Partial<HostAnnouncementDraft>) => {
    onChange(
      announcements.map((entry, i) =>
        i === index ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry
      )
    );
  };

  const removeAnnouncement = (index: number) => {
    onChange(announcements.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {announcements.map((announcement, index) => (
        <div key={announcement.id} className="space-y-3 rounded-xl border p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingsField id={`announcement-title-${announcement.id}`} label="Title" required>
              <Input
                id={`announcement-title-${announcement.id}`}
                value={announcement.title}
                onChange={(event) => updateAnnouncement(index, { title: event.target.value })}
                className="h-10"
                disabled={disabled}
              />
            </SettingsField>
            <SettingsField id={`announcement-severity-${announcement.id}`} label="Severity">
              <Select
                value={announcement.severity}
                onValueChange={(value) =>
                  updateAnnouncement(index, { severity: value as HostAnnouncementSeverity })
                }
                disabled={disabled}
              >
                <SelectTrigger id={`announcement-severity-${announcement.id}`} className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsField>
          </div>
          <SettingsField id={`announcement-body-${announcement.id}`} label="Message" required>
            <Textarea
              id={`announcement-body-${announcement.id}`}
              value={announcement.body}
              onChange={(event) => updateAnnouncement(index, { body: event.target.value })}
              rows={4}
              disabled={disabled}
            />
          </SettingsField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingsField id={`announcement-starts-${announcement.id}`} label="Starts">
              <fieldset disabled={disabled} className="min-w-0 border-0 p-0">
                <DatePicker
                  date={announcementScheduleToDate(announcement.startsAt)}
                  rangeEnd={announcementScheduleToDate(announcement.endsAt)}
                  placeholder={DATE_PICKER_DISPLAY_FORMAT}
                  maxDate={announcementScheduleToDate(announcement.endsAt)}
                  onSelect={(date) =>
                    updateAnnouncement(index, {
                      startsAt: date ? announcementScheduleStartFromDate(date) : null,
                    })
                  }
                />
              </fieldset>
            </SettingsField>
            <SettingsField id={`announcement-ends-${announcement.id}`} label="Ends">
              <fieldset disabled={disabled} className="min-w-0 border-0 p-0">
                <DatePicker
                  date={announcementScheduleToDate(announcement.endsAt)}
                  rangeEnd={announcementScheduleToDate(announcement.startsAt)}
                  placeholder={DATE_PICKER_DISPLAY_FORMAT}
                  minDate={announcementScheduleToDate(announcement.startsAt)}
                  onSelect={(date) =>
                    updateAnnouncement(index, {
                      endsAt: date ? announcementScheduleEndFromDate(date) : null,
                    })
                  }
                />
              </fieldset>
            </SettingsField>
            <SettingsField id={`announcement-link-${announcement.id}`} label="Link URL">
              <Input
                id={`announcement-link-${announcement.id}`}
                value={announcement.linkUrl ?? ''}
                onChange={(event) =>
                  updateAnnouncement(index, { linkUrl: event.target.value.trim() || null })
                }
                className="h-10"
                disabled={disabled}
              />
            </SettingsField>
            <SettingsField id={`announcement-link-label-${announcement.id}`} label="Link label">
              <Input
                id={`announcement-link-label-${announcement.id}`}
                value={announcement.linkLabel ?? ''}
                onChange={(event) =>
                  updateAnnouncement(index, { linkLabel: event.target.value.trim() || null })
                }
                className="h-10"
                disabled={disabled}
              />
            </SettingsField>
          </div>
          <label className="flex min-h-[44px] items-center gap-3">
            <Checkbox
              checked={announcement.active}
              onCheckedChange={(checked) => updateAnnouncement(index, { active: checked === true })}
              disabled={disabled}
            />
            <span className="text-sm">Active</span>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            disabled={disabled}
            onClick={() => removeAnnouncement(index)}
          >
            Remove
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px]"
          disabled={disabled}
          onClick={() => onChange([...announcements, emptyHostAnnouncement()])}
        >
          Add announcement
        </Button>
        {trailingActions}
      </div>
    </div>
  );
}
