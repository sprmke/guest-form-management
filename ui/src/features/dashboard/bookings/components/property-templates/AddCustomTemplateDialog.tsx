import * as React from 'react';

import { Plus } from 'lucide-react';

import { RichTextEditor } from '@/features/dashboard/bookings/components/property-templates/RichTextEditor';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  onAdd: (name: string, content: string) => Promise<void>;
  busy?: boolean;
};

export function AddCustomTemplateDialog({ onAdd, busy }: Props) {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="min-h-[44px]">
          <Plus className="mr-2 h-4 w-4" />
          Add Custom Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(90dvh,720px)] max-w-[min(calc(100vw-1.5rem),48rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create custom template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
        <DialogFooter className="gap-1">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || !name.trim()} onClick={() => void handleAdd()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
