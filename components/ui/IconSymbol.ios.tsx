<<<<<<< HEAD
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
=======
﻿import React from "react";
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
>>>>>>> restore/all
