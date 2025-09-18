/**
 * Прост XML генератор за декларация към НАП.
 * Този модул генерира валиден UTF-8 XML стринг с базови namespaces.
 *
 * IMPORTANT:
 * - Прегледайте и адаптирайте имената на елементи, namespaces и структурите според официалната XSD/спецификация на НАП.
 * - Тук използвам ръчно ескейпване. За production използвайте XML библиотека (xmlbuilder2, fast-xml-builder) и валидирайте срещу XSD.
 */

type IncomeLine = {
  code: string;
  description?: string;
  amount: number;
};

type Payload = {
  meta: { generatedAt: string; app?: string; version?: string };
  taxpayer: { egn: string };
  payment: { iban: string; reason: string };
  year: number | string;
  income?: IncomeLine[];
  deductions?: any[];
  totals?: Record<string, number>;
  attachments?: { name: string; uri: string }[];
};

function esc(s: any) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateNapXml(payload: Payload): string {
  // Basic namespaces used as example. Replace with actual НАП namespaces.
  const ns = {
    xsi: "http://www.w3.org/2001/XMLSchema-instance",
    nap: "http://nap.bg/declaration",
  };

  const header = `<?xml version="1.0" encoding="UTF-8"?>`;
  // Root element with namespaces
  let xml = `${header}\n<nap:Declaration xmlns:nap="${ns.nap}" xmlns:xsi="${ns.xsi}">\n`;

  xml += `  <nap:Meta>\n`;
  xml += `    <nap:GeneratedAt>${esc(payload.meta?.generatedAt)}</nap:GeneratedAt>\n`;
  xml += `    <nap:App>${esc(payload.meta?.app || "")}</nap:App>\n`;
  xml += `    <nap:Version>${esc(payload.meta?.version || "")}</nap:Version>\n`;
  xml += `  </nap:Meta>\n`;

  xml += `  <nap:Taxpayer>\n`;
  xml += `    <nap:EGN>${esc(payload.taxpayer?.egn)}</nap:EGN>\n`;
  xml += `  </nap:Taxpayer>\n`;

  xml += `  <nap:Payment>\n`;
  xml += `    <nap:IBAN>${esc(payload.payment?.iban)}</nap:IBAN>\n`;
  xml += `    <nap:Reason>${esc(payload.payment?.reason)}</nap:Reason>\n`;
  xml += `  </nap:Payment>\n`;

  xml += `  <nap:Year>${esc(payload.year)}</nap:Year>\n`;

  if (payload.income && payload.income.length) {
    xml += `  <nap:IncomeList>\n`;
    for (const line of payload.income) {
      xml += `    <nap:Income>\n`;
      xml += `      <nap:Code>${esc(line.code)}</nap:Code>\n`;
      xml += `      <nap:Description>${esc(line.description || "")}</nap:Description>\n`;
      xml += `      <nap:Amount>${Number(line.amount).toFixed(2)}</nap:Amount>\n`;
      xml += `    </nap:Income>\n`;
    }
    xml += `  </nap:IncomeList>\n`;
  }

  if (payload.deductions && payload.deductions.length) {
    xml += `  <nap:Deductions>\n`;
    for (const d of payload.deductions) {
      xml += `    <nap:Deduction>${esc(JSON.stringify(d))}</nap:Deduction>\n`;
    }
    xml += `  </nap:Deductions>\n`;
  }

  if (payload.totals) {
    xml += `  <nap:Totals>\n`;
    for (const k of Object.keys(payload.totals)) {
      xml += `    <nap:${esc(k)}>${Number(payload.totals[k]).toFixed(2)}</nap:${esc(k)}>\n`;
    }
    xml += `  </nap:Totals>\n`;
  }

  if (payload.attachments && payload.attachments.length) {
    xml += `  <nap:Attachments>\n`;
    for (const a of payload.attachments) {
      xml += `    <nap:Attachment>\n`;
      xml += `      <nap:Name>${esc(a.name)}</nap:Name>\n`;
      xml += `      <nap:URI>${esc(a.uri)}</nap:URI>\n`;
      xml += `    </nap:Attachment>\n`;
    }
    xml += `  </nap:Attachments>\n`;
  }

  xml += `</nap:Declaration>\n`;
  return xml;
}

// default export for convenience
export default generateNapXml;
