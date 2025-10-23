<<<<<<< HEAD
import { PropsWithChildren, useState } from 'react';
=======
﻿import React, { PropsWithChildren, useState } from 'react';
>>>>>>> restore/all
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
<<<<<<< HEAD
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
=======
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

type CollapsibleProps = PropsWithChildren<{ title: string }>;

export function Collapsible({ children, title }: CollapsibleProps) {
>>>>>>> restore/all
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? 'light';

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
<<<<<<< HEAD
        activeOpacity={0.8}>
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />

=======
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={title}
      >
        <IconSymbol
          name="chevron-right"
          size={18}
          color={theme === 'light' ? Colors.light.tint : Colors.dark.tint}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />
>>>>>>> restore/all
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>
      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
<<<<<<< HEAD
});
=======
});
>>>>>>> restore/all
