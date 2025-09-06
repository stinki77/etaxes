// src/localization/index.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

export type Locale = "bg" | "en";
const STORAGE_KEY = "@app_locale";

/** Мини събития за промяна на език */
type Listener = (lng: Locale) => void;
const listeners = new Set<Listener>();
function emit(lng: Locale) {
  listeners.forEach((fn) => {
    try {
      fn(lng);
    } catch {
      // ignore listener errors
    }
  });
}

/** Разпознава езика на устройството и свежда до "bg" или "en" */
export function deviceLocale(): Locale {
  const tag =
    Localization.locale ||
    Localization.getLocales?.()[0]?.languageTag ||
    "en-US";
  return tag.toLowerCase().startsWith("bg") ? "bg" : "en";
}

/** Чете текущия език: storage -> device */
export async function getLocale(): Promise<Locale> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === "bg" || saved === "en") return saved;
  } catch {
    // ignore
  }
  return deviceLocale();
}

/** Задава език и известява слушателите */
export async function setLocale(lng: Locale): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lng);
  emit(lng);
}

/** Абониране за промяна на езика. Върни функция за отписване. */
export function onLocaleChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Сурови преводи. Добавяй ключове по екрани. */
const dict = {
  bg: {
    tabs: {
      dashboard: "Начало",
      createTax: "Създай данък",
      archive: "Архив",
      calculators: "Калкулатори",
      notifications: "Известия",
      language: "Смяна на език",
    },
    language: {
      title: "Смяна на език",
      bg: "Български",
      en: "English",
      tip: "Съвет: промяната се отразява до 1 секунда.",
    },
    dashboard: {
      heading: "ЕДанъци",
      sub: "Краен срок за ГДД: 30 април",
    },
    createTax: {
      title: "Създай данък",
      year: "Година",
      income: "Доходи",
      reliefs: "Облекчения",
      review: "Преглед",
      generatePdf: "Генерирай PDF",
      exportXlsx: "Експорт в Excel",
    },
    archive: {
      title: "Архив",
      empty: "Няма записи",
    },
    calculators: {
      title: "Калкулатори",
    },
    notifications: {
      title: "Известия",
    },
    common: {
      save: "Запази",
      cancel: "Отказ",
      ok: "Ок",
      error: "Грешка",
    },
  },
  en: {
    tabs: {
      dashboard: "Dashboard",
      createTax: "Create tax",
      archive: "Archive",
      calculators: "Calculators",
      notifications: "Notifications",
      language: "Language",
    },
    language: {
      title: "Language",
      bg: "Bulgarian",
      en: "English",
      tip: "Tip: tabs refresh within ~1 second.",
    },
    dashboard: {
      heading: "eTaxes",
      sub: "Annual return deadline: April 30",
    },
    createTax: {
      title: "Create tax",
      year: "Year",
      income: "Income",
      reliefs: "Reliefs",
      review: "Review",
      generatePdf: "Generate PDF",
      exportXlsx: "Export to Excel",
    },
    archive: {
      title: "Archive",
      empty: "No records",
    },
    calculators: {
      title: "Calculators",
    },
    notifications: {
      title: "Notifications",
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      ok: "OK",
      error: "Error",
    },
  },
} as const;

/** Вътрешно: намира стойност по път с точки: "createTax.title" */
function resolvePath<T extends object>(obj: T, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as any)) {
      return (acc as any)[key];
    }
    return undefined;
  }, obj);
}

/** Шаблонизиране: заменя {{key}} с params.key */
function formatTemplate(str: string, params?: Record<string, string | number>) {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    params[k] != null ? String(params[k]) : `{{${k}}}`
  );
}

/**
 * t("createTax.title") -> локализиран низ.
 * Поддържа params: t("common.error", { code: 404 })
 */
export async function t(
  key: string,
  params?: Record<string, string | number>
): Promise<string> {
  const lng = await getLocale();
  const table = dict[lng];
  const val = resolvePath(table, key);
  if (typeof val === "string") {
    return formatTemplate(val, params);
  }
  // Fallback: опитай английски
  const fallback = resolvePath(dict.en, key);
  if (typeof fallback === "string") {
    return formatTemplate(fallback, params);
  }
  return key; // последен fallback: върни ключа
}

/** Синхронен вариант за вече известен език (ако го пазиш в state) */
export function tSync(
  lng: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const table = dict[lng];
  const val = resolvePath(table, key);
  if (typeof val === "string") return formatTemplate(val, params);
  const fallback = resolvePath(dict.en, key);
  if (typeof fallback === "string") return formatTemplate(fallback, params);
  return key;
}

/** Хелпър: вземи текущи таб заглавия синхронно за даден език */
export function tabTitles(lng: Locale) {
  return dict[lng].tabs;
}
