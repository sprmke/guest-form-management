import { Fragment } from 'react';

import { Check, X } from 'lucide-react';

import { OrgRoleDot } from '@/features/dashboard/team/components/OrgRoleBadge';
import { OrgRolesSection } from '@/features/dashboard/team/components/OrgRolesSection';
import {
  ORG_PERMISSION_CATEGORIES,
  ORG_TEAM_PERMISSIONS,
} from '@/features/dashboard/team/lib/orgTeamConstants';
import { buildOrgRoleMatrixColumns } from '@/features/dashboard/team/lib/orgTeamRoles';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OrgTeamPermissionsTab() {
  const columns = buildOrgRoleMatrixColumns();

  return (
    <div className="space-y-3 sm:space-y-4">
      <OrgRolesSection />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full min-w-[480px] text-xs sm:text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-table-head px-2 py-2 text-left sm:px-4 sm:py-3">
                    Permission
                  </th>
                  {columns.map((role) => (
                    <th key={role.id} className="px-2 py-2 text-center sm:px-4 sm:py-3">
                      <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                        <OrgRoleDot roleId={role.id} />
                        <span className="max-w-[4rem] truncate text-[10px] font-medium sm:max-w-none sm:text-xs">
                          {role.label}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ORG_PERMISSION_CATEGORIES.map((category) => (
                  <Fragment key={category}>
                    <tr className="bg-muted/50">
                      <td
                        colSpan={columns.length + 1}
                        className="px-2 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm"
                      >
                        {category}
                      </td>
                    </tr>
                    {ORG_TEAM_PERMISSIONS.filter((p) => p.category === category).map(
                      (permission) => {
                        const Icon = permission.icon;
                        return (
                          <tr key={permission.id} className="hover:bg-muted/30 border-b">
                            <td className="px-2 py-2 sm:px-4">
                              <div className="flex items-start gap-1.5 sm:gap-2">
                                <Icon
                                  className="text-muted-foreground mt-0.5 size-3.5 shrink-0 sm:size-4"
                                  aria-hidden
                                />
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm">{permission.name}</p>
                                  <p className="text-muted-foreground hidden text-xs sm:block">
                                    {permission.description}
                                  </p>
                                </div>
                              </div>
                            </td>
                            {columns.map((role) => (
                              <td key={role.id} className="px-2 py-2 text-center sm:px-4">
                                {role.permissions.includes(permission.id) ? (
                                  <Check
                                    className="mx-auto size-4 text-green-500 sm:size-5"
                                    aria-label="Allowed"
                                  />
                                ) : (
                                  <X
                                    className="text-muted-foreground/30 mx-auto size-4 sm:size-5"
                                    aria-label="Not allowed"
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      }
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
