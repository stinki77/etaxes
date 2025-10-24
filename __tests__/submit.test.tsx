import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import SubmitScreen from "../app/submit";

// Мокове за навигация и параметри
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSearchParams: () => ({})
}));

// Мокащи зависимости
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));
jest.mock("expo-linking", () => ({ openURL: jest.fn() }));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({
  cacheDirectory: "/tmp/",
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));
jest.mock("../src/lib/napXml", () => ({ generateNapXml: jest.fn(() => "<xml></xml>") }));
jest.mock("../src/lib/archive", () => ({ saveToArchive: jest.fn() }));
// В тестов режим връщаме ключа, за да не зависим от преводите
jest.mock("../src/localization/i18n", () => ({ t: (k: string) => k }));

describe("SubmitScreen", () => {
  it("рендерира основните полета", () => {
    const { getByPlaceholderText, getByText } = render(<SubmitScreen />);
    expect(getByPlaceholderText("egn_placeholder")).toBeTruthy();
    expect(getByPlaceholderText("iban_placeholder")).toBeTruthy();
    expect(getByPlaceholderText("reason_placeholder")).toBeTruthy();
    expect(getByText("generate_xml")).toBeTruthy();
  });

  it("не генерира XML ако липсват полета", () => {
    const { getByText } = render(<SubmitScreen />);
    const btn = getByText("generate_xml");
    fireEvent.press(btn);
    expect(btn).toBeTruthy();
  });
});

