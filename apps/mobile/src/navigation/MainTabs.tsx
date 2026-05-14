import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, FileText, MessageCircle, User } from 'lucide-react-native';
import { FeedScreen } from '../screens/main/FeedScreen';
import { ApplicationsScreen } from '../screens/main/ApplicationsScreen';
import { MessagesScreen } from '../screens/main/MessagesScreen';
import { PlaceholderScreen } from '../screens/main/PlaceholderScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

const ExploreScreen = () => (
  <PlaceholderScreen emoji="🔎" title="Explorer" subtitle="Recherche avancée à venir" />
);
const ProfileScreen = () => (
  <PlaceholderScreen emoji="👤" title="Profil" subtitle="Édition + Premium (Plan 4E)" />
);

export function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: theme.colors.border,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 56 + Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontFamily: theme.fonts.semibold, fontSize: 10, marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Emplois"
        component={FeedScreen}
        options={{ tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Explorer"
        component={ExploreScreen}
        options={{ tabBarIcon: ({ color, size }) => <Search size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Candidatures"
        component={ApplicationsScreen}
        options={{ tabBarIcon: ({ color, size }) => <FileText size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}
