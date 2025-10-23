<<<<<<< HEAD
// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
=======
﻿import React from "react";
import { ComponentProps } from "react";
import { MaterialIcons } from "@expo/vector-icons";

/**
 * Unified cross-platform icon wrapper.
 * Accepts either a MaterialIcons name directly or one of a few
 * SF Symbols-like aliases used elsewhere in the app.
 */
type MaterialName = ComponentProps<typeof MaterialIcons>["name"];

const ALIAS_TO_MATERIAL: Record<string, MaterialName> = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
};

type Props = {
  name: string; // can be alias or MaterialIcons name
  size?: number;
  color?: string;
  style?: any;
  weight?: "thin" | "regular" | "bold"; // accepted for compatibility
};

export function IconSymbol({ name, size = 24, color, style }: Props) {
  const resolved: MaterialName = (ALIAS_TO_MATERIAL[name] as MaterialName) ?? (name as MaterialName);
  return <MaterialIcons name={resolved} size={size} color={color} style={style} />;
}

export default IconSymbol;
>>>>>>> restore/all
