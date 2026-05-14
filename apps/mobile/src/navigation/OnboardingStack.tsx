import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DomainSelectionScreen } from '../screens/onboarding/DomainSelectionScreen';
import { CvUploadScreen } from '../screens/onboarding/CvUploadScreen';

export type OnboardingStackParamList = {
  DomainSelection: undefined;
  CvUpload: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: false }}
      initialRouteName="DomainSelection"
    >
      <Stack.Screen name="DomainSelection" component={DomainSelectionScreen} />
      <Stack.Screen name="CvUpload" component={CvUploadScreen} />
    </Stack.Navigator>
  );
}
