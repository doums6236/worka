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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { theme } from '../theme';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
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
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Bienvenue sur{'\n'}
          <Text style={styles.heroTitleEm}>Worka</Text>
        </Text>
        <Text style={styles.heroSub}>Trouve ton emploi en quelques swipes.</Text>
      </View>
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
            <Text style={styles.btnText}>Recevoir le code</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.footer}>
          Pays supportés : 🇬🇳 GN, 🇸🇳 SN, 🇲🇱 ML, 🇨🇮 CI, 🇧🇫 BF, 🇹🇬 TG, 🇧🇯 BJ, 🇳🇪 NE, 🇲🇷 MR
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  hero: {
    height: 260,
    padding: 28,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.primaryDark,
  },
  heroTitle: { color: '#fff', fontFamily: theme.fonts.extrabold, fontSize: 30, letterSpacing: -1 },
  heroTitleEm: { color: 'rgba(255,255,255,0.85)' },
  heroSub: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: theme.fonts.medium,
    fontSize: 12,
  },
  body: { flex: 1, padding: 24 },
  label: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: '#666',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#111',
  },
  btn: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 16,
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
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
  },
});
