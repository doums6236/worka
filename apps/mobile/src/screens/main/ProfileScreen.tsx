import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Tag,
  LogOut,
  ChevronRight,
  Sparkles,
  Bell,
  Shield,
  HelpCircle,
  Globe,
} from 'lucide-react-native';
import { candidateProfileApi } from '../../api/endpoints';
import { useAuthStore } from '../../stores/auth';
import { getLocale, getCountryCode, detectLocale } from '../../lib/i18n';
import { theme } from '../../theme';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['candidate-profile'],
    queryFn: () => candidateProfileApi.get(),
    enabled: user?.role === 'candidate',
  });

  const { data: domains } = useQuery({
    queryKey: ['my-domains'],
    queryFn: () => candidateProfileApi.getDomains(),
    enabled: user?.role === 'candidate',
  });

  const fullName =
    profile?.firstName || profile?.lastName
      ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
      : 'Mon profil';

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('') || (user?.phone?.slice(-2) ?? '?');

  function onSignOut() {
    Alert.alert('Déconnexion', 'Tu veux vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          queryClient.clear();
        },
      },
    ]);
  }

  function openCv() {
    if (!profile?.cvUrl) return;
    void Linking.openURL(profile.cvUrl).catch(() =>
      Alert.alert('Erreur', "Impossible d'ouvrir le CV"),
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.phone}>{user?.phone ?? ''}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>
              {user?.role === 'candidate'
                ? 'Candidat'
                : user?.role === 'recruiter'
                ? 'Recruteur'
                : 'Admin'}
            </Text>
          </View>
        </View>

        {user?.role === 'candidate' && (
          <>
            {profile?.isPremium ? (
              <View style={styles.premiumCard}>
                <Sparkles size={20} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.premiumTitle}>Worka Premium</Text>
                  <Text style={styles.premiumSub}>
                    {profile.aiCreditsRemaining} crédits IA · auto-apply{' '}
                    {profile.autoApplyEnabled ? 'actif' : 'inactif'}
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.upgradeCard} activeOpacity={0.85}>
                <View style={styles.upgradeIcon}>
                  <Sparkles size={20} color={theme.colors.premium} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upgradeTitle}>Passe à Worka Premium</Text>
                  <Text style={styles.upgradeSub}>
                    L'IA postule pour toi et rédige tes lettres
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}

            <Section title="Mon profil">
              {profileLoading ? (
                <ActivityIndicator color={theme.colors.primary} style={{ padding: 20 }} />
              ) : (
                <>
                  <Row
                    icon={<FileText size={18} color={theme.colors.primary} />}
                    label="CV"
                    value={profile?.cvUrl ? 'Téléversé' : 'Aucun CV'}
                    onPress={profile?.cvUrl ? openCv : undefined}
                    cta={profile?.cvUrl ? 'Ouvrir' : 'Ajouter'}
                  />
                  <Row
                    icon={<Tag size={18} color={theme.colors.primary} />}
                    label="Domaines"
                    value={
                      domains && domains.length > 0
                        ? domains.map((d) => d.domain.nameFr).join(', ')
                        : 'Aucun'
                    }
                  />
                </>
              )}
            </Section>
          </>
        )}

        <Section title="Réglages">
          <Row
            icon={<Bell size={18} color={theme.colors.primary} />}
            label="Notifications"
            value="Gérer les alertes"
            chevron
          />
          <Row
            icon={<Globe size={18} color={theme.colors.primary} />}
            label="Langue"
            value={languageLabel()}
            chevron
          />
          <Row
            icon={<Shield size={18} color={theme.colors.primary} />}
            label="Confidentialité"
            value="Politique & données"
            chevron
          />
          <Row
            icon={<HelpCircle size={18} color={theme.colors.primary} />}
            label="Aide"
            value="Contacter le support"
            chevron
          />
        </Section>

        <TouchableOpacity style={styles.logoutBtn} onPress={onSignOut} activeOpacity={0.85}>
          <LogOut size={18} color={theme.colors.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Worka · v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function languageLabel(): string {
  const stored = getLocale();
  const detected = detectLocale();
  const region = getCountryCode();
  const names: Record<string, string> = { fr: 'Français', en: 'English', ar: 'العربية' };
  const main = names[stored] ?? 'Français';
  const detail =
    region && stored === detected
      ? ` · auto (${region})`
      : stored !== 'fr'
      ? ''
      : detected !== 'fr'
      ? ` · phone : ${names[detected] ?? detected}`
      : '';
  return main + detail;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  chevron,
  cta,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  cta?: string;
}) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value && (
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        )}
      </View>
      {cta ? (
        <Text style={styles.rowCta}>{cta}</Text>
      ) : chevron ? (
        <ChevronRight size={18} color={theme.colors.textMuted} />
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontFamily: theme.fonts.extrabold, fontSize: 22, color: '#111' },

  identity: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 30,
    backgroundColor: theme.colors.bgLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: theme.fonts.extrabold,
    fontSize: 32,
    color: theme.colors.primary,
  },
  name: { fontFamily: theme.fonts.extrabold, fontSize: 20, color: '#111' },
  phone: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  rolePill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.bgLight,
  },
  roleText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.premium,
    borderRadius: 16,
    padding: 16,
  },
  premiumTitle: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 15 },
  premiumSub: { color: 'rgba(255,255,255,0.9)', fontFamily: theme.fonts.medium, fontSize: 12, marginTop: 2 },

  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  upgradeIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FEF4E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeTitle: { fontFamily: theme.fonts.extrabold, fontSize: 14, color: '#111' },
  upgradeSub: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  section: { marginTop: 12 },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingBottom: 6,
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionBody: { backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.bgLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowLabel: { fontFamily: theme.fonts.bold, fontSize: 14, color: '#111' },
  rowValue: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rowCta: { fontFamily: theme.fonts.bold, fontSize: 13, color: theme.colors.primary },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  logoutText: { fontFamily: theme.fonts.extrabold, fontSize: 14, color: theme.colors.danger },

  version: {
    marginTop: 16,
    textAlign: 'center',
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
