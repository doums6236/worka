import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation } from '@tanstack/react-query';
import { domainsApi, candidateProfileApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { theme } from '../../theme';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'DomainSelection'>;

const MAX_SELECTION = 3;

export function DomainSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const refreshOnboardingStatus = useAuthStore((s) => s.refreshOnboardingStatus);

  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: domains, isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.list(),
  });

  const setDomainsMutation = useMutation({
    mutationFn: (ids: string[]) => candidateProfileApi.setDomains(ids),
    onSuccess: () => {
      void refreshOnboardingStatus();
      navigation.replace('CvUpload');
    },
    onError: (e: unknown) => {
      setError(e instanceof ApiError ? e.message : 'Erreur réseau');
    },
  });

  function toggle(id: string) {
    setError(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
  }

  function onConfirm() {
    if (selected.length !== MAX_SELECTION) return;
    setDomainsMutation.mutate(selected);
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.step}>ÉTAPE 2 / 3</Text>
        <Text style={styles.title}>
          Choisis <Text style={styles.titleEm}>3 domaines</Text>
        </Text>
        <Text style={styles.subtitle}>Qu'est-ce qui te passionne ?</Text>
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {selected.length} / {MAX_SELECTION} sélectionnés
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {domains?.map((d) => {
            const isSelected = selected.includes(d.id);
            return (
              <TouchableOpacity
                key={d.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => toggle(d.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardEmoji}>{d.icon ?? '⚪'}</Text>
                <Text style={styles.cardName}>{d.nameFr}</Text>
                {isSelected && (
                  <View style={styles.check}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.cta,
            selected.length === MAX_SELECTION ? styles.ctaEnabled : styles.ctaDisabled,
          ]}
          onPress={onConfirm}
          disabled={selected.length !== MAX_SELECTION || setDomainsMutation.isPending}
          activeOpacity={0.85}
        >
          {setDomainsMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>
              {selected.length === MAX_SELECTION
                ? 'Continuer →'
                : `Sélectionne ${MAX_SELECTION - selected.length} domaine${MAX_SELECTION - selected.length > 1 ? 's' : ''}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: { padding: 24, paddingTop: 60, alignItems: 'center' },
  step: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    fontFamily: theme.fonts.extrabold,
    fontSize: 24,
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  titleEm: { color: theme.colors.primary },
  subtitle: { fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary },
  counter: {
    marginTop: 12,
    backgroundColor: 'rgba(26,111,255,0.1)',
    borderColor: 'rgba(26,111,255,0.2)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  counterText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.primary,
  },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  cardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(26,111,255,0.05)',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardName: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    color: '#222',
    textAlign: 'center',
    lineHeight: 16,
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.semibold,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 },
  cta: { paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  ctaEnabled: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaDisabled: { backgroundColor: '#D0D8EE' },
  ctaText: {
    color: '#fff',
    fontFamily: theme.fonts.extrabold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
