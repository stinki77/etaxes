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
}
