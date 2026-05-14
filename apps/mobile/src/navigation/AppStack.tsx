import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { ChatScreen } from '../screens/main/ChatScreen';
import { NotificationCenterScreen } from '../screens/main/NotificationCenterScreen';
import { EditProfileScreen } from '../screens/main/EditProfileScreen';

export type AppStackParamList = {
  Main: undefined;
  Chat: {
    conversationId: string;
    jobTitle?: string;
    companyName?: string;
  };
  Notifications: undefined;
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationCenterScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
