import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MapPin, Briefcase } from 'lucide-react-native';
import { swipesApi, applicationsApi } from '../../api/endpoints';
import { theme } from '../../theme';
import type { SwipeRecord } from '../../api/types';

export function SavedJobsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: () => swipesApi.listSaved(),
  });

  const apply = useMutation({
    mutationFn: (jobId: string) => applicationsApi.create(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const items = (data ?? []).filter((s): s is SwipeRecord & { job: NonNullable<SwipeRecord['job']> } => !!s.job);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Sauvegardées</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Star size={32} color={theme.colors.premium} />
          </View>
          <Text style={styles.emptyTitle}>Aucune offre sauvegardée</Text>
          <Text style={styles.emptySub}>
            Tape l'étoile sur une offre pour la retrouver ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <JobRow
              record={item}
              onApply={() => apply.mutate(item.job.id)}
              applying={apply.isPending && apply.variables === item.job.id}
            />
          )}
        />
      )}
    </View>
  );
}

function JobRow({
  record,
  onApply,
  applying,
}: {
  record: SwipeRecord & { job: NonNullable<SwipeRecord['job']> };
  onApply: () => void;
  applying: boolean;
}) {
  const job = record.job;
  const initials = job.company.name.slice(0, 2).toUpperCase();
  const salary =
    job.salaryMin && job.salaryMax
      ? `${formatK(job.salaryMin)}–${formatK(job.salaryMax)} ${job.currency}`
      : job.salaryMin
      ? `Dès ${formatK(job.salaryMin)} ${job.currency}`
      : '';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
          <Text style={styles.company} numberOfLines={1}>{job.company.name}</Text>
        </View>
        {record.matchScoreAtSwipe != null && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{Math.round(record.matchScoreAtSwipe)}%</Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        {job.location ? (
          <View style={styles.metaChip}>
            <MapPin size={12} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{job.location}</Text>
          </View>
        ) : null}
        <View style={styles.metaChip}>
          <Briefcase size={12} color={theme.colors.textSecondary} />
          <Text style={styles.metaText}>{typeLabel(job.type)}</Text>
        </View>
        {salary ? (
          <View style={styles.metaChip}>
            <Text style={[styles.metaText, { fontFamily: theme.fonts.bold, color: theme.colors.primary }]}>
              {salary}
            </Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.applyBtn}
        onPress={onApply}
        disabled={applying}
        activeOpacity={0.85}
      >
        {applying ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.applyText}>Postuler</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function formatK(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}K`;
}

function typeLabel(t: string) {
  return t === 'cdi' ? 'CDI' : t === 'cdd' ? 'CDD' : t === 'stage' ? 'Stage' : 'Freelance';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontFamily: theme.fonts.extrabold, fontSize: 22, color: '#111' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 28, backgroundColor: '#FEF4E1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: theme.fonts.extrabold, fontSize: 17, color: '#111', marginBottom: 6 },
  emptySub: { fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: theme.colors.bgLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: theme.fonts.extrabold, fontSize: 16, color: theme.colors.primary },
  title: { fontFamily: theme.fonts.extrabold, fontSize: 15, color: '#111', lineHeight: 19 },
  company: { fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

  matchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.bgLight,
  },
  matchText: { fontFamily: theme.fonts.extrabold, fontSize: 12, color: theme.colors.primary },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 999,
  },
  metaText: { fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.textSecondary },

  applyBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyText: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 13, letterSpacing: 0.3 },
});
