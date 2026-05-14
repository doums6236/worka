import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { preferences } from '../lib/preferences';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

export function SplashScreen() {
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    const id = setTimeout(async () => {
      const seen = await preferences.hasSeenWelcome();
      navigation.replace(seen ? 'Login' : 'Welcome');
    }, 1500);
    return () => clearTimeout(id);
  }, [navigation]);

  return (
    <View style={styles.root}>
      <Image
        source={require('../../assets/worka-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.tagline}>Trouve ton emploi en un Swipe</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: { width: 240, height: 80 },
  tagline: {
    marginTop: 14,
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: '#050505',
    textAlign: 'center',
  },
});
