import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { applicationsApi } from '../../api/endpoints';
import { theme } from '../../theme';
import type { Application, ApplicationStatus } from '../../api/types';

type Filter = 'all' | ApplicationStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'viewed', label: 'Vues' },
  { key: 'shortlisted', label: 'Shortlist' },
  { key: 'hired', label: 'Embauché' },
  { key: 'rejected', label: 'Refusées' },
];

const STATUS_STEPS: { key: ApplicationStatus; label: string }[] = [
  { key: 'pending', label: 'Envoyée' },
  { key: 'viewed', label: 'Vue' },
  { key: 'shortlisted', label: 'Shortlist' },
  { key: 'hired', label: 'Embauché·e' },
];

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'En attente',
  viewed: 'Vue par le recruteur',
  shortlisted: 'En shortlist',
  rejected: 'Refusée',
  hired: 'Embauché·e !',
};

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  pending: theme.colors.textSecondary,
  viewed: theme.colors.primary,
  shortlisted: theme.colors.primary,
  rejected: theme.colors.danger,
  hired: theme.colors.success,
};

function indexFor(status: ApplicationStatus): number {
  if (status === 'rejected') return -1;
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

export function ApplicationsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationsApi.listMine(),
  });

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: 0,
      pending: 0,
      viewed: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0,
    };
    (data ?? []).forEach((a) => {
      c.all += 1;
      c[a.status] = (c[a.status] ?? 0) + 1;
    });
    return c;
  }, [data]);

  const visible = useMemo(
    () => (filter === 'all' ? data ?? [] : (data ?? []).filter((a) => a.status === filter)),
    [data, filter],
  );

  const header = (
    <>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Mes candidatures</Text>
        {data && data.length > 0 && <Text style={styles.headerCount}>{data.length}</Text>}
      </View>
      {data && data.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {FILTERS.filter((f) => f.key === 'all' || counts[f.key] > 0).map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f.label} · {counts[f.key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📨</Text>
          <Text style={styles.emptyTitle}>Pas encore de candidature</Text>
          <Text style={styles.emptySub}>Swipe à droite sur une offre pour postuler</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {header}
      <FlatList
        data={visible}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        renderItem={({ item }) => <ApplicationCard item={item} />}
        ListEmptyComponent={
          <View style={styles.emptyFilter}>
            <Text style={styles.emptyFilterText}>Aucune candidature dans cette catégorie</Text>
          </View>
        }
      />
    </View>
  );
}

function ApplicationCard({ item }: { item: Application }) {
  const idx = indexFor(item.status);
  const rejected = item.status === 'rejected';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLogo}>
          <Text style={styles.cardLogoText}>
            {(item.job?.company.name ?? '?').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.job?.title ?? 'Offre supprimée'}
          </Text>
          <Text style={styles.cardCo} numberOfLines={1}>
            {item.job?.company.name ?? '—'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
          <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[item.status] }]}>
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>

      {!rejected && (
        <View style={styles.timeline}>
          {STATUS_STEPS.map((step, i) => {
            const passed = i <= idx;
            return (
              <React.Fragment key={step.key}>
                <View style={styles.step}>
                  <View
                    style={[
                      styles.stepDot,
                      passed && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                    ]}
                  >
                    {passed && <Text style={styles.stepCheck}>✓</Text>}
                  </View>
                  <Text style={[styles.stepLabel, passed && { color: theme.colors.primary, fontFamily: theme.fonts.bold }]}>
                    {step.label}
                  </Text>
                </View>
                {i < STATUS_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      i < idx && { backgroundColor: theme.colors.primary },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}

      <Text style={styles.cardDate}>
        Postulé le {new Date(item.appliedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
  },
  filterScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontFamily: theme.fonts.bold, fontSize: 12, color: theme.colors.textSecondary },
  filterTextActive: { color: '#fff' },
  headerTitle: { fontFamily: theme.fonts.extrabold, fontSize: 22, color: '#111' },
  headerCount: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: theme.colors.primary,
    backgroundColor: 'rgba(26,111,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardLogo: { width: 42, height: 42, borderRadius: 12, backgroundColor: theme.colors.bgLight, alignItems: 'center', justifyContent: 'center' },
  cardLogoText: { fontFamily: theme.fonts.extrabold, fontSize: 16, color: theme.colors.primary },
  cardTitle: { fontFamily: theme.fonts.bold, fontSize: 14, color: '#111' },
  cardCo: { fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontFamily: theme.fonts.bold, fontSize: 10, letterSpacing: 0.3 },

  timeline: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  step: { alignItems: 'center', minWidth: 60 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheck: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  stepLabel: { marginTop: 4, fontSize: 10, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary },
  stepLine: { flex: 1, height: 2, backgroundColor: theme.colors.border, marginHorizontal: 2, marginBottom: 14 },

  cardDate: { fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },

  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontFamily: theme.fonts.extrabold, fontSize: 18, color: '#111', marginBottom: 6 },
  emptySub: { fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
  emptyFilter: { paddingTop: 40, alignItems: 'center' },
  emptyFilterText: { fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary },
});
