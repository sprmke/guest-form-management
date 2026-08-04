export type ImportParseResult = {
  batchId: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  rowCount: number;
};
