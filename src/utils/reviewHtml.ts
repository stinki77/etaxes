// src/utils/reviewHtml.ts
type ImportedItem = {
  id: string;
  description?: string;
  amount?: number;
  date?: string; // ISO
};

type Relief = { name?: string; amount?: number };

type Totals = {
  taxBase: number;
  taxDue: number;
  [k: string]: any;
};

type Params = {
  year: number;
  importedItems: ImportedItem[];
  importedTotal: number;
  manualIncome: number;
  reliefs: Relief[];
  totals: Totals;
  note?: string;
  locale?: string;
};

function fmtBGN(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 2,
  }).format(n || 0);
}

export function generateReviewHtml(p: Params): string {
  const {
    year,
    importedItems = [],
    importedTotal = 0,
    manualIncome = 0,
    reliefs = [],
    totals = { taxBase: 0, taxDue: 0 },
    note = "",
  } = p;

  const rowsImported = importedItems
    .map(
      (it) => `
        <tr>
          <td>${escapeHtml(it.description || "")}</td>
          <td>${it.date ? new Date(it.date).toLocaleDateString() : ""}</td>
          <td style="text-align:right">${fmtBGN(Number(it.amount) || 0)}</td>
        </tr>`
    )
    .join("");

  const rowsReliefs = reliefs
    .map(
      (r) => `
        <tr>
          <td>${escapeHtml(r.name || "")}</td>
          <td style="text-align:right">${fmtBGN(Number(r.amount) || 0)}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="bg">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>РџСЂРµРіР»РµРґ ${year}</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial,sans-serif;margin:24px;color:#111}
    h1{font-size:22px;margin:0 0 12px}
    h2{font-size:16px;margin:18px 0 8px}
    table{width:100%;border-collapse:collapse;margin:8px 0 12px}
    th,td{border:1px solid #ddd;padding:8px;font-size:12px}
    th{background:#f7f7f7;text-align:left}
    .right{text-align:right}
    .muted{color:#666}
    .box{border:1px solid #eee;border-radius:8px;padding:12px;margin:8px 0 14px;background:#fafafa}
  </style>
</head>
<body>
  <h1>РџСЂРµРіР»РµРґ РЅР° РґР°РЅРЅРё Р·Р° ${year}</h1>

  <div class="box">
    <h2>Р”РѕС…РѕРґРё</h2>
    <table>
      <thead><tr><th>РћРїРёСЃР°РЅРёРµ</th><th>Р”Р°С‚Р°</th><th class="right">РЎСѓРјР°</th></tr></thead>
      <tbody>
        ${rowsImported || `<tr><td colspan="3" class="muted">РќСЏРјР° РёРјРїРѕСЂС‚РЅР°С‚Рё Р·Р°РїРёСЃРё</td></tr>`}
        <tr>
          <td colspan="2" class="right"><b>РРјРїРѕСЂС‚ РѕР±С‰Рѕ</b></td>
          <td class="right"><b>${fmtBGN(importedTotal)}</b></td>
        </tr>
        <tr>
          <td colspan="2" class="right">Р СЉС‡РЅРѕ РІСЉРІРµРґРµРЅРё РґРѕС…РѕРґРё</td>
          <td class="right">${fmtBGN(manualIncome)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="box">
    <h2>РћР±Р»РµРєС‡РµРЅРёСЏ</h2>
    <table>
      <thead><tr><th>РРјРµ</th><th class="right">РЎСѓРјР°</th></tr></thead>
      <tbody>
        ${rowsReliefs || `<tr><td colspan="2" class="muted">РќСЏРјР° РѕР±Р»РµРєС‡РµРЅРёСЏ</td></tr>`}
      </tbody>
    </table>
  </div>

  <div class="box">
    <h2>РћР±РѕР±С‰РµРЅРёРµ</h2>
    <table>
      <tbody>
        <tr><td>Р”Р°РЅСЉС‡РЅР° РѕСЃРЅРѕРІР°</td><td class="right">${fmtBGN(Number(totals.taxBase) || 0)}</td></tr>
        <tr><td>Р”СЉР»Р¶РёРј РґР°РЅСЉРє</td><td class="right">${fmtBGN(Number(totals.taxDue) || 0)}</td></tr>
      </tbody>
    </table>
  </div>

  ${
    note?.trim()
      ? `<div class="box"><h2>Р‘РµР»РµР¶РєР°</h2><div style="white-space:pre-wrap">${escapeHtml(note)}</div></div>`
      : ""
  }
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


