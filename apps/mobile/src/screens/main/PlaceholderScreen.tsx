import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface Props {
  title: string;
  subtitle: string;
  emoji: string;
}

export function PlaceholderScreen({ title, subtitle, emoji }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.colors.bg },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontFamily: theme.fonts.extrabold, fontSize: 22, color: '#111', marginBottom: 6 },
  sub: { fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
});
