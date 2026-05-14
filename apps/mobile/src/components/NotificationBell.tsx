import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../api/endpoints';
import { theme } from '../theme';
import type { AppStackParamList } from '../navigation/AppStack';

type Nav = NativeStackNavigationProp<AppStackParamList>;

export function NotificationBell() {
  const navigation = useNavigation<Nav>();
  const { data } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const count = data?.count ?? 0;

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => navigation.navigate('Notifications')}
      hitSlop={8}
      activeOpacity={0.7}
    >
      <Bell size={22} color={theme.colors.text} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontFamily: theme.fonts.extrabold,
    fontSize: 10,
    lineHeight: 12,
  },
});
