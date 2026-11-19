const escapeCell = (value) => {
  let text = String(value ?? '');
  // A leading = + - @ would run as a formula when the file opens in a spreadsheet.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (rows) =>
  rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');

/** Saves a CSV; the BOM makes Excel read accents correctly. */
export function downloadCsv(filename, rows) {
  const blob = new Blob(['﻿', toCsv(rows)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
