import React, { useEffect, useState } from 'react';
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
import { ChevronDown } from 'lucide-react-native';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { theme } from '../theme';
import { getCountryCode } from '../lib/i18n';
import { COUNTRIES, countryByCode, type Country } from '../lib/countries';
import { CountryPickerModal } from '../components/CountryPickerModal';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [localNumber, setLocalNumber] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const detected = getCountryCode();
    if (detected) {
      setCountry(countryByCode(detected));
    }
  }, []);

  async function onSubmit() {
    setError(null);
    const digits = localNumber.replace(/\D/g, '');
    if (digits.length < 6) {
      setError('Numéro trop court');
      return;
    }
    const phone = `${country.prefix}${digits}`;
    setLoading(true);
    try {
      const res = await authApi.sendOtp(phone);
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
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
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
        </View>
      </ImageBackground>

      <View style={styles.body}>
        <Text style={styles.label}>Numéro de téléphone</Text>
        <View style={styles.phoneRow}>
          <TouchableOpacity
            style={styles.countryBtn}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{country.flag}</Text>
            <Text style={styles.prefix}>{country.prefix}</Text>
            <ChevronDown size={14} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={localNumber}
            onChangeText={setLocalNumber}
            placeholder="622 12 34 56"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={15}
          />
        </View>

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

      </View>

      <CountryPickerModal
        visible={pickerOpen}
        selectedCode={country.code}
        onClose={() => setPickerOpen(false)}
        onSelect={(c) => {
          setCountry(c);
          setPickerOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  hero: { height: 400, justifyContent: 'flex-start' },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(9, 102, 199, 0.75)',
  },
  heroContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 },
  heroLogo: { width: 360, height: 140, marginLeft: -10, marginBottom: 18 },
  heroTitle: {
    color: '#fff',
    fontFamily: theme.fonts.extrabold,
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 34,
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
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
  },
  flag: { fontSize: 18 },
  prefix: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: '#111',
  },
  input: {
    flex: 1,
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
    fontSize: 18,
    letterSpacing: 4,
  },
});
