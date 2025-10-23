// __tests__/csv.test.ts
import { parseCsvContent, parseAndStoreCsvText, loadImportedIncomesForYear } from "../src/lib/csv";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () => {
  const store: Record<string, string> = {};
  return {
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
      _internalStore: store,
    },
  };
});

describe("csv parsing and storage", () => {
  const sampleCsv = `description,amount,date
Consulting,1000,2024-01-10
Sale,250.5,2024-02-12
Refund,0,2024-03-01
`;

  it("parseCsvContent - извлича и филтрира редове", () => {
    const items = parseCsvContent(sampleCsv);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(2); // третият ред amount=0 се филтрира
    expect(items[0].description).toBe("Consulting");
    expect(items[0].amount).toBeCloseTo(1000, 2);
    expect(items[1].description).toBe("Sale");
    expect(items[1].amount).toBeCloseTo(250.5, 2);
  });

  it("parseAndStoreCsvText - записва в AsyncStorage и връща сумата", async () => {
    const year = "2024";
    // убедим се, че няма първоначално съдържание
    await AsyncStorage.removeItem(`incomes_${year}`);
    const sum = await parseAndStoreCsvText(sampleCsv, year);
    expect(sum).toBeCloseTo(1250.5, 2);

    // проверка в AsyncStorage
    const raw = await AsyncStorage.getItem(`incomes_${year}`);
    expect(raw).toBeTruthy();
    const arr = JSON.parse(raw as string);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(2);
    expect(arr[0].amount).toBeCloseTo(1000, 2);

    // извикваме отново parseAndStoreCsvText с допълнителен CSV -> merge
    const moreCsv = `description,amount
Extra,49.5
`;
    const sum2 = await parseAndStoreCsvText(moreCsv, year);
    expect(sum2).toBeCloseTo(1300.0, 2);
  });

  it("loadImportedIncomesForYear - връща списък от AsyncStorage", async () => {
    const list = await loadImportedIncomesForYear("2024");
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(3); // предишните тестове са записали 3 елемента
  });
});
