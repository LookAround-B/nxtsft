export type BulkImportCell = string | number | null | boolean;
export type BulkImportMatrix = BulkImportCell[][];

type WorkbookSheet = { sheet?: string; data: BulkImportMatrix };

export function normalizeBulkImportMatrix(value: unknown): BulkImportMatrix {
  if (!Array.isArray(value) || value.length === 0) return [];

  const first = value[0] as unknown;
  if (Array.isArray(first)) return value as BulkImportMatrix;

  if (first && typeof first === "object" && "data" in first) {
    const sheet = first as WorkbookSheet;
    if (Array.isArray(sheet.data)) return sheet.data;
  }

  throw new Error("Unsupported spreadsheet format.");
}