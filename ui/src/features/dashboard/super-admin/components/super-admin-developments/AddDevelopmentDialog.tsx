import { useState } from 'react';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateDevelopment } from '@/features/dashboard/super-admin/hooks/useDevelopments';
import { DEVELOPMENT_TYPES } from '@/features/dashboard/super-admin/lib/developmentSettingsConstants';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (slug: string) => void;
};

export function AddDevelopmentDialog({ open, onOpenChange, onCreated }: Props) {
  const createDevelopment = useCreateDevelopment();
  const [name, setName] = useState('');
  const [type, setType] = useState<string>(DEVELOPMENT_TYPES[0]!.value);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName('');
      setType(DEVELOPMENT_TYPES[0]!.value);
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    try {
      const development = await createDevelopment.mutateAsync({ name: trimmed, type });
      toast.success('Development created');
      handleOpenChange(false);
      onCreated(development.slug);
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not create development'));
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
      <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Add development</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="development-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="development-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="development-type" className="text-sm font-medium">
              Type
            </label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="development-type" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEVELOPMENT_TYPES.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ResponsiveModalFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={createDevelopment.isPending}
            onClick={() => void handleSubmit()}
            className="min-h-[44px]"
          >
            {createDevelopment.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              'Create'
            )}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
