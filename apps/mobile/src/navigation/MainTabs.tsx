import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Star, FileText, MessageCircle, User } from 'lucide-react-native';
import { FeedScreen } from '../screens/main/FeedScreen';
import { ApplicationsScreen } from '../screens/main/ApplicationsScreen';
import { MessagesScreen } from '../screens/main/MessagesScreen';
import { SavedJobsScreen } from '../screens/main/SavedJobsScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

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
        name="Sauvegardés"
        component={SavedJobsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Star size={size} color={color} /> }}
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
