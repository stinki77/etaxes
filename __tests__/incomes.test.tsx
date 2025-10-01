// __tests__/incomes.test.tsx
import React from "react";
import { create, act } from "react-test-renderer";
import Incomes from "../app/(tabs)/incomes";

// Мок за локализация
jest.mock("../src/localization", () => ({
  tSync: (_lng: any, key: string) => {
    const m: Record<string, string> = {
      "createTax.income": "Доходи",
      "createTax.year": "Година",
      "common.save": "Запази",
      "incomes.amount": "Сума",
      "incomes.date": "Дата",
      "incomes.add": "Добави ред",
      "incomes.delete": "Изтрий",
      "incomes.empty": "Няма записи.",
      "incomes.total": "Общо",
      "incomes.placeholders.description": "Описание",
      "incomes.errors.descRequired": "Описание е задължително.",
      "incomes.errors.amountInvalid": "Невалидна сума.",
      "incomes.errors.dateInvalid": "Невалидна дата (YYYY-MM-DD).",
      "incomes.errors.fixErrors": "Поправете грешките.",
    };
    return m[key] ?? key;
  },
  getLocale: () => Promise.resolve("bg"),
  onLocaleChange: () => () => {},
}));

// Мок за AsyncStorage
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

const flush = () => new Promise((r) => setTimeout(r, 0));

test("add row, validate errors, block save when invalid", async () => {
  let tr: any;
  await act(async () => {
    tr = create(<Incomes />);
    await flush();
  });

  const root = tr.root;

  // Натисни "Добави ред"
  const addBtnText = root.findAll(
    (n: any) => n.type === "Text" && n.children?.[0] === "Добави ред"
  )[0];
  const addBtn = addBtnText.parent;
  await act(async () => {
    addBtn.props.onPress();
    await flush();
  });

  // Намери TextInput-ите в първия ред: описание, сума, дата
  const inputs = root.findAllByType("TextInput");
  // inputs[0] и [1] вероятно са полета от хедъра (година и т.н.), затова търсим по placeholder-и
  const descInput = root.findAll(
    (n: any) => n.type === "TextInput" && n.props?.placeholder === "Описание"
  )[0];
  const amountInput = root.findAll(
    (n: any) => n.type === "TextInput" && n.props?.placeholder === "0.00"
  )[0];
  const dateInput = root.findAll(
    (n: any) => n.type === "TextInput" && n.props?.placeholder === "YYYY-MM-DD"
  )[0];

  await act(async () => {
    descInput.props.onChangeText("");            // празно описание -> грешка
    amountInput.props.onChangeText("abc");       // невалидна сума
    dateInput.props.onChangeText("2025/09/01");  // грешен формат
    await flush();
  });

  const json = JSON.stringify(tr.toJSON());
  expect(json).toContain("Описание е задължително.");
  expect(json).toContain("Невалидна сума.");
  expect(json).toContain("Невалидна дата (YYYY-MM-DD).");

  // Бутон „Запази“ трябва да е disabled
  const saveBtnText = root.findAll(
    (n: any) => n.type === "Text" && n.children?.[0] === "Запази"
  )[0];
  const saveBtn = saveBtnText.parent;
  expect(saveBtn.props.disabled).toBe(true);
});

