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
      <Text style={styles.tagline}>Trouve ton emploi en swipant</Text>
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.dot} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgLight,
  },
  logo: { width: 240, height: 80, marginBottom: 16 },
  tagline: {
    marginTop: 8,
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: 'rgba(0,0,0,0.4)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dots: { flexDirection: 'row', gap: 8, marginTop: 48 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, opacity: 0.4 },
});
