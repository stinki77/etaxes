/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testEnvironment: "jsdom",
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native(-community)?|@react-navigation/.*|react-native-svg|react-clone-referenced-element|expo(nent)?|@expo(nent)?/.*|expo-modules-core|expo-.*)"
  ],
  setupFilesAfterEnv: ["@testing-library/react-native/extend-expect"],
  moduleNameMapper: {
    "\\.(png|jpg|jpeg|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js"
  }
};
