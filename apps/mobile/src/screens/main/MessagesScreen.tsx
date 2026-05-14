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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../../api/endpoints';
import { NotificationBell } from '../../components/NotificationBell';
import { theme } from '../../theme';
import type { Conversation } from '../../api/types';
import type { AppStackParamList } from '../../navigation/AppStack';

type Nav = NativeStackNavigationProp<AppStackParamList>;

export function MessagesScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.listConversations(),
  });

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.headerTitle}>Messages</Text>
      <NotificationBell />
    </View>
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
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>Pas encore de conversation</Text>
          <Text style={styles.emptySub}>
            Les recruteurs t'écriront ici quand ils s'intéresseront à ton profil
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {header}
      <FlatList
        data={data}
        keyExtractor={(c) => c.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            onPress={() =>
              navigation.navigate('Chat', {
                conversationId: item.id,
                jobTitle: item.job?.title,
                companyName: item.job?.company.name,
              })
            }
          />
        )}
      />
    </View>
  );
}

function ConversationRow({ item, onPress }: { item: Conversation; onPress: () => void }) {
  const lastMessage = item.messages?.[0];
  const company = item.job?.company.name ?? 'Recruteur';
  const initials = company.slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTopLine}>
          <Text style={styles.rowName} numberOfLines={1}>{company}</Text>
          <Text style={styles.rowTime}>
            {item.lastMessageAt
              ? new Date(item.lastMessageAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })
              : ''}
          </Text>
        </View>
        <Text style={styles.rowSub} numberOfLines={1}>
          {item.job?.title ?? ''}
        </Text>
        <Text style={styles.rowPreview} numberOfLines={1}>
          {lastMessage?.content ?? 'Aucun message encore'}
        </Text>
      </View>
    </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontFamily: theme.fonts.extrabold, fontSize: 22, color: '#111' },

  row: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff' },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.bgLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: theme.fonts.extrabold, fontSize: 18, color: theme.colors.primary },
  rowBody: { flex: 1, minWidth: 0, justifyContent: 'center' },
  rowTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowName: { fontFamily: theme.fonts.bold, fontSize: 14, color: '#111', flex: 1, marginRight: 6 },
  rowTime: { fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.textSecondary },
  rowSub: { fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  rowPreview: { fontFamily: theme.fonts.regular, fontSize: 12, color: '#444', marginTop: 4 },
  sep: { height: 1, backgroundColor: theme.colors.border, marginLeft: 76 },

  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontFamily: theme.fonts.extrabold, fontSize: 18, color: '#111', marginBottom: 6 },
  emptySub: { fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 16 },
});
