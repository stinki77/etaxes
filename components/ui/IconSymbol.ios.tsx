import React from "react";
import { ComponentProps } from "react";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  name: ComponentProps<typeof MaterialIcons>["name"];
  size?: number;
  color?: string;
  style?: any;
  weight?: "thin" | "regular" | "bold";
};

export function IconSymbol({ name, size = 18, color, style }: Props) {
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
}

export default IconSymbol;
