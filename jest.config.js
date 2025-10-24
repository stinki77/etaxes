// jest.config.js
module.exports = {
  preset: "jest-expo",
  testEnvironment: "node",
  setupFiles: ["react-native-gesture-handler/jestSetup.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^expo-router$": "<rootDir>/__mocks__/expo-router.ts",
    "^@/(.*)$": "<rootDir>/$1",
    "^expo-file-system/legacy$": "expo-file-system",
    "^react-native-reanimated$": "react-native-reanimated/mock",
    "\\.(png|jpg|jpeg|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less|sass|scss)$": "identity-obj-proxy"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(?:@react-native|react-native|react-native-.*|@react-native-community|@react-navigation|react-navigation|expo(nent)?|@expo(nent)?/.*|expo-modules-core|@expo/.*|@unimodules/.*|react-native-reanimated|@shopify/flash-list)/)"
  ],
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  clearMocks: true,
  cacheDirectory: ".jest-cache"
};