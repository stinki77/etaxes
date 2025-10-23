// __tests__/createTax.test.tsx
import React from "react";
import { act, create } from "react-test-renderer";
import CreateTax from "../app/(tabs)/declaration";

const flushPromises = () => new Promise(setImmediate);

test("CreateTax renders", async () => {
  let tree: any;
  await act(async () => {
    tree = create(<CreateTax />);
    await flushPromises(); // изчакай loadImportedIncomesForYear + setState
  });
  expect(tree.toJSON()).toBeTruthy();
});

