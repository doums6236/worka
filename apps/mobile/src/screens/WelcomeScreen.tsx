import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { preferences } from '../lib/preferences';
import type { AuthStackParamList } from '../navigation/AuthStack';

const { width } = Dimensions.get('window');

interface Slide {
  emoji: string;
  title: string;
  description: string;
  bg: string;
}

const SLIDES: Slide[] = [
  {
    emoji: '👆',
    title: 'Swipe pour postuler',
    description: 'Découvre des offres adaptées à toi et postule en un swipe — comme sur Tinder.',
    bg: theme.colors.bgLight,
  },
  {
    emoji: '🤖',
    title: "L'IA t'aide à postuler",
    description:
      'Avec Worka Premium, notre IA rédige tes lettres de motivation et postule à ta place quand un poste correspond.',
    bg: '#EAF1FF',
  },
  {
    emoji: '💬',
    title: 'Discute avec les recruteurs',
    description:
      'Quand un recruteur s\'intéresse à ton profil, échange directement avec lui dans l\'app.',
    bg: '#F0F7FF',
  },
];

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  async function goToLogin() {
    await preferences.markWelcomeSeen();
    navigation.replace('Login');
  }

  function onNext() {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      void goToLogin();
    }
  }

  function onSkip() {
    void goToLogin();
  }

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width, paddingTop: insets.top + 40 }]}>
            <View style={[styles.illustration, { backgroundColor: item.bg }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onNext} style={styles.nextBtn} activeOpacity={0.85}>
          <Text style={styles.nextText}>{index === SLIDES.length - 1 ? 'Commencer →' : 'Suivant'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  slide: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  illustration: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  emoji: { fontSize: 100 },
  title: {
    fontFamily: theme.fonts.extrabold,
    fontSize: 26,
    color: '#111',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  description: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  skipText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  nextBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  nextText: {
    color: '#fff',
    fontFamily: theme.fonts.extrabold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
