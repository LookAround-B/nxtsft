// RFC 4180 quoting: any field containing a comma, quote, or newline is wrapped
// in double quotes (embedded quotes doubled). Without this, values like
// "Looking for a 2BHK, wants to move in within a month" shift every column
// after them (LA-307).
function escapeCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const csv = [headers, ...rows].map((r) => r.map(escapeCell).join(",")).join("\r\n");
  const a = Object.assign(document.createElement("a"), {
    // \uFEFF BOM so Excel decodes as UTF-8 — otherwise "·" renders as "Â·".
    href: URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}
