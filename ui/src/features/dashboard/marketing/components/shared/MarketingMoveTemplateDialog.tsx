import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MarketingCategoryItem } from '@/features/dashboard/marketing/hooks/useMarketingCatalog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  categories: MarketingCategoryItem[];
  currentCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
};

export function MarketingMoveTemplateDialog({
  open,
  onOpenChange,
  templateName,
  categories,
  currentCategoryId,
  onSelectCategory,
}: Props) {
  const targets = categories.filter((item) => item.id !== currentCategoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(calc(100vw-1.5rem),24rem)]">
        <DialogHeader>
          <DialogTitle>Move template</DialogTitle>
        </DialogHeader>
        <ul className="space-y-1.5">
          {targets.map((item) => (
            <li key={item.id}>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-[44px] w-full justify-start whitespace-normal py-2.5 text-left"
                onClick={() => {
                  onSelectCategory(item.id);
                  onOpenChange(false);
                }}
              >
                {item.label}
              </Button>
            </li>
          ))}
        </ul>
        {targets.length === 0 ? (
          <p className="text-muted-foreground text-sm">No other categories.</p>
        ) : null}
        <p className="text-muted-foreground truncate text-xs">{templateName}</p>
      </DialogContent>
    </Dialog>
  );
}
