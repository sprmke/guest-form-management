import type { ChatBlock } from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Props = Extract<ChatBlock, { type: 'data_table' }>;

export function DataTableBlock({ title, columns, rows }: Props) {
  const safeColumns = columns ?? [];
  const safeRows = rows ?? [];
  return (
    <div className="border-border/60 bg-card space-y-2 rounded-xl border p-3">
      {title && <p className="text-foreground text-sm font-semibold">{title}</p>}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {safeColumns.map((col) => (
                <TableHead key={col} className="text-xs">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeRows.map((row, i) => (
              <TableRow key={i}>
                {safeColumns.map((col) => (
                  <TableCell key={col} className="text-xs">
                    {String(row[col] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
