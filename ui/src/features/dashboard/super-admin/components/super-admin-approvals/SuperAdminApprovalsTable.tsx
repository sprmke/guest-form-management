import {
  AdminDataTable,
  AdminTableHeadRow,
  AdminTableRowAffordance,
  AdminTableTh,
  adminTableBodyText,
  adminTableCell,
  adminTableRowClass,
} from '@/features/dashboard/bookings/components/AdminDataTable';
import { VerificationStatusBadge } from '@/features/dashboard/org/components/verification/VerificationStatusBadge';
import type { OrgApprovalSummary } from '@/features/dashboard/super-admin/types/approval';

import { cn } from '@/lib/utils';

function hostModesLabel(hostModes: string[]): string {
  const hasProperty = hostModes.includes('property');
  const hasParking = hostModes.includes('parking');
  if (hasProperty && hasParking) return 'Property + Parking';
  if (hasParking) return 'Parking';
  return 'Property';
}

function formatSubmittedDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type Props = {
  approvals: OrgApprovalSummary[];
  onSelect: (approval: OrgApprovalSummary) => void;
};

export function SuperAdminApprovalsTable({ approvals, onSelect }: Props) {
  return (
    <AdminDataTable minWidth={720}>
      <AdminTableHeadRow>
        <AdminTableTh className="pl-4 pr-3 sm:pl-5">Organization</AdminTableTh>
        <AdminTableTh className="hidden px-3 sm:table-cell sm:px-4">Owner</AdminTableTh>
        <AdminTableTh className="hidden px-3 sm:table-cell sm:px-4">Hosting</AdminTableTh>
        <AdminTableTh className="hidden px-3 md:table-cell md:px-4">Submitted</AdminTableTh>
        <AdminTableTh className="px-3 sm:px-4">Status</AdminTableTh>
        <AdminTableTh className="pl-2 pr-3 text-right sm:pl-3 sm:pr-4">
          <span className="sr-only">Review</span>
        </AdminTableTh>
      </AdminTableHeadRow>
      <tbody>
        {approvals.map((approval, index) => (
          <tr
            key={approval.organizationId}
            className={adminTableRowClass(index)}
            tabIndex={0}
            role="link"
            onClick={() => onSelect(approval)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(approval);
              }
            }}
            aria-label={`Review ${approval.organizationName}`}
          >
            <td className={adminTableCell.body}>
              <div className="min-w-0">
                <p className={cn('truncate', adminTableBodyText.primary)}>
                  {approval.organizationName}
                </p>
                <p className={cn('truncate sm:hidden', adminTableBodyText.secondary)}>
                  {approval.ownerName}
                </p>
              </div>
            </td>
            <td className={cn(adminTableCell.body, 'hidden sm:table-cell')}>
              <div className="min-w-0">
                <p className={cn('truncate', adminTableBodyText.primary)}>{approval.ownerName}</p>
                {approval.ownerEmail ? (
                  <p className={cn('truncate', adminTableBodyText.secondary)}>
                    {approval.ownerEmail}
                  </p>
                ) : null}
              </div>
            </td>
            <td className={cn(adminTableCell.body, 'hidden sm:table-cell')}>
              <span className={adminTableBodyText.secondary}>
                {hostModesLabel(approval.hostModes)}
              </span>
            </td>
            <td className={cn(adminTableCell.body, 'hidden md:table-cell')}>
              <span className={cn('tabular-nums', adminTableBodyText.secondary)}>
                {formatSubmittedDate(approval.baseSubmittedAt)}
              </span>
            </td>
            <td className={adminTableCell.body}>
              <VerificationStatusBadge
                status={approval.baseStatus}
                kind={approval.baseRejectionKind}
              />
            </td>
            <td className={adminTableCell.action}>
              <AdminTableRowAffordance />
            </td>
          </tr>
        ))}
      </tbody>
    </AdminDataTable>
  );
}
