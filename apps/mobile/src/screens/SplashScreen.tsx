import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect, RadialGradient, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { preferences } from '../lib/preferences';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function SplashScreen() {
  const navigation = useNavigation<Nav>();

  const logoScale = useSharedValue(0.82);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) });

    const id = setTimeout(async () => {
      const seen = await preferences.hasSeenWelcome();
      navigation.replace(seen ? 'Login' : 'Welcome');
    }, 1800);
    return () => clearTimeout(id);
  }, [navigation, logoOpacity, logoScale]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View style={styles.root}>
      <Svg
        width={SCREEN_W}
        height={SCREEN_H}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A91FF" />
            <Stop offset="0.55" stopColor="#0F77E0" />
            <Stop offset="1" stopColor="#0856B5" />
          </LinearGradient>
          <RadialGradient id="glow" cx="50%" cy="42%" r="55%">
            <Stop offset="0" stopColor="#7FC4FF" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#7FC4FF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="url(#bg)" />
        <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="url(#glow)" />
        {/* Decorative orbs in the corners */}
        <Circle cx={SCREEN_W * 0.15} cy={SCREEN_H * 0.12} r={80} fill="#fff" fillOpacity={0.04} />
        <Circle cx={SCREEN_W * 0.92} cy={SCREEN_H * 0.85} r={120} fill="#fff" fillOpacity={0.05} />
        <Circle cx={SCREEN_W * 0.78} cy={SCREEN_H * 0.22} r={40} fill="#fff" fillOpacity={0.06} />
      </Svg>

      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Image
            source={require('../../assets/worka-logo-white.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0966C7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 280, height: 92 },
});
