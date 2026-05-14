import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { theme } from '../theme';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('+224');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.sendOtp(phone.replace(/\s/g, ''));
      navigation.navigate('Otp', { phone: res.phone });
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setError('Trop de tentatives, attends quelques minutes');
      } else if (e instanceof ApiError && e.status === 400) {
        setError('Numéro invalide ou pays non supporté');
      } else {
        setError(e instanceof Error ? e.message : 'Erreur réseau');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ImageBackground
        source={require('../../assets/login-hero.png')}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Image
            source={require('../../assets/worka-logo-white.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>Trouve l'emploi qui te ressemble</Text>
          <Text style={styles.heroSub}>Swipe les offres en Guinée et sous-région</Text>
        </View>
      </ImageBackground>

      <View style={styles.body}>
        <Text style={styles.label}>Numéro de téléphone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+224 622 12 34 56"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Recevoir le code par SMS</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.footer}>
          Pays supportés : GN · SN · ML · CI · BF · TG · BJ · NE · MR
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  hero: { height: 320, justifyContent: 'flex-end' },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(9, 102, 199, 0.75)',
  },
  heroContent: { padding: 24, paddingBottom: 28 },
  heroLogo: { width: 140, height: 44, marginBottom: 16 },
  heroTitle: {
    color: '#fff',
    fontFamily: theme.fonts.extrabold,
    fontSize: 26,
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  heroSub: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: theme.fonts.medium,
    fontSize: 13,
  },
  body: { flex: 1, padding: 24, backgroundColor: theme.colors.surface },
  label: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text,
  },
  btn: {
    marginTop: 18,
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  btnText: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 15, letterSpacing: 0.3 },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.semibold,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.medium,
  },
});
