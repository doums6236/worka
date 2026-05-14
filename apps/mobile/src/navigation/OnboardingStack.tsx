import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { DomainSelectionScreen } from '../screens/onboarding/DomainSelectionScreen';
import { CvUploadScreen } from '../screens/onboarding/CvUploadScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  DomainSelection: undefined;
  CvUpload: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: false }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="DomainSelection" component={DomainSelectionScreen} />
      <Stack.Screen name="CvUpload" component={CvUploadScreen} />
    </Stack.Navigator>
  );
}
