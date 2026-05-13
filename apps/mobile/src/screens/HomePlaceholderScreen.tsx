import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '../stores/auth';
import { theme } from '../theme';

export function HomePlaceholderScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>✓</Text>
      </View>
      <Text style={styles.title}>Tu es connecté !</Text>
      <Text style={styles.subtitle}>L'auth backend fonctionne ✓</Text>

      <View style={styles.card}>
        <Row label="ID" value={user?.id ?? '—'} />
        <Row label="Téléphone" value={user?.phone ?? '—'} />
        <Row label="Pays" value={user?.countryCode ?? '—'} />
        <Row label="Rôle" value={user?.role ?? '—'} />
        <Row label="Statut" value={user?.status ?? '—'} />
      </View>

      <Text style={styles.note}>
        Plan 4A complet. Les écrans Onboarding (3 domaines), Feed swipe, Chat et Premium IA viennent
        dans les plans 4B → 4E.
      </Text>

      <TouchableOpacity style={styles.btn} onPress={() => void signOut()} activeOpacity={0.85}>
        <Text style={styles.btnText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, paddingTop: 80, backgroundColor: theme.colors.bg, flexGrow: 1 },
  iconBox: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 36 },
  title: {
    fontFamily: theme.fonts.extrabold,
    fontSize: 26,
    color: '#111',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { fontFamily: theme.fonts.semibold, color: theme.colors.textSecondary, fontSize: 13 },
  rowValue: { fontFamily: theme.fonts.bold, color: '#111', fontSize: 13, maxWidth: '60%' },
  note: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 16,
  },
  btn: {
    marginTop: 24,
    backgroundColor: theme.colors.danger,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontFamily: theme.fonts.bold, fontSize: 14 },
});
