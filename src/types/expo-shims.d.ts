// src/types/expo-shims.d.ts
declare module "expo-web-browser";
declare module "expo-haptics";
declare module "expo-blur";
declare module "expo-symbols";
declare module "react-native-reanimated";

declare module "expo-file-system" {
  export const documentDirectory: string | null;
  export const cacheDirectory: string | null;
  export enum EncodingType { UTF8 = "utf8" }
  export function writeAsStringAsync(
    uri: string,
    data: string,
    opts?: { encoding?: EncodingType | string }
  ): Promise<void>;
}
