// src/lib/napXml.ts
/**
 * Генератор на XML за НАП + адаптер от store типове.
 * ВНИМАНИЕ: Имената/namespace са примерни. Напасни към официалната XSD.
 */
import type { Income, Deduction } from "./store";
import type { Person } from "../config/nap";

// -------- Общи помощни --------
type IncomeLine = { code: string; description?: string; amount: number };
type Payload = {
  meta: { generatedAt: string; app?: string; version?: string };
  taxpayer: { egn?: string; lnch?: string };
  payment: { iban?: string; reason?: string };
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

function n2(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function f2(v: any): string {
  return n2(v).toFixed(2);
}

// -------- Твоят оригинален генератор (преименуван) --------
export function generateNapXmlRaw(payload: Payload): string {
  const ns = { xsi: "http://www.w3.org/2001/XMLSchema-instance", nap: "http://nap.bg/declaration" };
  const header = `<?xml version="1.0" encoding="UTF-8"?>`;
  let xml = `${header}\n<nap:Declaration xmlns:nap="${ns.nap}" xmlns:xsi="${ns.xsi}">\n`;

  xml += `  <nap:Meta>\n`;
  xml += `    <nap:GeneratedAt>${esc(payload.meta?.generatedAt)}</nap:GeneratedAt>\n`;
  xml += `    <nap:App>${esc(payload.meta?.app || "")}</nap:App>\n`;
  xml += `    <nap:Version>${esc(payload.meta?.version || "")}</nap:Version>\n`;
  xml += `  </nap:Meta>\n`;

  xml += `  <nap:Taxpayer>\n`;
  if (payload.taxpayer?.egn) xml += `    <nap:EGN>${esc(payload.taxpayer.egn)}</nap:EGN>\n`;
  if (payload.taxpayer?.lnch) xml += `    <nap:LNCh>${esc(payload.taxpayer.lnch)}</nap:LNCh>\n`;
  xml += `  </nap:Taxpayer>\n`;

  xml += `  <nap:Payment>\n`;
  xml += `    <nap:IBAN>${esc(payload.payment?.iban || "")}</nap:IBAN>\n`;
  xml += `    <nap:Reason>${esc(payload.payment?.reason || "")}</nap:Reason>\n`;
  xml += `  </nap:Payment>\n`;

  xml += `  <nap:Year>${esc(payload.year)}</nap:Year>\n`;

  if (payload.income && payload.income.length) {
    xml += `  <nap:IncomeList>\n`;
    for (const line of payload.income) {
      xml += `    <nap:Income>\n`;
      xml += `      <nap:Code>${esc(line.code)}</nap:Code>\n`;
      xml += `      <nap:Description>${esc(line.description || "")}</nap:Description>\n`;
      xml += `      <nap:Amount>${f2(line.amount)}</nap:Amount>\n`;
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
      xml += `    <nap:${esc(k)}>${f2(payload.totals[k])}</nap:${esc(k)}>\n`;
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

// -------- Адаптер: store -> Payload --------
function incomeTypeToCode(t: Income["incomeType"] | undefined): string {
  // Подравнено към тестовете: employment -> "01"
  switch (t) {
    case "employment": return "01";
    case "civil": return "02";
    case "rent": return "03";
    default: return "99";
  }
}

function buildDescription(it: Income): string {
  const parts = [
    it.description || "",
    it.payerName ? `Платец: ${it.payerName}` : "",
    it.payerEik ? `ЕИК: ${it.payerEik}` : "",
    it.countryCode ? `Държава: ${it.countryCode}` : "",
    it.docType || it.docNo || it.docDate
      ? `Док.: ${[it.docType, it.docNo, it.docDate].filter(Boolean).join(" / ")}`
      : "",
  ].filter(Boolean);
  return parts.join(" | ");
}

/**
 * Исканата сигнатура за декларацията:
 * generateNapXml({ year, incomes, deductions, person }) => string(XML)
 * Дефанзивна към липсващи полета (tests могат да подават непълни данни).
 */
export function generateNapXml(p: {
  year?: number;
  incomes?: Income[];
  deductions?: Deduction[];
  person?: Person;
}): string {
  const year = p?.year ?? new Date().getFullYear();

  const person: Person = p?.person ?? ({
    egn: "",
    lnch: "",
    refundIban: "",
  } as Person);

  const incomes: Income[] = Array.isArray(p?.incomes) ? p!.incomes! : [];
  const deductions: Deduction[] = Array.isArray(p?.deductions) ? p!.deductions! : [];

  const totalIncome = incomes.reduce((s, x) => s + n2(x.amount), 0);
  const totalReliefs = deductions.reduce((s, x) => s + n2((x as any).amount), 0);

  const payload: Payload = {
    meta: { generatedAt: new Date().toISOString(), app: "eTaxes", version: "1.0" },
    taxpayer: { egn: person.egn, lnch: person.lnch },
    payment: { iban: person.refundIban, reason: `ГДД ${year}` },
    year,
    income: incomes.map<IncomeLine>((it) => ({
      code: incomeTypeToCode(it.incomeType),
      description: buildDescription(it),
      amount: n2(it.amount),
    })),
    deductions: deductions.map((d) => ({
      name: (d as any).name,
      amount: n2((d as any).amount),
    })),
    totals: { IncomeTotal: totalIncome, ReliefsTotal: totalReliefs },
  };

  return generateNapXmlRaw(payload);
}

// default: удобен импорт
export default generateNapXml;
