import React from "react";
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
