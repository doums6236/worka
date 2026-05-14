import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/auth';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { OnboardingStack } from './OnboardingStack';
import { registerPushTokenAsync } from '../lib/push-notifications';
import { theme } from '../theme';

export function RootNavigator() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (user) {
      void registerPushTokenAsync();
    }
  }, [user]);

  if (!hydrated) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? <AuthStack /> : needsOnboarding ? <OnboardingStack /> : <AppStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
  },
});
