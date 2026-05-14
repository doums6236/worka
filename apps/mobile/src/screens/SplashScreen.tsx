import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>W</Text>
      </View>
      <Text style={styles.wordmark}>
        Work<Text style={{ color: theme.colors.primary }}>a</Text>
      </Text>
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
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconText: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 48 },
  wordmark: { fontFamily: theme.fonts.extrabold, fontSize: 38, color: '#111' },
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
