<<<<<<< HEAD
import { Text, TextProps } from './Themed';
=======
﻿import { Text, TextProps } from './Themed';
>>>>>>> restore/all

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'SpaceMono' }]} />;
}
