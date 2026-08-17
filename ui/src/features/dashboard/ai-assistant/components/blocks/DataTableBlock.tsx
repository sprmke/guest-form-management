import type { ChatBlock } from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import {
  dataTableCell,
  dataTableHasRows,
  dataTableRowCells,
} from '@/features/dashboard/ai-assistant/lib/chatBlockDisplay';

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
  const visibleRows = safeRows.filter((row) =>
    dataTableRowCells(row, safeColumns).some((cell) => cell.trim() !== '')
  );
  if (!dataTableHasRows(safeColumns, visibleRows)) return null;

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
            {visibleRows.map((row, i) => (
              <TableRow key={i}>
                {safeColumns.map((col) => (
                  <TableCell key={col} className="text-xs">
                    {dataTableCell(row, col, safeColumns)}
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
