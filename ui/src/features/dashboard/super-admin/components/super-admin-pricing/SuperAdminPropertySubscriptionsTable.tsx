import { useEffect, useState } from 'react';

import {
  AdminDataTable,
  AdminTableHeadRow,
  AdminTableTh,
  adminTableBodyText,
  adminTableCell,
  adminTableRowClass,
} from '@/features/dashboard/bookings/components/AdminDataTable';
import type {
  PricingPlan,
  PropertySubscriptionSummary,
} from '@/features/dashboard/super-admin/types/pricingPlan';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type SuperAdminPropertySubscriptionsTableProps = {
  properties: PropertySubscriptionSummary[];
  plans: PricingPlan[];
  onAssign: (propertyId: string, planId: string) => Promise<void>;
  isAssigning: boolean;
};

export function SuperAdminPropertySubscriptionsTable({
  properties,
  plans,
  onAssign,
  isAssigning,
}: SuperAdminPropertySubscriptionsTableProps) {
  return (
    <AdminDataTable minWidth={760}>
      <AdminTableHeadRow>
        <AdminTableTh className="pl-4 pr-3 sm:pl-5">Property</AdminTableTh>
        <AdminTableTh className="hidden px-3 md:table-cell md:px-4">Organization</AdminTableTh>
        <AdminTableTh className="px-3 sm:px-4">Current plan</AdminTableTh>
        <AdminTableTh className="pl-2 pr-3 text-right sm:pl-3 sm:pr-4">Assign</AdminTableTh>
      </AdminTableHeadRow>
      <tbody>
        {properties.map((row, index) => (
          <PropertySubscriptionRow
            key={row.propertyId}
            row={row}
            plans={plans}
            onAssign={onAssign}
            isAssigning={isAssigning}
            index={index}
          />
        ))}
      </tbody>
    </AdminDataTable>
  );
}

function PropertySubscriptionRow({
  row,
  plans,
  onAssign,
  isAssigning,
  index,
}: {
  row: PropertySubscriptionSummary;
  plans: PricingPlan[];
  onAssign: (propertyId: string, planId: string) => Promise<void>;
  isAssigning: boolean;
  index: number;
}) {
  const currentPlanId = row.subscription?.planId ?? plans.find((plan) => plan.isDefault)?.id ?? '';
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlanId);

  useEffect(() => {
    setSelectedPlanId(currentPlanId);
  }, [currentPlanId]);

  return (
    <tr className={adminTableRowClass(index)}>
      <td className={adminTableCell.body}>
        <div className="min-w-[140px]">
          <p className={cn('truncate', adminTableBodyText.primary)}>{row.propertyName}</p>
          <p className={cn('truncate', adminTableBodyText.secondary)}>{row.propertySlug}</p>
        </div>
      </td>
      <td className={cn(adminTableCell.body, 'hidden md:table-cell')}>
        <div className="min-w-[120px]">
          <p className={cn('truncate', adminTableBodyText.primary)}>{row.organizationName}</p>
          <p className={cn('truncate', adminTableBodyText.secondary)}>{row.organizationSlug}</p>
        </div>
      </td>
      <td className={adminTableCell.status}>
        {row.subscription ? (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-sm">
              {row.subscription.planName ?? row.subscription.planCode}
            </span>
            <Badge variant="outline">{row.subscription.status}</Badge>
          </div>
        ) : (
          <Badge variant="secondary">Unassigned</Badge>
        )}
      </td>
      <td className={cn(adminTableCell.action, 'text-right')}>
        <div className="flex items-center justify-end gap-2">
          <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={isAssigning}>
            <SelectTrigger
              className="min-h-[44px] w-[min(100%,10rem)] sm:w-40"
              aria-label={`Assign plan for ${row.propertyName}`}
            >
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            disabled={isAssigning || !selectedPlanId || selectedPlanId === currentPlanId}
            onClick={() => void onAssign(row.propertyId, selectedPlanId)}
          >
            Apply
          </Button>
        </div>
      </td>
    </tr>
  );
}
