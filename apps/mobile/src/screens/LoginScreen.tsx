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
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ArrowRight, ShieldCheck } from 'lucide-react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { authApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { theme } from '../theme';
import { getCountryCode } from '../lib/i18n';
import { COUNTRIES, countryByCode, type Country } from '../lib/countries';
import { CountryPickerModal } from '../components/CountryPickerModal';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
const { width: SCREEN_W } = Dimensions.get('window');

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [localNumber, setLocalNumber] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const heroOpacity = useSharedValue(0);
  const cardY = useSharedValue(40);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    const detected = getCountryCode();
    if (detected) setCountry(countryByCode(detected));
    heroOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    cardOpacity.value = withDelay(220, withTiming(1, { duration: 520 }));
    cardY.value = withDelay(220, withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [heroOpacity, cardY, cardOpacity]);

  const heroAnim = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));
  const cardAnim = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

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
      {/* Hero — full screen image with strong gradient overlay */}
      <Animated.View style={[styles.heroWrap, heroAnim]}>
        <ImageBackground
          source={require('../../assets/login-hero.png')}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          {/* Brand-tinted base overlay */}
          <View style={styles.heroBrandOverlay} />
          {/* Gradient: light top → strong primary bottom (so card sits on solid blue) */}
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#0856B5" stopOpacity="0.35" />
                <Stop offset="0.45" stopColor="#0F77E0" stopOpacity="0.55" />
                <Stop offset="1" stopColor="#0856B5" stopOpacity="0.95" />
              </SvgLinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#heroGrad)" />
          </Svg>

          <View style={[styles.heroContent, { paddingTop: insets.top + 22 }]}>
            <Image
              source={require('../../assets/worka-logo-white.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />

            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>RECRUTEMENT NOUVELLE GÉNÉRATION</Text>
              <Text style={styles.heroTitle}>
                L'emploi qui te ressemble,
                <Text style={styles.heroTitleAccent}> en un swipe.</Text>
              </Text>
              <View style={styles.heroBadge}>
                <ShieldCheck size={14} color="#fff" />
                <Text style={styles.heroBadgeText}>Guinée · Afrique de l'Ouest</Text>
              </View>
            </View>
          </View>
        </ImageBackground>
      </Animated.View>

      {/* Floating glass card */}
      <Animated.View style={[styles.cardWrap, cardAnim]}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Numéro de téléphone</Text>

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
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={onSubmit}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>Continuer</Text>
                <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.cardHint}>
            On t'envoie un code à 6 chiffres par SMS. Aucun mot de passe à retenir.
          </Text>
        </View>

        <Text style={[styles.terms, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          En continuant, tu acceptes nos{' '}
          <Text style={styles.termsLink}>conditions</Text> et notre{' '}
          <Text style={styles.termsLink}>politique de confidentialité</Text>.
        </Text>
      </Animated.View>

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
  root: { flex: 1, backgroundColor: '#0856B5' },

  heroWrap: { flex: 1 },
  hero: { flex: 1, justifyContent: 'flex-start' },
  heroImage: { resizeMode: 'cover' },
  heroBrandOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 86, 181, 0.35)',
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    flex: 1,
    justifyContent: 'space-between',
  },
  heroLogo: { width: 130, height: 42, marginLeft: -2 },
  heroCopy: { gap: 14 },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    letterSpacing: 2.5,
  },
  heroTitle: {
    color: '#fff',
    fontFamily: theme.fonts.extrabold,
    fontSize: 34,
    letterSpacing: -1,
    lineHeight: 38,
  },
  heroTitleAccent: {
    color: '#7FC4FF',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  heroBadgeText: {
    color: '#fff',
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.3,
  },

  cardWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 22,
    padding: 22,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  cardLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
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
    borderRadius: 14,
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
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
  },
  btn: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  btnText: {
    color: '#fff',
    fontFamily: theme.fonts.extrabold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  cardHint: {
    marginTop: 14,
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  error: {
    marginTop: 10,
    color: theme.colors.danger,
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    textAlign: 'center',
  },

  terms: {
    paddingTop: 14,
    paddingHorizontal: 28,
    textAlign: 'center',
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 16,
  },
  termsLink: {
    color: '#fff',
    fontFamily: theme.fonts.bold,
    textDecorationLine: 'underline',
  },
});
