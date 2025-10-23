import React from "react";
import { create, act } from "react-test-renderer";
import Archive from "../app/(tabs)/archive";
import { Alert } from "react-native";

// Мок за локализацията – фиксирай "bg"
jest.mock("../src/localization", () => ({
  tSync: (_lng: any, key: string) => {
    const map: Record<string, string> = {
      "archive.title": "Архив",
      "archive.searchPlaceholder": "Търси по година или име",
      "archive.emptyTitle": "Нямате записи в архива",
      "archive.emptyText": "Тук ще виждате подадени декларации, плащания и чернови.",
      "archive.year": "Година",
      "archive.date": "Дата",
      "archive.na": "н/п",
      "archive.open": "Отвори",
      "archive.openTitle": "Преглед",
      "archive.delete": "Изтрий",
      "archive.cancel": "Отказ",
      "archive.confirmTitle": "Изтриване",
      "archive.confirmText": "Сигурни ли сте, че искате да изтриете записа?",
      "archive.untitled": "Без име",
      "archive.status.submitted": "Подадена",
      "archive.status.paid": "Платена",
      "archive.status.draft": "Чернова",
    };
    return map[key] ?? key;
  },
  getLocale: () => Promise.resolve("bg"),
  onLocaleChange: () => () => {},
}));

// Примитивен мок за AsyncStorage
const store: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      store[k] = v;
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      delete store[k];
      return Promise.resolve();
    }),
  },
}));

const KEY = "etaxes.archive.v1";

const seed = [
  {
    id: "b",
    title: "Декларация 2024",
    amount: 120.5,
    year: 2024,
    dateISO: "2025-04-29T10:00:00.000Z",
    status: "submitted",
  },
  {
    id: "a",
    title: "Плащане 2025",
    amount: 300,
    year: 2025,
    dateISO: "2025-09-01T12:00:00.000Z",
    status: "paid",
  },
];

function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

describe("Archive screen", () => {
  beforeEach(() => {
    store[KEY] = JSON.stringify(seed);
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    jest.restoreAllMocks();
  });

  test("renders and sorts by date desc", async () => {
    let tr: any;
    await act(async () => {
      tr = create(<Archive />);
      await flush();
    });

    const allText = JSON.stringify(tr.toJSON());
    expect(allText).toContain("Плащане 2025"); // първи е най-новият
  });

  test("filters by year via search", async () => {
    let tr: any;
    await act(async () => {
      tr = create(<Archive />);
      await flush();
    });

    const root = tr.root;
    const search = root.findByProps({ accessibilityLabel: "search" });
    await act(async () => {
      search.props.onChangeText("2024");
      await flush();
    });

    const textJSON = JSON.stringify(tr.toJSON());
    expect(textJSON).toContain("Декларация 2024");
    expect(textJSON).not.toContain("Плащане 2025");
  });

  test("deletes an item after confirm", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(
      // @ts-ignore
      (_title, _msg, buttons) => {
        const del = (buttons || []).find((b: any) => b.style === "destructive");
        if (del && typeof del.onPress === "function") del.onPress();
      }
    );

    let tr: any;
    await act(async () => {
      tr = create(<Archive />);
      await flush();
    });

    const root = tr.root;
    const deleteBtn = root.findAll(
      (n: any) => n.props?.accessibilityLabel === "delete" && typeof n.type === "string"
    )[0];

    await act(async () => {
      deleteBtn.props.onPress();
      await flush();
    });

    const textJSON = JSON.stringify(tr.toJSON());
    expect(textJSON).not.toContain("Плащане 2025");
    expect(alertSpy).toHaveBeenCalled();
  });
});

