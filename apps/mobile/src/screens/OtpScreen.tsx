import React, { useEffect, useRef, useState } from 'react';
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
import { useRoute, type RouteProp } from '@react-navigation/native';
import { authApi, meApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useAuthStore } from '../stores/auth';
import { theme } from '../theme';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Route = RouteProp<AuthStackParamList, 'Otp'>;

const OTP_LENGTH = 6;

export function OtpScreen() {
  const route = useRoute<Route>();
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const refreshOnboardingStatus = useAuthStore((s) => s.refreshOnboardingStatus);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function onChange(idx: number, raw: string) {
    let value = raw;
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[idx] = value;
    setDigits(next);
    if (value && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
    if (idx === OTP_LENGTH - 1 && value && next.every((d) => d)) {
      void submit(next.join(''));
    }
  }

  function onKeyPress(idx: number, key: string) {
    if (key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  async function submit(code: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(route.params.phone, code);
      await setTokens(res.accessToken, res.refreshToken);
      const me = await meApi.get();
      setUser({
        id: me.id,
        phone: me.phone,
        role: me.role,
        status: me.status,
        countryCode: me.countryCode ?? undefined,
      });
      await refreshOnboardingStatus();
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? 'Code invalide ou expiré'
          : e instanceof ApiError && e.status === 429
            ? 'Trop de tentatives, attends'
            : 'Erreur réseau';
      setError(msg);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Code reçu par SMS</Text>
      <Text style={styles.subtitle}>
        Entre les 6 chiffres envoyés au{'\n'}
        <Text style={styles.phone}>{route.params.phone}</Text>
      </Text>

      <View style={styles.digits}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              inputs.current[i] = r;
            }}
            value={d}
            onChangeText={(v) => onChange(i, v)}
            onKeyPress={(e) => onKeyPress(i, e.nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            style={[styles.digit, d && styles.digitFilled]}
            selectionColor={theme.colors.primary}
          />
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />}

      <TouchableOpacity
        style={styles.resend}
        onPress={() => void authApi.sendOtp(route.params.phone).catch(() => null)}
      >
        <Text style={styles.resendText}>Renvoyer le code</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, padding: 24, paddingTop: 80 },
  title: { fontFamily: theme.fonts.extrabold, fontSize: 26, color: '#111', textAlign: 'center' },
  subtitle: {
    marginTop: 8,
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  phone: { color: theme.colors.primary, fontFamily: theme.fonts.bold },
  digits: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 36 },
  digit: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontFamily: theme.fonts.bold,
    fontSize: 22,
    color: '#111',
  },
  digitFilled: { borderColor: theme.colors.primary, backgroundColor: theme.colors.bgLight },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
  resend: { marginTop: 28, alignSelf: 'center' },
  resendText: { color: theme.colors.primary, fontFamily: theme.fonts.bold, fontSize: 13 },
});
