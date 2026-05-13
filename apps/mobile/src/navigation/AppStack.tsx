import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomePlaceholderScreen } from '../screens/HomePlaceholderScreen';

export type AppStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomePlaceholderScreen} />
    </Stack.Navigator>
  );
}
