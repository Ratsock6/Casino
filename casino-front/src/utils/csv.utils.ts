export const exportToCsv = (filename: string, rows: object[]): void => {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(';'),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = (row as Record<string, unknown>)[key];
          if (value === null || value === undefined) return '';
          const str = String(value).replace(/"/g, '""');
          return str.includes(';') || str.includes('\n') || str.includes('"')
            ? `"${str}"`
            : str;
        })
        .join(';')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};