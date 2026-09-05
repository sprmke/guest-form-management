import { AiCreditWalletCard } from '@/features/dashboard/super-admin/components/AiCreditWalletCard';
import { useSuperAdminOrgContext } from '@/features/dashboard/super-admin/components/super-admin-orgs/superAdminOrgContext';

export function SuperAdminOrgAiSection() {
  const { org } = useSuperAdminOrgContext();
  return (
    <div className="max-w-2xl">
      <AiCreditWalletCard initialOrgId={org.id} />
    </div>
  );
}
