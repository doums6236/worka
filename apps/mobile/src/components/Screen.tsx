import React from 'react';
import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  bg?: string;
  /** Default ['top'] — the bottom inset is usually owned by the tab bar. */
  edges?: Edge[];
  /** When true, no SafeAreaView wrapper (the screen handles its own insets). */
  noSafeArea?: boolean;
}

export function Screen({ children, style, bg, edges = ['top'], noSafeArea }: Props) {
  const backgroundColor = bg ?? theme.colors.bg;
  if (noSafeArea) {
    return <View style={[styles.root, { backgroundColor }, style]}>{children}</View>;
  }
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor }, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
