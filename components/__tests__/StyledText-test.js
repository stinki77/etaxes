<<<<<<< HEAD
import * as React from 'react';
import renderer from 'react-test-renderer';

import { MonoText } from '../StyledText';

it(`renders correctly`, () => {
  const tree = renderer.create(<MonoText>Snapshot test!</MonoText>).toJSON();

  expect(tree).toMatchSnapshot();
=======
﻿import React from "react";
import { render } from "@testing-library/react-native";
import { MonoText } from "../StyledText";

describe("MonoText", () => {
  it("renders correctly", () => {
    const { getByText, toJSON } = render(<MonoText>Snapshot test!</MonoText>);
    expect(getByText("Snapshot test!")).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });
>>>>>>> restore/all
});
