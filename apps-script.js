// ================================================================
//  自費療程統計 — Google Apps Script
//  貼到 Google Sheet 的 Apps Script 編輯器，部署為 Web App
// ================================================================

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const result = { sheets: [] };

  sheets.forEach(sheet => {
    const name = sheet.getName();
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return; // skip empty sheets

    // Find header row (first row with ≥3 non-empty cells)
    let headerRow = 0;
    for (let i = 0; i < Math.min(5, values.length); i++) {
      if (values[i].filter(c => c !== '' && c !== null).length >= 3) {
        headerRow = i;
        break;
      }
    }

    const headers = values[headerRow].map(h => String(h).trim());
    const rows = values.slice(headerRow + 1)
      .filter(r => r.some(v => v !== '' && v !== null))
      .map(r => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
        return obj;
      });

    result.sheets.push({ name, headers, rows });
  });

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
