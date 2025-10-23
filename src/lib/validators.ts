/**
 * Прост набор от валидатори, използвани от submit.tsx и другите екрани.
 * Добавете и допълнете при нужда.
 */

export function validateIBAN(iban: string): boolean {
  if (!iban) return false;
  const normalized = iban.replace(/\s+/g, "").toUpperCase();
  // Basic IBAN structure check: country code + digits/letters, length between 14 and 34
  if (!/^[A-Z]{2}[0-9A-Z]{12,30}$/.test(normalized)) return false;
  // Move first 4 chars to end and convert chars to numbers for mod-97 check
  const rearr = normalized.slice(4) + normalized.slice(0, 4);
  const converted = rearr
    .split("")
    .map(ch => {
      const code = ch.charCodeAt(0);
      if (code >= 48 && code <= 57) return ch; // 0-9
      return (code - 55).toString(); // A=10, B=11...
    })
    .join("");
  // compute mod 97 iteratively to avoid big integers
  let remainder = 0;
  for (let i = 0; i < converted.length; i += 7) {
    const block = String(remainder) + converted.substr(i, 7);
    remainder = Number(block) % 97;
  }
  return remainder === 1;
}

export function validateEGN(egn: string): boolean {
  if (!egn) return false;
  const cleaned = egn.replace(/\s+/g, "");
  if (!/^\d{10}$/.test(cleaned)) return false;
  // Basic control digit check algorithm for Bulgarian EGN
  const weights = [2, 4, 8, 5, 10, 9, 7, 3, 6];
  const digits = cleaned.split("").map(d => Number(d));
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
  const remainder = sum % 11;
  const check = remainder === 10 ? 0 : remainder;
  return check === digits[9];
}

export function isPositiveNumber(n: number) {
  return typeof n === "number" && isFinite(n) && n > 0;
}
