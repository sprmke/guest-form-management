import { useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { Briefcase, Bug, HelpCircle, Lightbulb, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { TicketAttachmentDropzone } from '@/features/dashboard/help-support/components/TicketAttachmentDropzone';
import { useSubmitSupportTicket } from '@/features/dashboard/help-support/hooks/useSupportTickets';
import {
  helpSupportTicketDetailPath,
  useHelpSupportBasePath,
} from '@/features/dashboard/help-support/lib/helpSupportPaths';
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_CATEGORY_DESCRIPTIONS,
  SUPPORT_TICKET_CATEGORY_LABELS,
  SUPPORT_TICKET_SEVERITIES,
  supportTicketFormSchema,
  type SupportTicketAttachmentDraft,
  type SupportTicketCategory,
} from '@/features/dashboard/help-support/lib/supportTicketSchema';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { usePageTitle } from '@/lib/pageTitle';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<SupportTicketCategory, typeof Bug> = {
  bug_report: Bug,
  feature_suggestion: Lightbulb,
  general_inquiry: HelpCircle,
  business_inquiry: Briefcase,
};

function CategoryCard({
  category,
  selected,
  onSelect,
}: {
  category: SupportTicketCategory;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'min-h-[44px] rounded-xl border px-3 py-3 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5 border-2'
          : 'border-border bg-card hover:bg-muted/40 border'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
        <div>
          <p className="text-foreground text-sm font-semibold">
            {SUPPORT_TICKET_CATEGORY_LABELS[category]}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
            {SUPPORT_TICKET_CATEGORY_DESCRIPTIONS[category]}
          </p>
        </div>
      </div>
    </button>
  );
}

export function SubmitTicketPage() {
  usePageTitle('New ticket');
  const navigate = useNavigate();
  const basePath = useHelpSupportBasePath();
  const submitTicket = useSubmitSupportTicket();

  const [category, setCategory] = useState<SupportTicketCategory>('bug_report');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<(typeof SUPPORT_TICKET_SEVERITIES)[number]>('medium');
  const [expectedBenefit, setExpectedBenefit] = useState('');
  const [contactPreference, setContactPreference] = useState('');
  const [attachments, setAttachments] = useState<SupportTicketAttachmentDraft[]>([]);

  const pageUrl = useMemo(
    () => (typeof window === 'undefined' ? '' : window.location.href),
    []
  );
  const browserInfo = useMemo(
    () => (typeof navigator === 'undefined' ? '' : navigator.userAgent),
    []
  );

  const subjectLabel = category === 'feature_suggestion' ? 'Title' : 'Subject';
  const descriptionLabel =
    category === 'general_inquiry' || category === 'business_inquiry' ? 'Message' : 'Description';

  const handleSubmit = async () => {
    const values =
      category === 'bug_report'
        ? { category, subject, description, pageUrl, browserInfo, severity, attachments }
        : category === 'feature_suggestion'
          ? { category, subject, description, expectedBenefit: expectedBenefit || undefined }
          : category === 'business_inquiry'
            ? { category, subject, description, contactPreference: contactPreference || undefined }
            : { category, subject, description };

    const parsed = supportTicketFormSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Please check the form and try again');
      return;
    }

    try {
      const result = await submitTicket.mutateAsync({
        category: parsed.data.category,
        subject: parsed.data.subject,
        description: parsed.data.description,
        pageUrl: 'pageUrl' in parsed.data ? parsed.data.pageUrl : undefined,
        browserInfo: 'browserInfo' in parsed.data ? parsed.data.browserInfo : undefined,
        severity: 'severity' in parsed.data ? parsed.data.severity : undefined,
        expectedBenefit: 'expectedBenefit' in parsed.data ? parsed.data.expectedBenefit : undefined,
        contactPreference:
          'contactPreference' in parsed.data ? parsed.data.contactPreference : undefined,
        attachments: 'attachments' in parsed.data ? parsed.data.attachments : undefined,
      });
      toast.success('Ticket submitted');
      if (basePath) {
        navigate(helpSupportTicketDetailPath(basePath, result.ticket.id));
      }
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not submit ticket'));
    }
  };

  return (
    <AdminMobilePage title="New ticket" titleId="submit-ticket-heading">
      <div className="max-w-2xl space-y-6">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
            What&apos;s this about?
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SUPPORT_TICKET_CATEGORIES.map((value) => (
              <CategoryCard
                key={value}
                category={value}
                selected={category === value}
                onSelect={() => setCategory(value)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ticket-subject">{subjectLabel}</Label>
          <Input
            id="ticket-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ticket-description">{descriptionLabel}</Label>
          <Textarea
            id="ticket-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            maxLength={5000}
          />
        </div>

        {category === 'bug_report' ? (
          <div className="space-y-1.5">
            <Label htmlFor="ticket-severity">Severity</Label>
            <Select
              value={severity}
              onValueChange={(value) => setSeverity(value as (typeof SUPPORT_TICKET_SEVERITIES)[number])}
            >
              <SelectTrigger id="ticket-severity" className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_TICKET_SEVERITIES.map((value) => (
                  <SelectItem key={value} value={value} className="capitalize">
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TicketAttachmentDropzone value={attachments} onChange={setAttachments} />
          </div>
        ) : null}

        {category === 'feature_suggestion' ? (
          <div className="space-y-1.5">
            <Label htmlFor="ticket-expected-benefit">Expected benefit (optional)</Label>
            <Textarea
              id="ticket-expected-benefit"
              value={expectedBenefit}
              onChange={(event) => setExpectedBenefit(event.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
        ) : null}

        {category === 'business_inquiry' ? (
          <div className="space-y-1.5">
            <Label htmlFor="ticket-contact-preference">Preferred contact method (optional)</Label>
            <Input
              id="ticket-contact-preference"
              value={contactPreference}
              onChange={(event) => setContactPreference(event.target.value)}
              maxLength={200}
              placeholder="e.g. email, phone call"
            />
          </div>
        ) : null}

        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitTicket.isPending}
          className="min-h-[44px] w-full sm:w-auto"
        >
          {submitTicket.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Submit ticket
        </Button>
      </div>
    </AdminMobilePage>
  );
}
