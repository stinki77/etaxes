/** @jest-environment jsdom */
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import Screen from "../app/(tabs)/declaration";

test("Declaration renders and changes year", () => {
  render(<Screen />);
  // гарантираме, че е рендерирано
  expect(screen.getByText(/Декларация/i)).toBeTruthy();

  // първото поле за година има начална стойност "2025"
  const year = screen.getByDisplayValue("2025");
  fireEvent.changeText(year, "2024");
  expect((year as any).props.value).toBe("2024");
});
