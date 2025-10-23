// src/lib/bankParsers.ts

export type BankTxn = {
  date: string;       // ISO YYYY-MM-DD
  amount: number;     // положително = вход, отрицателно = разход
  currency: string;   // напр. "BGN"
  description: string;
  raw?: Record<string, string>; // оригинален ред за дебъг
};

function normDate(s: string): string {
  // приема DD.MM.YYYY или YYYY-MM-DD
  if (!s) return "";
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    const [d, m, y] = s.split(".");
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}
function parseAmount(s: string): number {
  if (!s) return 0;
  return Number(s.replace(",", ".").replace(/\s+/g, ""));
}

// === ОББ (OBB / UBB) ===
// CSV: "Дата","Описание","Сума","Валута"
function parseOBB(rows: string[][]): BankTxn[] {
  const txns: BankTxn[] = [];
  for (const r of rows.slice(1)) {
    const [d, desc, amt, cur] = r;
    if (!d || !amt) continue;
    txns.push({
      date: normDate(d),
      amount: parseAmount(amt),
      currency: cur || "BGN",
      description: desc,
      raw: { d, desc, amt, cur },
    });
  }
  return txns;
}

// === ДСК (DSK) ===
// CSV: "Дата","Детайли","Приход","Разход","Валута"
function parseDSK(rows: string[][]): BankTxn[] {
  const txns: BankTxn[] = [];
  for (const r of rows.slice(1)) {
    const [d, desc, inc, exp, cur] = r;
    const amt = inc ? parseAmount(inc) : exp ? -parseAmount(exp) : 0;
    if (!d || amt === 0) continue;
    txns.push({
      date: normDate(d),
      amount: amt,
      currency: cur || "BGN",
      description: desc,
      raw: { d, desc, inc, exp, cur },
    });
  }
  return txns;
}

// === Райфайзен (Raiffeisen / RBI) ===
// CSV: "Дата","Описание","Сума","Валута","Тип"
function parseRBI(rows: string[][]): BankTxn[] {
  const txns: BankTxn[] = [];
  for (const r of rows.slice(1)) {
    const [d, desc, amt, cur] = r;
    if (!d || !amt) continue;
    txns.push({
      date: normDate(d),
      amount: parseAmount(amt),
      currency: cur || "BGN",
      description: desc,
      raw: { d, desc, amt, cur },
    });
  }
  return txns;
}

// === UniCredit Bulbank ===
// CSV: "Дата","Операция","Сума","Валута","Описание"
function parseUniCredit(rows: string[][]): BankTxn[] {
  const txns: BankTxn[] = [];
  for (const r of rows.slice(1)) {
    const [d, op, amt, cur, desc] = r;
    if (!d || !amt) continue;
    txns.push({
      date: normDate(d),
      amount: parseAmount(amt),
      currency: cur || "BGN",
      description: desc || op,
      raw: { d, op, amt, cur, desc },
    });
  }
  return txns;
}

// === Пощенска банка (Postbank) ===
// CSV: "Дата","Описание","Дебит","Кредит","Валута"
function parsePostbank(rows: string[][]): BankTxn[] {
  const txns: BankTxn[] = [];
  for (const r of rows.slice(1)) {
    const [d, desc, debit, credit, cur] = r;
    let amt = 0;
    if (credit) amt = parseAmount(credit);
    else if (debit) amt = -parseAmount(debit);
    if (!d || amt === 0) continue;
    txns.push({
      date: normDate(d),
      amount: amt,
      currency: cur || "BGN",
      description: desc,
      raw: { d, desc, debit, credit, cur },
    });
  }
  return txns;
}

// === Автоматично разпознаване ===
export function detectAndParse(
  bank: string,
  rows: string[][]
): BankTxn[] {
  const head = rows[0].join(" ").toLowerCase();

  if (bank === "obb" || head.includes("ubb")) return parseOBB(rows);
  if (bank === "dsk" || head.includes("дск")) return parseDSK(rows);
  if (bank === "rbi" || head.includes("raiffeisen")) return parseRBI(rows);
  if (bank === "unicredit" || head.includes("bulbank")) return parseUniCredit(rows);
  if (bank === "postbank" || head.includes("пощенска")) return parsePostbank(rows);

  // fallback: връща празно
  return [];
}
