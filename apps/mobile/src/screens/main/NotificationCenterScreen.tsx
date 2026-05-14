import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  ChevronLeft,
  MessageCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  Briefcase,
  Eye,
  Star,
  Bell,
  Lock,
  Unlock,
  Award,
} from 'lucide-react-native';
import { notificationsApi } from '../../api/endpoints';
import { theme } from '../../theme';
import type { AppNotification, NotificationType } from '../../api/types';
import type { AppStackParamList } from '../../navigation/AppStack';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const ICONS: Record<NotificationType, { Icon: any; color: string; bg: string }> = {
  new_message: { Icon: MessageCircle, color: theme.colors.primary, bg: theme.colors.bgLight },
  appointment_proposed: { Icon: Calendar, color: theme.colors.primary, bg: theme.colors.bgLight },
  appointment_confirmed: { Icon: CheckCircle2, color: theme.colors.success, bg: '#E6F9F1' },
  appointment_declined: { Icon: XCircle, color: theme.colors.danger, bg: '#FEEBEF' },
  appointment_reminder: { Icon: Calendar, color: theme.colors.premium, bg: '#FEF4E1' },
  conversation_closed: { Icon: Lock, color: theme.colors.textSecondary, bg: theme.colors.surfaceMuted },
  conversation_reopened: { Icon: Unlock, color: theme.colors.success, bg: '#E6F9F1' },
  new_job_match: { Icon: Briefcase, color: theme.colors.primary, bg: theme.colors.bgLight },
  application_viewed: { Icon: Eye, color: theme.colors.textSecondary, bg: theme.colors.surfaceMuted },
  application_shortlisted: { Icon: Star, color: theme.colors.premium, bg: '#FEF4E1' },
  application_rejected: { Icon: XCircle, color: theme.colors.danger, bg: '#FEEBEF' },
  application_hired: { Icon: Award, color: theme.colors.success, bg: '#E6F9F1' },
};

export function NotificationCenterScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const handlePress = useCallback(
    (n: AppNotification) => {
      if (!n.readAt) markRead.mutate(n.id);
      const data = n.data as { conversationId?: string; jobTitle?: string; companyName?: string } | null;
      if (data?.conversationId) {
        navigation.navigate('Chat', {
          conversationId: data.conversationId,
          jobTitle: data.jobTitle,
          companyName: data.companyName,
        });
      }
    },
    [markRead, navigation],
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const unreadCount = data?.filter((n) => !n.readAt).length ?? 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={26} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAll.mutate()} hitSlop={8}>
            <Text style={styles.markAll}>Tout lire</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {!data || data.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Bell size={32} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Pas de notifications</Text>
          <Text style={styles.emptySub}>Tu seras notifié des nouvelles offres, messages et rendez-vous</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => <NotificationRow item={item} onPress={() => handlePress(item)} />}
        />
      )}
    </View>
  );
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const meta = ICONS[item.type] ?? { Icon: Bell, color: theme.colors.primary, bg: theme.colors.bgLight };
  const Icon = meta.Icon;
  const unread = !item.readAt;

  return (
    <TouchableOpacity
      style={[styles.row, unread && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.icon, { backgroundColor: meta.bg }]}>
        <Icon size={20} color={meta.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
        </View>
        <Text style={styles.bodyText} numberOfLines={2}>{item.body}</Text>
      </View>
      {unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  headerTitle: { flex: 1, fontFamily: theme.fonts.extrabold, fontSize: 20, color: '#111' },
  markAll: { fontFamily: theme.fonts.bold, fontSize: 13, color: theme.colors.primary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    backgroundColor: '#fff',
  },
  rowUnread: { backgroundColor: theme.colors.bgLight },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  title: { fontFamily: theme.fonts.bold, fontSize: 14, color: '#111', flex: 1 },
  time: { fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.textSecondary },
  bodyText: { fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary, marginTop: 3, lineHeight: 17 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginLeft: 4 },
  sep: { height: 1, backgroundColor: theme.colors.border, marginLeft: 68 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 28, backgroundColor: theme.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: theme.fonts.extrabold, fontSize: 17, color: '#111', marginBottom: 6 },
  emptySub: { fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
});
