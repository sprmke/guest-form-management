import { useMemo, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { ArrowDown, ArrowUp, HelpCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AdminListPagination,
  AdminListPerPageSelect,
} from '@/features/dashboard/bookings/components/AdminListToolbar';
import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminEmptyState } from '@/features/dashboard/super-admin/components/shared/SuperAdminEmptyState';
import { SuperAdminPageLoading } from '@/features/dashboard/super-admin/components/shared/SuperAdminPageLoading';
import { SuperAdminFaqEditorDialog } from '@/features/dashboard/super-admin/components/super-admin-support/SuperAdminFaqEditorDialog';
import { SuperAdminHelpFaqsSummaryCards } from '@/features/dashboard/super-admin/components/super-admin-support/SuperAdminHelpFaqsSummaryCards';
import {
  useDeleteHelpCenterFaq,
  useHelpCenterFaqsAdmin,
  useUpdateHelpCenterFaq,
  type AdminHelpCenterFaq,
} from '@/features/dashboard/super-admin/hooks/useHelpCenterFaqsAdmin';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  buildPageItems,
  normalizeAdminPageLimit,
} from '@/lib/table/pagination';
import { cn } from '@/lib/utils';

function FaqRow({
  faq,
  isFirst,
  isLast,
  onEdit,
  onDeleteRequest,
  onMove,
}: {
  faq: AdminHelpCenterFaq;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onMove: (direction: 'up' | 'down') => void;
}) {
  const updateFaq = useUpdateHelpCenterFaq();

  return (
    <div
      className={cn(
        'border-border bg-card flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        !faq.is_published && 'opacity-60'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{faq.question}</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{faq.answer}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isFirst}
          aria-label="Move up"
          onClick={() => onMove('up')}
          className="size-9"
        >
          <ArrowUp className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isLast}
          aria-label="Move down"
          onClick={() => onMove('down')}
          className="size-9"
        >
          <ArrowDown className="size-4" aria-hidden />
        </Button>
        <Switch
          checked={faq.is_published}
          onCheckedChange={(checked) =>
            updateFaq.mutate(
              { id: faq.id, isPublished: checked },
              {
                onError: (error) => toast.error(friendlyToastError(error, 'Could not update FAQ')),
              }
            )
          }
          aria-label={faq.is_published ? 'Published' : 'Unpublished'}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Edit FAQ"
          onClick={onEdit}
          className="size-9"
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete FAQ"
          onClick={onDeleteRequest}
          className="text-destructive size-9"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function SuperAdminHelpFaqsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');
  const limit = normalizeAdminPageLimit(
    Number(searchParams.get('limit') ?? String(ADMIN_DEFAULT_PAGE_SIZE))
  );
  const { data, isLoading, error } = useHelpCenterFaqsAdmin({ page, limit });
  const updateFaq = useUpdateHelpCenterFaq();
  const deleteFaq = useDeleteHelpCenterFaq();

  const [editingFaq, setEditingFaq] = useState<AdminHelpCenterFaq | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminHelpCenterFaq | null>(null);

  const faqs = data?.faqs ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const pageItems = buildPageItems(page, pageCount);

  const setPage = (nextPage: number) =>
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        if (nextPage === 1) sp.delete('page');
        else sp.set('page', String(nextPage));
        return sp;
      },
      { replace: true }
    );

  const setLimit = (nextLimit: number) =>
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        if (nextLimit === ADMIN_DEFAULT_PAGE_SIZE) sp.delete('limit');
        else sp.set('limit', String(nextLimit));
        sp.delete('page');
        return sp;
      },
      { replace: true }
    );

  const categories = useMemo(() => Array.from(new Set(faqs.map((f) => f.category))), [faqs]);

  const groupedByCategory = useMemo(() => {
    const byCategory = new Map<string, AdminHelpCenterFaq[]>();
    for (const faq of faqs) {
      const list = byCategory.get(faq.category) ?? [];
      list.push(faq);
      byCategory.set(faq.category, list);
    }
    return Array.from(byCategory.entries());
  }, [faqs]);

  const handleMove = async (category: string, index: number, direction: 'up' | 'down') => {
    const list = groupedByCategory.find(([cat]) => cat === category)?.[1] ?? [];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const current = list[index];
    const swapWith = list[swapIndex];
    if (!current || !swapWith) return;

    try {
      await Promise.all([
        updateFaq.mutateAsync({ id: current.id, sortOrder: swapWith.sort_order }),
        updateFaq.mutateAsync({ id: swapWith.id, sortOrder: current.sort_order }),
      ]);
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not reorder FAQs'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFaq.mutateAsync(deleteTarget.id);
      toast.success('FAQ deleted');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(friendlyToastError(error, 'Could not delete FAQ'));
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <AdminPageHeader
        title="FAQs"
        subtitle="Curated FAQs shown to hosts."
        actions={
          <Button type="button" onClick={() => setEditingFaq('new')} className="min-h-[44px]">
            <Plus className="size-4" aria-hidden />
            Add FAQ
          </Button>
        }
      />

      {isLoading ? (
        <SuperAdminPageLoading metricCount={4} />
      ) : error ? (
        <p className="text-destructive text-sm">Could not load FAQs.</p>
      ) : (
        <>
          <SuperAdminHelpFaqsSummaryCards faqs={faqs} />

          <div className="flex justify-end">
            <AdminListPerPageSelect limit={limit} onChange={setLimit} />
          </div>

          {groupedByCategory.length === 0 ? (
            <SuperAdminEmptyState icon={HelpCircle} title="No FAQs yet" />
          ) : (
            groupedByCategory.map(([category, items]) => (
              <div key={category} className="space-y-2">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  {category}
                </p>
                <div className="space-y-2">
                  {items.map((faq, index) => (
                    <FaqRow
                      key={faq.id}
                      faq={faq}
                      isFirst={index === 0}
                      isLast={index === items.length - 1}
                      onEdit={() => setEditingFaq(faq)}
                      onDeleteRequest={() => setDeleteTarget(faq)}
                      onMove={(direction) => void handleMove(category, index, direction)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          {pageCount > 1 ? (
            <AdminListPagination
              ariaLabel="FAQs pagination"
              page={page}
              pageCount={pageCount}
              pageItems={pageItems}
              isLoading={isLoading}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}

      <SuperAdminFaqEditorDialog
        faq={editingFaq}
        categories={categories}
        onOpenChange={(open) => {
          if (!open) setEditingFaq(null);
        }}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the Help & Support FAQ list for hosts. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
