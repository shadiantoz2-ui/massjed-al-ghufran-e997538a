// Lazy-loaded Excel helpers — keeps the heavy xlsx library out of the main bundle.
export async function downloadRtlXlsx(
  rows: Record<string, any>[],
  sheetName: string,
  fileName: string,
) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  ws["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 18 }));
  (wb as any).Views = [{ RTL: true }];
  (wb as any).Workbook = { ...(wb as any).Workbook, Views: [{ RTL: true }] };
  XLSX.writeFile(wb, fileName);
}
