import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

// === Public API ===
export type Locale = "bg" | "en";

// internal cached locale to avoid hitting storage each call
let currentLocale: Locale | null = null;
const STORAGE_KEY = "@app_locale";

type Listener = (lng: Locale) => void;
const listeners = new Set<Listener>();
function emit(lng: Locale) {
  for (const fn of Array.from(listeners)) {
    try {
      fn(lng);
    } catch {}
  }
}

function deviceLocale(): Locale {
  try {
    const code =
      (Localization as any).getLocales?.()[0]?.languageCode ||
      (Localization as any).locale?.split("-")?.[0] ||
      "en";
    return String(code).toLowerCase().startsWith("bg") ? "bg" : "en";
  } catch {
    return "en";
  }
}

// Fire-and-forget init to hydrate currentLocale from storage
(async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === "bg" || saved === "en") {
      currentLocale = saved as Locale;
    } else {
      currentLocale = deviceLocale();
    }
  } catch {
    currentLocale = deviceLocale();
  }
})();

export function getLocale(): Locale {
  // Synchronous, safe for initial renders
  return currentLocale ?? deviceLocale();
}

export async function setLocale(lng: Locale): Promise<void> {
  if (lng !== "bg" && lng !== "en") return;
  currentLocale = lng;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lng);
  } catch {}
  emit(lng);
}

export function onLocaleChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function t(
  key: string,
  params?: Record<string, string | number>
): Promise<string> {
  const lng = getLocale();
  return tSync(key, lng, params);
}

/**
 * tSync, key-first signature. Optional lng, defaults to current/device.
 * Back-compat: also accepts (lng, key, params) at runtime.
 */
export function tSync(
  keyOrLng: string | Locale,
  lngOrKey?: string | Locale,
  params?: Record<string, string | number>
): string {
  let key: string;
  let lng: Locale;
  if (keyOrLng === "bg" || keyOrLng === "en") {
    // old signature: (lng, key, params)
    lng = keyOrLng as Locale;
    key = String(lngOrKey || "");
  } else {
    // new signature: (key, lng?, params?)
    key = keyOrLng;
    lng = (lngOrKey as Locale) || getLocale();
  }
  const langDict = (translations as any)[lng] || (translations as any).en;
  const val = getByPath(langDict, key);
  if (typeof val === "string") return formatTemplate(val, params);
  const fb = getByPath((translations as any).en, key);
  if (typeof fb === "string") return formatTemplate(fb, params);
  return "";
}

export function tabTitles(lng: Locale) {
  return (translations as any)[lng].tabs;
}

// === Helpers ===
type Dict = Record<string, any>;

function getByPath(obj: Dict, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in (acc as any)) return (acc as any)[k];
    return undefined;
  }, obj);
}

function formatTemplate(str: string, params?: Record<string, string | number>) {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_: any, k: string) =>
    params[k] != null ? String(params[k]) : ""
  );
}

// === Dictionary ===
const translations = {
  bg: {
    tabs: {
      incomes: "Доходи",
      incomeSources: "Източници",
      deductions: "Облекчения",
      declaration: "Декларация",
      archive: "Архив",
      language: "Език",
      dashboard: "Начало",
      calculators: "Калкулатори",
      notifications: "Известия",
    },

    common: {
      error: "Грешка",
      ok: "Готово",
      save: "Запази",
      saved: "Записано",
      saveFailed: "Неуспешен запис",
      loadFailed: "Неуспешно зареждане",
      delete: "Изтрий",
      cancel: "Отказ",
      confirm: "Потвърди",
      close: "Затвори",
      loading: "Зареждане...",
      reload: "Обнови",
      clear: "Изчисти",
    },

    createTax: {
      title: "Декларация",
      year: "Година",
      income: "Доходи",
      reliefs: "Облекчения",
      review: "Преглед",
      generatePdf: "Преглед за подаване (PDF)",
      exportXlsx: "Експорт (Excel/CSV)",
      saveDraft: "Запази чернова",
      markSubmitted: "Маркирай като подадена",
      draftSaved: "Черновата е запазена.",
      saveFailed: "Неуспешно запазване.",
      noDraft: "Няма запазена декларация.",
      markedSubmitted: "Маркирано като подадена.",
      submitFailed: "Грешка при маркиране.",
      errors: {
        yearRequired: "Моля, въведете година.",
        yearOutOfRange: "Годината е извън допустимия диапазон.",
        amountInvalid: "Невалидна сума.",
        fixErrors: "Моля, коригирайте грешките във формата.",
      },
    },

    declaration: {
      title: "Декларация",
      year: "Година",
      income: "Доходи",
      reliefs: "Облекчения",
      review: "Преглед",
      generatePdf: "Преглед за подаване (PDF)",
      exportXlsx: "Експорт (Excel/CSV)",
      saveDraft: "Запази чернова",
      markSubmitted: "Маркирай като подадена",
      draftSaved: "Черновата е запазена.",
      saveFailed: "Неуспешно запазване.",
      noDraft: "Няма запазена декларация.",
      markedSubmitted: "Маркирано като подадена.",
      submitFailed: "Грешка при маркиране.",
    },

    submit: {
      title: "Подпис и подаване",
      status: "Статус",
      taxDue: "Дължим данък",
      createdAt: "Създадена",
      submittedAt: "Подадена",
      step1: "Генерирай XML",
      step1Desc: "Създай XML за декларацията. Можеш да го свалиш и подпишеш с КЕП.",
      generateXml: "Генерирай XML",
      shareXml: "Сподели XML",
      step2: "Подпиши и подай в портала на НАП",
      step2Desc: "Отвори портала на НАП, подпиши XML с КЕП и подай. Запази входящия номер.",
      openNap: "Отвори портал на НАП",
      step3: "Качи подписан файл и маркирай подаване",
      step3Desc: "Добави подписания файл или потвърждение за подаване. После маркирай като подадена.",
      attachFile: "Добави файл",
      markSubmitted: "Маркирай като подадена",
      payment: "Плащане на данъка",
      paymentDesc: "Можеш да платиш веднага. Сумата ще бъде поставена в клипборда.",
      copyAmount: "Копирай сума",
      goToPay: "Към плащане",
      note: "Бележка",
      notePh: "Описание...",
    },

    pay: {
      title: "Плащане на данъка",
      receiver: "Получател",
      copyIban: "Копирай IBAN",
      reason: "Основание за плащане",
      reasonPh: "Пример: Данък по ЗДДФЛ за {{year}} ЕГН 0000000000",
      copyReason: "Копирай основание",
      amount: "Сума",
      qrTitle: "EPC/SEPA QR код",
      qrNoteEur: "Сканирай в мобилното банкиране. Валидно за SEPA преводи в EUR.",
      qrNoteBgn: "Информативен QR. За SEPA е нужен EUR.",
      shareQr: "Сподели QR",
      saveToArchive: "Запиши в Архив",
    },

    incomes: {
      description: "Описание",
      amount: "Сума",
      date: "Дата",
      add: "Добави ред",
      delete: "Изтрий",
      empty: "Няма записи.",
      total: "Общо",
      placeholders: { description: "Описание" },
      errors: {
        descRequired: "Описание е задължително.",
        amountInvalid: "Невалидна сума.",
        dateInvalid: "Невалидна дата (YYYY-MM-DD).",
        fixErrors: "Поправете грешките.",
      },
    },

    deductions: {
      title: "Облекчения",
      name: "Име",
      amount: "Сума",
      total: "Общо",
      limit: "Лимит: {{limit}} лв.",
      add: "Добави",
      delete: "Изтрий",
      empty: "Няма облекчения.",
      placeholders: { name: "Име на облекчение" },
      errors: {
        nameRequired: "Името е задължително при сума > 0.",
        amountInvalid: "Невалидна сума.",
        overLimit: "Надвишен лимит {{limit}}.",
        fixErrors: "Поправете грешките.",
      },
    },

    archive: {
      title: "Архив",
      open: "Отвори",
      draft: "Чернова",
      submitted: "Подадена",
      empty: "Няма декларации.",
      loadFailed: "Архивът не може да се зареди.",
      deleteFailed: "Изтриването се провали.",
      confirmDelete: "Да изтрия ли декларацията за {{y}}?",

      // Нови ключове за разширения екран
      no_file_title: "Няма файл",
      no_file_text: "Записът няма прикачен XML или PDF.",
      share_unavailable: "Споделянето не е налично",
      copied: "Копирано",
      delete_title: "Изтриване",
      delete_text: "Сигурни ли сте, че искате да изтриете записа?",
      no_match: "Няма съвпадения с филтрите.",
      filter_year: "Година",
      year_placeholder: "напр. 2025",
      search: "Търсене",
      search_placeholder: "IBAN, сума, основание...",
      status: "Статус",
      all: "Всички",
      declaration_for_year: "Декларация за",
      created: "Създадено",
      updated: "Обновено",
      amount: "Сума",
      reason: "Основание",
      share: "Сподели",
      view_file: "Файл",
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

    notifications: {
      title: "Известия",
      empty: "Няма известия",
      addDemo: "Добави тест",
      markAllRead: "Всички прочетени",
      clearAll: "Изчисти всички",
      clear: {
        confirmTitle: "Изчистване",
        confirmBody: "Да изчистя ли всички известия?",
      },
      markRead: "Отбележи като прочетено",
      markUnread: "Отбележи като непрочетено",
    },

    calculators: {
      title: "Калкулатори",
      net_salary: { title: "Нетна заплата" },
      gross: "Брутна заплата",
      emp_contrib: "Осигуровки служител %",
      health_pct: "Здравно % (инфо)",
      other_deductions: "Други удръжки",
      tax_pct: "Данък %",
      round_net: "Закръгляне на нетната сума",
      contrib_total: "Осигуровки",
      tax_base: "Данъчна основа",
      tax_due: "Дължим данък",
      net: "Нетна заплата",
      tax: { title: "Данъчен калкулатор" },
      income_total: "Общ доход (годишен)",
      norm_costs_pct: "Нормативни разходи %",
      annual_tax_pct: "Данък %",
      soc_contrib: "Осигуровки (сума)",
      adv_tax_paid: "Авансов данък (сума)",
      round_tax: "Закръгляне на сетълмента",
      norm_costs: "Нормативни разходи",
      settlement: "Сетълмент (за довнасяне)",
      note: "Положителен резултат = дължиш. Отрицателен = надвнесен.",
      presets: {
        title: "Бързи настройки",
        text: "Избери пресет, стойностите ще се попълнят автоматично. Можеш да ги редактираш.",
      },
    },
  },

  en: {
    tabs: {
      incomes: "Incomes",
      incomeSources: "Income Sources",
      deductions: "Deductions",
      declaration: "Declaration",
      archive: "Archive",
      language: "Language",
      dashboard: "Dashboard",
      calculators: "Calculators",
      notifications: "Notifications",
    },

    common: {
      error: "Error",
      ok: "OK",
      save: "Save",
      saved: "Saved",
      saveFailed: "Save failed",
      loadFailed: "Load failed",
      delete: "Delete",
      cancel: "Cancel",
      confirm: "Confirm",
      close: "Close",
      loading: "Loading...",
      reload: "Reload",
      clear: "Clear",
    },

    createTax: {
      title: "Declaration",
      year: "Year",
      income: "Income",
      reliefs: "Reliefs",
      review: "Review",
      generatePdf: "Preview (PDF)",
      exportXlsx: "Export (Excel/CSV)",
      saveDraft: "Save draft",
      markSubmitted: "Mark submitted",
      draftSaved: "Draft saved.",
      saveFailed: "Save failed.",
      noDraft: "No saved declaration.",
      markedSubmitted: "Marked as submitted.",
      submitFailed: "Failed to mark submitted.",
      errors: {
        yearRequired: "Please enter a year.",
        yearOutOfRange: "Year is out of allowed range.",
        amountInvalid: "Invalid amount.",
        fixErrors: "Please fix the errors in the form.",
      },
    },

    declaration: {
      title: "Declaration",
      year: "Year",
      income: "Income",
      reliefs: "Reliefs",
      review: "Review",
      generatePdf: "Preview (PDF)",
      exportXlsx: "Export (Excel/CSV)",
      saveDraft: "Save draft",
      markSubmitted: "Mark submitted",
      draftSaved: "Draft saved.",
      saveFailed: "Save failed.",
      noDraft: "No saved declaration.",
      markedSubmitted: "Marked as submitted.",
      submitFailed: "Failed to mark submitted.",
    },

    submit: {
      title: "Sign and submit",
      status: "Status",
      taxDue: "Tax due",
      createdAt: "Created at",
      submittedAt: "Submitted at",
      step1: "Generate XML",
      step1Desc: "Create the declaration XML. You can download and sign it with a QES.",
      generateXml: "Generate XML",
      shareXml: "Share XML",
      step2: "Sign and file in the NRA portal",
      step2Desc: "Open the NRA portal, sign the XML with a QES and submit. Keep the intake number.",
      openNap: "Open NRA portal",
      step3: "Attach signed file and mark as submitted",
      step3Desc: "Attach the signed file or submission receipt. Then mark as submitted.",
      attachFile: "Attach file",
      markSubmitted: "Mark submitted",
      payment: "Pay the tax",
      paymentDesc: "You can pay now. The amount will be copied to the clipboard.",
      copyAmount: "Copy amount",
      goToPay: "Go to Pay",
      note: "Note",
      notePh: "Description...",
    },

    pay: {
      title: "Pay the tax",
      receiver: "Beneficiary",
      copyIban: "Copy IBAN",
      reason: "Payment reason",
      reasonPh: "Example: PIT for {{year}} EGN 0000000000",
      copyReason: "Copy reason",
      amount: "Amount",
      qrTitle: "EPC/SEPA QR code",
      qrNoteEur: "Scan in your mobile banking. Valid for SEPA transfers in EUR.",
      qrNoteBgn: "Informational QR. EUR is required for SEPA.",
      shareQr: "Share QR",
      saveToArchive: "Save to Archive",
    },

    incomes: {
      description: "Description",
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
      name: "Name",
      amount: "Amount",
      total: "Total",
      limit: "Limit: {{limit}} BGN",
      add: "Add",
      delete: "Delete",
      empty: "No deductions.",
      placeholders: { name: "Deduction name" },
      errors: {
        nameRequired: "Name is required when amount > 0.",
        amountInvalid: "Invalid amount.",
        overLimit: "Limit exceeded {{limit}}.",
        fixErrors: "Please fix the errors.",
      },
    },

    archive: {
      title: "Archive",
      open: "Open",
      draft: "Draft",
      submitted: "Submitted",
      empty: "No declarations.",
      loadFailed: "Cannot load archive.",
      deleteFailed: "Delete failed.",
      confirmDelete: "Delete declaration for {{y}}?",

      // New keys for extended screen
      no_file_title: "No file",
      no_file_text: "The record has no attached XML or PDF.",
      share_unavailable: "Sharing is not available",
      copied: "Copied",
      delete_title: "Delete",
      delete_text: "Are you sure you want to delete this record?",
      no_match: "No results match the filters.",
      filter_year: "Year",
      year_placeholder: "e.g. 2025",
      search: "Search",
      search_placeholder: "IBAN, amount, reason...",
      status: "Status",
      all: "All",
      declaration_for_year: "Declaration for",
      created: "Created",
      updated: "Updated",
      amount: "Amount",
      reason: "Reason",
      share: "Share",
      view_file: "File",
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

    notifications: {
      title: "Notifications",
      empty: "No notifications",
      addDemo: "Add demo",
      markAllRead: "Mark all read",
      clearAll: "Clear all",
      clear: {
        confirmTitle: "Clear",
        confirmBody: "Clear all notifications?",
      },
      markRead: "Mark as read",
      markUnread: "Mark as unread",
    },

    calculators: {
      title: "Calculators",
      net_salary: { title: "Net salary" },
      gross: "Gross salary",
      emp_contrib: "Employee contributions %",
      health_pct: "Health % (info)",
      other_deductions: "Other deductions",
      tax_pct: "Tax %",
      round_net: "Round net amount",
      contrib_total: "Contributions",
      tax_base: "Tax base",
      tax_due: "Tax due",
      net: "Net salary",
      tax: { title: "Tax calculator" },
      income_total: "Total income (annual)",
      norm_costs_pct: "Standard costs %",
      annual_tax_pct: "Tax %",
      soc_contrib: "Social contributions (amount)",
      adv_tax_paid: "Advance tax paid (amount)",
      round_tax: "Round settlement",
      norm_costs: "Standard costs",
      settlement: "Settlement (to pay)",
      note: "Positive = you owe. Negative = overpaid.",
      presets: {
        title: "Quick presets",
        text: "Choose a preset. Values will be filled automatically. You can edit them.",
      },
    },
  },
} as const;

export default {
  getLocale,
  setLocale,
  onLocaleChange,
  t,
  tSync,
  tabTitles,
};

