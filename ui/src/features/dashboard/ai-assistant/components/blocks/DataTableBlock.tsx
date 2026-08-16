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
  return (
    <div className="border-border/60 bg-card space-y-2 rounded-xl border p-3">
      {title && <p className="text-foreground text-sm font-semibold">{title}</p>}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="text-xs">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
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
