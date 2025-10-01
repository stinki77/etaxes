import React from "react";
import { render } from "@testing-library/react-native";
import { MonoText } from "../StyledText";

describe("MonoText", () => {
  it("renders correctly", () => {
    const { getByText, toJSON } = render(<MonoText>Snapshot test!</MonoText>);
    expect(getByText("Snapshot test!")).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });
});
