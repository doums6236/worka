import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Search, FileText, MessageCircle, User } from 'lucide-react-native';
import { FeedScreen } from '../screens/main/FeedScreen';
import { PlaceholderScreen } from '../screens/main/PlaceholderScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

const ExploreScreen = () => (
  <PlaceholderScreen emoji="🔎" title="Explorer" subtitle="Recherche avancée à venir (Plan 4D)" />
);
const ApplicationsScreen = () => (
  <PlaceholderScreen emoji="📨" title="Candidatures" subtitle="Tes candidatures (Plan 4D)" />
);
const MessagesScreen = () => (
  <PlaceholderScreen emoji="💬" title="Messages" subtitle="Chat temps réel (Plan 4D)" />
);
const ProfileScreen = () => (
  <PlaceholderScreen emoji="👤" title="Profil" subtitle="Édition + Premium (Plan 4E)" />
);

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: theme.colors.border,
          paddingTop: 4,
          height: 64,
        },
        tabBarLabelStyle: { fontFamily: theme.fonts.semibold, fontSize: 10 },
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
