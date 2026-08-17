import { useEffect, useState } from 'react';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { AdminHelpCenterFaq } from '@/features/dashboard/super-admin/hooks/useHelpCenterFaqsAdmin';
import {
  useCreateHelpCenterFaq,
  useUpdateHelpCenterFaq,
} from '@/features/dashboard/super-admin/hooks/useHelpCenterFaqsAdmin';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Textarea } from '@/components/ui/textarea';
import { friendlyToastError } from '@/lib/feedback/toastMessages';

type Props = {
  faq: AdminHelpCenterFaq | 'new' | null;
  categories: string[];
  onOpenChange: (open: boolean) => void;
};

export function SuperAdminFaqEditorDialog({ faq, categories, onOpenChange }: Props) {
  const isNew = faq === 'new';
  const editing = faq && faq !== 'new' ? faq : null;

  const [category, setCategory] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const createFaq = useCreateHelpCenterFaq();
  const updateFaq = useUpdateHelpCenterFaq();
  const isPending = createFaq.isPending || updateFaq.isPending;

  useEffect(() => {
    setCategory(editing?.category ?? categories[0] ?? '');
    setQuestion(editing?.question ?? '');
    setAnswer(editing?.answer ?? '');
  }, [editing, categories]);

  const handleSave = async () => {
    if (!category.trim() || !question.trim() || !answer.trim()) {
      toast.error('Category, question, and answer are required');
      return;
    }
    try {
      if (isNew) {
        await createFaq.mutateAsync({
          category: category.trim(),
          question: question.trim(),
          answer: answer.trim(),
        });
        toast.success('FAQ added');
      } else if (editing) {
        await updateFaq.mutateAsync({
          id: editing.id,
          category: category.trim(),
          question: question.trim(),
          answer: answer.trim(),
        });
        toast.success('FAQ updated');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not save FAQ'));
    }
  };

  return (
    <ResponsiveModal open={Boolean(faq)} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="sm:max-w-lg">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{isNew ? 'Add FAQ' : 'Edit FAQ'}</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <div className="space-y-3 px-5 sm:px-6">
          <div className="space-y-1.5">
            <Label htmlFor="faq-category">Category</Label>
            <Input
              id="faq-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              list="faq-categories"
              maxLength={80}
            />
            <datalist id="faq-categories">
              {categories.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="faq-question">Question</Label>
            <Textarea
              id="faq-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={2}
              maxLength={300}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="faq-answer">Answer</Label>
            <Textarea
              id="faq-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={4}
              maxLength={2000}
            />
          </div>
        </div>

        <ResponsiveModalFooter>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isPending}
            className="min-h-[44px] w-full sm:w-auto"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
