<<<<<<< HEAD
/**
=======
﻿/**
>>>>>>> restore/all
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

<<<<<<< HEAD
import { Colors } from '@/constants/Colors';
=======
import Colors from '@/constants/Colors';
>>>>>>> restore/all
import { useColorScheme } from '@/hooks/useColorScheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
<<<<<<< HEAD
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
=======
): string {
  const theme = useColorScheme() ?? 'light';
  const t = theme as 'light' | 'dark';
  const colorFromProps = props[t];

  return colorFromProps ?? Colors[t][colorName];
>>>>>>> restore/all
}
