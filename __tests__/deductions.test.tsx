import React from "react";
import { create, act } from "react-test-renderer";
import Deductions from "../app/(tabs)/deductions";

// локализация мок
jest.mock("../src/localization", () => ({
  tSync: (_lng: any, key: string, params?: any) => {
    const M: Record<string, string> = {
      "deductions.title": "Облекчения",
      "deductions.total": "Общо",
      "deductions.limit": `Лимит: ${params?.limit ?? ""} лв.`,
      "deductions.add": "Добави",
      "deductions.delete": "Изтрий",
      "deductions.empty": "Няма облекчения.",
      "deductions.name": "Име",
      "deductions.amount": "Сума",
      "deductions.placeholders.name": "Име на облекчение",
      "common.save": "Запази",
      "common.error": "Грешка",
      "common.ok": "Ок",
      "deductions.errors.nameRequired": "Името е задължително при сума > 0.",
      "deductions.errors.amountInvalid": "Невалидна сума.",
      "deductions.errors.fixErrors": "Поправете грешките.",
      "deductions.errors.overLimit": "Надвишен лимит {{limit}}.",
    };
    return M[key] ?? key;
  },
  getLocale: () => Promise.resolve("bg"),
  onLocaleChange: () => () => {},
}));

const flush = () => new Promise((r) => setTimeout(r, 0));

test("validate row fields and total limit", async () => {
  let tr: any;
  await act(async () => {
    tr = create(<Deductions totalLimit={100} />);
    await flush();
  });

  const root = tr.root;
  // Добави ред
  const addBtn = root.findAll(
    (n: any) => n.type === "Text" && n.children?.[0] === "Добави"
  )[0].parent;
  await act(async () => {
    addBtn.props.onPress();
    await flush();
  });

  // Намери инпутите за име и сума по placeholder / keyboardType
  const nameInput = root.findAll(
    (n: any) => n.type === "TextInput" && n.props?.placeholder === "Име на облекчение"
  )[0];
  const amountInput = root.findAll(
    (n: any) => n.type === "TextInput" && n.props?.placeholder === "0.00"
  )[0];

  // Задай сума без име -> грешка за име
  await act(async () => {
    amountInput.props.onChangeText("50");
    await flush();
  });
  expect(JSON.stringify(tr.toJSON())).toContain("Името е задължително при сума > 0.");

  // Поправи име, задай невалидна сума
  await act(async () => {
    nameInput.props.onChangeText("Дарение");
    amountInput.props.onChangeText("abc");
    await flush();
  });
  expect(JSON.stringify(tr.toJSON())).toContain("Невалидна сума.");

  // Поправи сума, добави втори ред и надвиши лимита
  await act(async () => {
    amountInput.props.onChangeText("60");
    await flush();
  });

  await act(async () => {
    addBtn.props.onPress();
    await flush();
  });

  const secondAmount = root.findAll(
    (n: any) => n.type === "TextInput" && n.props?.placeholder === "0.00"
  )[1];

  await act(async () => {
    secondAmount.props.onChangeText("70"); // 60 + 70 = 130 > 100
    await flush();
  });

  const json = JSON.stringify(tr.toJSON());
  expect(json).toContain("Лимит: 100 лв.");
  expect(json).toContain("Надвишен лимит"); // сигнал за overLimit

  // Бутон Запази да е disabled
  const saveBtn = root.findAll(
    (n: any) => n.type === "Text" && n.children?.[0] === "Запази"
  )[0].parent;
  expect(saveBtn.props.disabled).toBe(true);
});

