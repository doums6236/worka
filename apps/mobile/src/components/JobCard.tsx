import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { MapPin, Briefcase, Banknote, Clock } from 'lucide-react-native';
import { MatchScoreRing } from './MatchScoreRing';
import { theme } from '../theme';
import type { FeedItem } from '../api/types';

interface Props {
  item: FeedItem;
  onApply?: () => void;
}

function formatSalary(min?: number | null, max?: number | null, currency = 'GNF'): string {
  if (!min && !max) return 'Salaire à négocier';
  const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}K`);
  if (min && max) return `${fmt(min)}–${fmt(max)} ${currency}`;
  if (min) return `Dès ${fmt(min)} ${currency}`;
  return `Jusqu'à ${fmt(max!)} ${currency}`;
}

const typeLabel: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  stage: 'Stage',
  freelance: 'Freelance',
};

export function JobCard({ item, onApply }: Props) {
  const flip = useSharedValue(0); // 0 = front, 1 = back

  function toggleFlip() {
    flip.value = withTiming(flip.value === 0 ? 1 : 0, { duration: 520 });
  }

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
    opacity: flip.value < 0.5 ? 1 : 0,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }],
    opacity: flip.value < 0.5 ? 0 : 1,
  }));

  const { job, matchScore } = item;
  const initials = job.company.name.slice(0, 2).toUpperCase();

  return (
    <Pressable style={styles.root} onPress={toggleFlip}>
      <Animated.View style={[styles.face, frontStyle]}>
        <View style={styles.banner}>
          <View style={styles.bannerOverlay} />
          <View style={styles.logoWrap}>
            <MatchScoreRing score={matchScore} size={110} strokeWidth={5}>
              <View style={styles.logo}>
                {job.company.logoUrl ? (
                  <Text style={styles.logoText}>{initials}</Text>
                ) : (
                  <Text style={styles.logoText}>{initials}</Text>
                )}
              </View>
            </MatchScoreRing>
          </View>
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>Tape pour plus →</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {job.company.name} · {job.company.sector}
          </Text>

          <View style={styles.pills}>
            <View style={[styles.pill, styles.pillLoc]}>
              <MapPin size={11} color="#FF5050" />
              <Text style={[styles.pillText, { color: '#FF5050' }]}>
                {job.location ?? job.company.city ?? job.country}
              </Text>
            </View>
            <View style={[styles.pill, styles.pillType]}>
              <Briefcase size={11} color={theme.colors.primary} />
              <Text style={[styles.pillText, { color: theme.colors.primary }]}>
                {typeLabel[job.type] ?? job.type}
              </Text>
            </View>
            <View style={[styles.pill, styles.pillSal]}>
              <Banknote size={11} color={theme.colors.success} />
              <Text style={[styles.pillText, { color: theme.colors.success }]}>
                {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
              </Text>
            </View>
          </View>

          <View style={styles.sep} />

          <View style={styles.skills}>
            {job.jobSkills.slice(0, 4).map((js) => (
              <View key={js.skillId} style={styles.skill}>
                <Text style={styles.skillText}>{js.skill.name}</Text>
              </View>
            ))}
          </View>

          {job.deadline && (
            <View style={styles.deadline}>
              <Clock size={11} color={theme.colors.warning} />
              <Text style={styles.deadlineText}>
                Expire {new Date(job.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.View style={[styles.face, styles.faceBack, backStyle]}>
        <View style={styles.backHeader}>
          <View style={styles.backLogo}>
            <Text style={styles.backLogoText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.backTitle} numberOfLines={1}>{job.title}</Text>
            <Text style={styles.backCo} numberOfLines={1}>{job.company.name}</Text>
          </View>
          <Pressable onPress={toggleFlip} hitSlop={12}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.backBody} showsVerticalScrollIndicator={false}>
          <View style={styles.infoGrid}>
            <InfoBox label="Contrat" value={typeLabel[job.type] ?? job.type} />
            <InfoBox label="Salaire" value={formatSalary(job.salaryMin, job.salaryMax, job.currency)} />
            <InfoBox label="Match" value={`${Math.round(matchScore)}%`} />
            <InfoBox label="Localisation" value={job.location ?? job.country} />
          </View>

          <Text style={styles.sectionLabel}>À propos du poste</Text>
          <Text style={styles.desc}>{job.description}</Text>

          {job.jobSkills.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Compétences</Text>
              <View style={styles.skills}>
                {job.jobSkills.map((js) => (
                  <View key={js.skillId} style={styles.skill}>
                    <Text style={styles.skillText}>{js.skill.name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {onApply && (
            <Pressable style={styles.applyCta} onPress={onApply}>
              <Text style={styles.applyText}>Postuler maintenant →</Text>
            </Pressable>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </Animated.View>
    </Pressable>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, borderRadius: 28, backgroundColor: theme.colors.surface, overflow: 'hidden', shadowColor: '#1A6FFF', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  face: { position: 'absolute', inset: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', backgroundColor: theme.colors.surface, borderRadius: 28 },
  faceBack: { backgroundColor: theme.colors.surface },

  // Banner (front)
  banner: { height: 220, position: 'relative', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  bannerOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,56,196,0.15)' },
  logoWrap: { backgroundColor: '#fff', borderRadius: 60, padding: 4 },
  logo: { width: 84, height: 84, borderRadius: 24, backgroundColor: theme.colors.bgLight, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: theme.fonts.extrabold, fontSize: 32, color: theme.colors.primary },
  tapHint: { position: 'absolute', bottom: 12, right: 14, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  tapHintText: { fontSize: 10, fontFamily: theme.fonts.semibold, color: theme.colors.textSecondary },

  // Body
  body: { padding: 20 },
  title: { fontFamily: theme.fonts.extrabold, fontSize: 20, color: '#111', marginBottom: 3, letterSpacing: -0.4 },
  sub: { fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary, marginBottom: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pillLoc: { backgroundColor: '#FFF0F0' },
  pillType: { backgroundColor: '#EEF4FF' },
  pillSal: { backgroundColor: '#EDFFF6' },
  pillText: { fontFamily: theme.fonts.bold, fontSize: 11 },
  sep: { height: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  skill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.colors.bgLight },
  skillText: { fontFamily: theme.fonts.semibold, fontSize: 11, color: '#444' },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  deadlineText: { fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.textSecondary },

  // Back face
  backHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backLogo: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.bgLight, alignItems: 'center', justifyContent: 'center' },
  backLogoText: { fontFamily: theme.fonts.extrabold, fontSize: 18, color: theme.colors.primary },
  backTitle: { fontFamily: theme.fonts.extrabold, fontSize: 15, color: '#111' },
  backCo: { fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  closeBtn: { fontSize: 18, color: theme.colors.textSecondary, padding: 4 },
  backBody: { flex: 1, padding: 20 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  infoBox: { flexBasis: '48%', backgroundColor: theme.colors.bgLight, borderRadius: 14, padding: 12 },
  infoLabel: { fontFamily: theme.fonts.bold, fontSize: 9, color: theme.colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontFamily: theme.fonts.bold, fontSize: 13, color: '#111' },
  sectionLabel: { fontFamily: theme.fonts.bold, fontSize: 10, color: theme.colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, marginBottom: 8 },
  desc: { fontFamily: theme.fonts.regular, fontSize: 13, color: '#333', lineHeight: 21 },
  applyCta: { marginTop: 20, backgroundColor: theme.colors.success, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  applyText: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 14, letterSpacing: 0.3 },
});
