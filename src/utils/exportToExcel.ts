/**
 * Export data as CSV file (Excel-compatible)
 */
export const exportToExcel = (data: Record<string, any>[], filename: string, columns?: { key: string; label: string }[]) => {
  if (data.length === 0) return;

  const headers = columns ? columns.map(c => c.label) : Object.keys(data[0]);
  const keys = columns ? columns.map(c => c.key) : Object.keys(data[0]);

  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      keys.map(key => {
        const val = row[key];
        const cell = val === null || val === undefined ? '' : String(val);
        // Escape quotes and wrap in quotes if contains comma/quote/newline
        return `"${cell.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
