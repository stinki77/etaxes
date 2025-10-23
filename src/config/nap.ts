<<<<<<< HEAD
import AsyncStorage from "@react-native-async-storage/async-storage";

// Статични URL към портала на НАП
export const NAP_SERVICE_URL = "https://portal.nra.bg/";
export const NAP_LOGIN_URL   = "https://portal.nra.bg/login";

// Persist конфиг (IBAN + шаблон)
export type NapConfig = {
  iban: string;              // IBAN на НАП за плащане
  reasonTemplate: string;    // напр. "ДОД чл.50 {year} • основание: годишен данък"
};

const KEY = "@etaxes_nap_config";

const DEFAULTS: NapConfig = {
  iban: "",
  reasonTemplate: "ДОД чл.50 {year} • основание: годишен данък",
};

export async function loadNapConfig(): Promise<NapConfig> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<NapConfig>;
    return {
      iban: parsed.iban ?? DEFAULTS.iban,
      reasonTemplate: parsed.reasonTemplate ?? DEFAULTS.reasonTemplate,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function saveNapConfig(cfg: NapConfig): Promise<void> {
  const cleaned: NapConfig = {
    iban: normalizeIban(cfg.iban),
    reasonTemplate: (cfg.reasonTemplate || DEFAULTS.reasonTemplate).trim(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(cleaned));
}

export function reasonFromTemplate(tpl: string, year: number): string {
  return (tpl || DEFAULTS.reasonTemplate).replaceAll("{year}", String(year)).trim();
}

export function normalizeIban(iban: string): string {
  return (iban || "").replace(/\s+/g, "").toUpperCase();
=======
// src/config/nap.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// Types
export type Person = {
  egn?: string;      // or LNCh
  lnch?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  address: string;
  email?: string;
  phone?: string;
  refundIban?: string;   // IBAN for refund
  refundBankName?: string;
};

const K = "etaxes.person";

export const defaultPerson: Person = {
  egn: "",
  firstName: "",
  lastName: "",
  address: "",
  refundIban: "",
  refundBankName: "",
};

export async function getPerson(): Promise<Person> {
  try {
    const raw = await AsyncStorage.getItem(K);
    if (!raw) return defaultPerson;
    const p = JSON.parse(raw);
    return sanitizePerson(p);
  } catch {
    return defaultPerson;
  }
}

export async function savePerson(p: Person): Promise<void> {
  const clean = sanitizePerson(p);
  await AsyncStorage.setItem(K, JSON.stringify(clean));
}

export async function updatePerson(patch: Partial<Person>): Promise<Person> {
  const cur = await getPerson();
  const next = sanitizePerson({ ...cur, ...patch });
  await AsyncStorage.setItem(K, JSON.stringify(next));
  return next;
}

export function sanitizePerson(p: any): Person {
  const out: Person = {
    egn: strOrUndef(p?.egn),
    lnch: strOrUndef(p?.lnch),
    firstName: str(p?.firstName),
    middleName: strOrUndef(p?.middleName),
    lastName: str(p?.lastName),
    address: str(p?.address),
    email: strOrUndef(p?.email),
    phone: strOrUndef(p?.phone),
    refundIban: normIban(p?.refundIban),
    refundBankName: strOrUndef(p?.refundBankName),
  };
  return out;
}

function str(v:any){ return String(v ?? ""); }
function strOrUndef(v:any){ const s = v==null ? "" : String(v); return s ? s : undefined; }
function normIban(v:any){ const s = String(v ?? "").replace(/\s+/g,"").toUpperCase(); return s || undefined; }

export function validatePerson(p: Person): string[] {
  const errs: string[] = [];
  if (!(p.egn || p.lnch)) errs.push("Липсва ЕГН или ЛНЧ.");
  if (!p.firstName) errs.push("Липсва собствено име.");
  if (!p.lastName) errs.push("Липсва фамилно име.");
  if (!p.address) errs.push("Липсва адрес.");
  if (p.refundIban && !ibanLooksValid(p.refundIban)) errs.push("Невалиден IBAN.");
  return errs;
}

// Lightweight IBAN check (length + charset), replace with full mod-97 if нужно
function ibanLooksValid(iban: string): boolean {
  const s = iban.replace(/\s+/g,"").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(s)) return false;
  return s.length >= 15 && s.length <= 34;
>>>>>>> restore/all
}
