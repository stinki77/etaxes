// 1) Матчъри от @testing-library/jest-native
require("@testing-library/jest-native/extend-expect");

// 2) Запази моковете на пресета; само фиксирай темата
try {
  const RN = require("react-native");
  if (RN && typeof RN.useColorScheme === "function") {
    jest.spyOn(RN, "useColorScheme").mockReturnValue("light");
  }
} catch {}

// 3) AsyncStorage мок
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// 4) Safe Area мок
try {
  jest.mock("react-native-safe-area-context", () =>
    require("react-native-safe-area-context/jest/mock")
  );
} catch {}

// 5) Expo модули (минимални мокове)
jest.mock("expo-font", () => ({ useFonts: () => [true] }));
jest.mock("expo-linking", () => ({ openURL: jest.fn() }));
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));

jest.mock("expo-print", () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: "file://mock.pdf" }),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  shareAsync: jest.fn(),
}));

jest.mock("expo-file-system", () => ({
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  documentDirectory: "/documents",
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

// 6) RN вътрешности: моквай само ако съществува файлът в текущата версия
try {
  require.resolve("react-native/Libraries/Animated/NativeAnimatedHelper");
  jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");
} catch {}

// 7) Reanimated: мок, само ако пакетът е инсталиран
try {
  require.resolve("react-native-reanimated");
  jest.mock("react-native-reanimated", () => {
    const mock = require("react-native-reanimated/mock");
    mock.default.call = () => {};
    return mock;
  });
} catch {}

// 8) Филтър на шумни грешки след приключване на тестове
const origError = console.error;
console.error = (...args) => {
  const msg = args[0];
  if (
    typeof msg === "string" &&
    ((msg.includes("was not wrapped in act") && msg.includes("An update to")) ||
      msg.includes("error boundary"))
  ) {
    return;
  }
  origError(...args);
};
