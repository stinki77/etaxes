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
    try { fn(lng); } catch {}
  });
}

/** Разпознава езика на устройството и свежда до "bg" или "en" */
export function deviceLocale(): Locale {
  const tag = Localization.locale || Localization.getLocales?.()[0]?.languageTag || "en-US";
  return tag.toLowerCase().startsWith("bg") ? "bg" : "en";
}

/** Чете текущия език: storage -> device */
export async function getLocale(): Promise<Locale> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === "bg" || saved === "en") return saved;
  } catch {}
  return deviceLocale();
}

/** Задава език и известява слушателите */
export async function setLocale(lng: Locale): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lng);
  emit(lng);
}

/** Абониране за промяна на езика. Връща функция за отписване. */
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
      declaration: "Декларация",
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
      heading: "еДанъци",
      sub: "Краен срок за ГДД: 30 април",
    },
    // стара секция за съвместимост
    createTax: {
      title: "Декларация",
      year: "Година",
      income: "Доходи",
      reliefs: "Облекчения",
      review: "Преглед",
      generatePdf: "Преглед за подаване (PDF)",
      exportXlsx: "Експорт (CSV/Excel)",
      errors: {
        yearRequired: "Моля, въведете година.",
        yearOutOfRange: "Годината е извън допустимия диапазон.",
        amountInvalid: "Невалидна сума.",
        fixErrors: "Моля, коригирайте грешките във формата.",
      },
    },
    // нова секция
    declaration: {
      title: "Декларация",
      year: "Година",
      income: "Доходи",
      reliefs: "Облекчения",
      review: "Преглед",
      generatePdf: "Преглед за подаване (PDF)",
      exportXlsx: "Експорт (CSV/Excel)",
      errors: {
        yearRequired: "Моля, въведете година.",
        yearOutOfRange: "Годината е извън допустимия диапазон.",
        amountInvalid: "Невалидна сума.",
        fixErrors: "Моля, коригирайте грешките във формата.",
      },
    },
    archive: {
      title: "Архив",
      searchPlaceholder: "Търси по година или име",
      emptyTitle: "Нямате записи в архива",
      emptyText: "Тук ще виждате подадени декларации, плащания и чернови.",
      year: "Година",
      date: "Дата",
      na: "н/п",
      open: "Отвори",
      openTitle: "Преглед",
      delete: "Изтрий",
      cancel: "Отказ",
      confirmTitle: "Изтриване",
      confirmText: "Сигурни ли сте, че искате да изтриете записа?",
      untitled: "Без име",
      status: { submitted: "Подадена", paid: "Платена", draft: "Чернова" },
      empty: "Няма записи",
    },
    incomes: {
      amount: "Сума",
      date: "Дата",
      add: "Добави ред",
      delete: "Изтрий",
      empty: "Няма записи.",
      total: "Общо",
      placeholders: { description: "Описание" },
      errors: {
        descRequired: "Описанието е задължително.",
        amountInvalid: "Невалидна сума.",
        dateInvalid: "Невалидна дата (YYYY-MM-DD).",
        fixErrors: "Поправете грешките.",
      },
    },
    deductions: {
      title: "Облекчения",
      total: "Общо",
      limit: "Лимит: {{limit}} лв.",
      add: "Добави",
      delete: "Изтрий",
      empty: "Няма облекчения.",
      name: "Име",
      amount: "Сума",
      placeholders: { name: "Име на облекчение" },
      errors: {
        nameRequired: "Името е задължително при сума > 0.",
        amountInvalid: "Невалидна сума.",
        overLimit: "Надвишен лимит {{limit}}.",
        fixErrors: "Поправете грешките.",
      },
    },
    calculators: { title: "Калкулатори" },
    notifications: { title: "Известия" },
    common: { save: "Запази", cancel: "Отказ", ok: "Ок", error: "Грешка" },
  },
  en: {
    tabs: {
      dashboard: "Dashboard",
      createTax: "Create tax",
      declaration: "Declaration",
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
    // legacy section kept
    createTax: {
      title: "Declaration",
      year: "Year",
      income: "Income",
      reliefs: "Reliefs",
      review: "Review",
      generatePdf: "Preview for filing (PDF)",
      exportXlsx: "Export (CSV/Excel)",
      errors: {
        yearRequired: "Please enter a year.",
        yearOutOfRange: "Year is out of allowed range.",
        amountInvalid: "Invalid amount.",
        fixErrors: "Please fix the errors in the form.",
      },
    },
    // new
    declaration: {
      title: "Declaration",
      year: "Year",
      income: "Income",
      reliefs: "Reliefs",
      review: "Review",
      generatePdf: "Preview for filing (PDF)",
      exportXlsx: "Export (CSV/Excel)",
      errors: {
        yearRequired: "Please enter a year.",
        yearOutOfRange: "Year is out of allowed range.",
        amountInvalid: "Invalid amount.",
        fixErrors: "Please fix the errors in the form.",
      },
    },
    archive: {
      title: "Archive",
      searchPlaceholder: "Search by year or name",
      emptyTitle: "No records yet",
      emptyText: "Submitted returns, payments, and drafts will appear here.",
      year: "Year",
      date: "Date",
      na: "n/a",
      open: "Open",
      openTitle: "Preview",
      delete: "Delete",
      cancel: "Cancel",
      confirmTitle: "Delete",
      confirmText: "Are you sure you want to delete this record?",
      untitled: "Untitled",
      status: { submitted: "Submitted", paid: "Paid", draft: "Draft" },
      empty: "No records",
    },
    incomes: {
      amount: "Amount",
      date: "Date",
      add: "Add row",
      delete: "Delete",
      empty: "No records.",
      total: "Total",
      placeholders: { description: "Description" },
      errors: {
        descRequired: "Description is required.",
        amountInvalid: "Invalid amount.",
        dateInvalid: "Invalid date (YYYY-MM-DD).",
        fixErrors: "Please fix the errors.",
      },
    },
    deductions: {
      title: "Deductions",
      total: "Total",
      limit: "Limit: {{limit}} BGN",
      add: "Add",
      delete: "Delete",
      empty: "No deductions.",
      name: "Name",
      amount: "Amount",
      placeholders: { name: "Deduction name" },
      errors: {
        nameRequired: "Name is required when amount > 0.",
        amountInvalid: "Invalid amount.",
        overLimit: "Limit exceeded {{limit}}.",
        fixErrors: "Please fix the errors.",
      },
    },
    calculators: { title: "Calculators" },
    notifications: { title: "Notifications" },
    common: { save: "Save", cancel: "Cancel", ok: "OK", error: "Error" },
  },
} as const;

/** Вътрешно: намира стойност по път с точки: "createTax.title" */
function resolvePath<T extends object>(obj: T, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as any)) return (acc as any)[key];
    return undefined;
  }, obj);
}

/** Шаблонизиране: заменя {{key}} с params.key */
function formatTemplate(str: string, params?: Record<string, string | number>) {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{{${k}}}`));
}

/** t("declaration.title") -> локализиран низ */
export async function t(key: string, params?: Record<string, string | number>): Promise<string> {
  const lng = await getLocale();
  const val = resolvePath(dict[lng], key);
  if (typeof val === "string") return formatTemplate(val, params);
  const fb = resolvePath(dict.en, key);
  if (typeof fb === "string") return formatTemplate(fb, params);
  return key;
}

/** Синхронен вариант */
export function tSync(lng: Locale, key: string, params?: Record<string, string | number>): string {
  const val = resolvePath(dict[lng], key);
  if (typeof val === "string") return formatTemplate(val, params);
  const fb = resolvePath(dict.en, key);
  if (typeof fb === "string") return formatTemplate(fb, params);
  return key;
}

/** Хелпър: таб заглавия */
export function tabTitles(lng: Locale) {
  return dict[lng].tabs;
}

