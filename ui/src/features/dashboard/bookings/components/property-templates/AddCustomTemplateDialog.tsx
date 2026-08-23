import * as React from 'react';

import { Plus } from 'lucide-react';

import { RichTextEditor } from '@/features/dashboard/bookings/components/property-templates/RichTextEditor';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from '@/components/ui/responsive-modal';

type Props = {
  onAdd: (name: string, content: string) => Promise<void>;
  busy?: boolean;
  /** Optional custom trigger (e.g. mobile hero icon button). */
  trigger?: React.ReactNode;
};

export function AddCustomTemplateDialog({ onAdd, busy, trigger }: Props) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [content, setContent] = React.useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await onAdd(name.trim(), content);
    setName('');
    setContent('');
    setOpen(false);
  };

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm" className="min-h-[44px]">
            <Plus className="mr-2 h-4 w-4" />
            Add Custom Template
          </Button>
        )}
      </ResponsiveModalTrigger>
      <ResponsiveModalContent
        sheetLayout="split"
        className="flex max-h-[min(90dvh,720px)] max-w-[min(calc(100vw-1.5rem),48rem)] flex-col gap-0 overflow-hidden p-0"
      >
        <ResponsiveModalHeader className="shrink-0 px-6 pt-6">
          <ResponsiveModalTitle>Create custom template</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="custom-template-name">Name</Label>
            <Input
              id="custom-template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
            />
          </div>
          <RichTextEditor content={content} onChange={setContent} minHeight="240px" />
        </div>
        <ResponsiveModalFooter className="shrink-0 gap-1 px-6 pb-6 pt-3">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || !name.trim()} onClick={() => void handleAdd()}>
            Create
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
