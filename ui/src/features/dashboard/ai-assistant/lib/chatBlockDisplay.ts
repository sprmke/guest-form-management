import type {
  ActionConfirmationBlock,
  ChatBlock,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';
import { statusLabel } from '@/features/dashboard/bookings/lib/bookingStatus';

const STATUS_CODE_RE = /\b([A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+)\b/g;

function keySlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function asDisplay(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

export function humanizeAssistantStatusText(text: string): string {
  return text.replace(STATUS_CODE_RE, (code) => {
    const label = statusLabel(code);
    return label === code ? code : label;
  });
}

export function dataTableRowCells(
  row: Record<string, string | number> | undefined,
  columns: string[]
): string[] {
  if (!row) return columns.map(() => '');

  const cells = (row as { cells?: unknown }).cells;
  if (Array.isArray(cells)) {
    return columns.map((_, i) => asDisplay(cells[i]));
  }

  const bySlug = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    if (key === 'cells' || key === 'type') continue;
    bySlug.set(keySlug(key), value);
  }

  return columns.map((col) => {
    if (row[col] != null && asDisplay(row[col]) !== '') return asDisplay(row[col]);
    return asDisplay(bySlug.get(keySlug(col)));
  });
}

export function dataTableHasRows(
  columns: string[] | undefined,
  rows: Array<Record<string, string | number>> | undefined
): boolean {
  const cols = columns ?? [];
  if (cols.length === 0) return false;
  return (rows ?? []).some((row) =>
    dataTableRowCells(row, cols).some((cell) => cell.trim() !== '')
  );
}

export function dataTableCell(
  row: Record<string, string | number>,
  column: string,
  columns: string[]
): string {
  const index = columns.indexOf(column);
  const cells = dataTableRowCells(row, columns);
  return index >= 0 ? cells[index] : asDisplay(row[column]);
}

export function isCanvasWorthyBlock(block: ChatBlock): boolean {
  if (block.type === 'stepper') return (block.steps?.length ?? 0) > 0;
  if (block.type === 'data_table') return (block.rows?.length ?? 0) > 8;
  return false;
}

export function canvasBlockTitle(block: ChatBlock): string {
  if (block.type === 'stepper' || block.type === 'data_table') return block.title || '';
  return '';
}

export function canvasBlockSummary(block: ChatBlock): string {
  if (block.type === 'stepper') {
    const current = (block.steps ?? []).find((step) => step.status === 'current');
    return current?.label ?? `${block.steps?.length ?? 0} steps`;
  }
  if (block.type === 'data_table') return `${block.rows?.length ?? 0} rows`;
  return '';
}

export function patchActionConfirmationStatus(
  blocks: ChatBlock[],
  actionId: string,
  status: ActionConfirmationBlock['status']
): ChatBlock[] {
  return blocks.map((block) => {
    if (block.type === 'action_confirmation' && block.actionId === actionId) {
      return { ...block, status };
    }
    if (block.type === 'stepper') {
      return {
        ...block,
        steps: (block.steps ?? []).map((step) =>
          step.actionBlock?.actionId === actionId
            ? { ...step, actionBlock: { ...step.actionBlock, status } }
            : step
        ),
      };
    }
    return block;
  });
}
