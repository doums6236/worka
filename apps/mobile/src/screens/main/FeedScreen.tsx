import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Extrapolation,
} from 'react-native-reanimated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, X, Star, RotateCcw, Info } from 'lucide-react-native';
import { feedApi, swipesApi, applicationsApi } from '../../api/endpoints';
import { JobCard } from '../../components/JobCard';
import { theme } from '../../theme';
import type { FeedItem } from '../../api/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

export function FeedScreen() {
  const queryClient = useQueryClient();
  const { data: feed, isLoading, refetch } = useQuery({
    queryKey: ['feed'],
    queryFn: () => feedApi.get(10),
    staleTime: 60_000,
  });

  const [cards, setCards] = useState<FeedItem[]>([]);

  useEffect(() => {
    if (feed) setCards(feed);
  }, [feed]);

  const top = cards[0];
  const next = cards[1];

  // shared values for the top card
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  function popTop() {
    setCards((prev) => prev.slice(1));
    tx.value = 0;
    ty.value = 0;
    if (cards.length <= 3) {
      // refetch more when low
      void refetch();
    }
  }

  async function commitSwipe(direction: 'left' | 'right' | 'saved') {
    if (!top) return;
    try {
      if (direction === 'right') {
        await applicationsApi.create(top.job.id);
      } else {
        await swipesApi.record(top.job.id, direction, top.matchScore);
      }
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    } catch {
      // optimistic: keep going even if API fails
    }
  }

  function onSwipeLeft() {
    void commitSwipe('left');
    popTop();
  }
  function onSwipeRight() {
    void commitSwipe('right');
    popTop();
  }
  function onSave() {
    void commitSwipe('saved');
    popTop();
  }

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        tx.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 280 }, () => runOnJS(onSwipeLeft)());
      } else if (e.translationX > SWIPE_THRESHOLD) {
        tx.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 280 }, () => runOnJS(onSwipeRight)());
      } else {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
      }
    });

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${(tx.value / SCREEN_WIDTH) * 12}deg` },
    ],
  }));

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const nextStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(Math.abs(tx.value), [0, SCREEN_WIDTH * 0.5], [0.94, 1], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(Math.abs(tx.value), [0, SCREEN_WIDTH * 0.5], [0.6, 1], Extrapolation.CLAMP),
  }));

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (!top) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Plus d'offres pour le moment</Text>
        <Text style={styles.emptySub}>Reviens plus tard, on cherche pour toi 🔍</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => void refetch()}>
          <RotateCcw size={16} color="#fff" />
          <Text style={styles.refreshText}>Actualiser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.cardsArea}>
        {next && (
          <Animated.View style={[styles.cardWrap, styles.cardBehind, nextStyle]}>
            <JobCard item={next} />
          </Animated.View>
        )}

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardWrap, topStyle]}>
            <JobCard item={top} onApply={onSwipeRight} />
            <Animated.View style={[styles.stamp, styles.stampLike, likeOpacity]}>
              <Text style={styles.stampText}>POSTULER</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.stampNope, nopeOpacity]}>
              <Text style={styles.stampText}>PASSER</Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.actions}>
        <ActionBtn icon={<X size={26} color="#FF5050" strokeWidth={3} />} bg="#fff" onPress={onSwipeLeft} />
        <ActionBtn icon={<Star size={22} color="#7B61FF" strokeWidth={2.5} />} bg="#fff" small onPress={onSave} />
        <ActionBtn
          icon={<Heart size={30} color="#fff" strokeWidth={2.5} fill="#fff" />}
          bg={theme.colors.success}
          big
          onPress={onSwipeRight}
        />
        <ActionBtn
          icon={<Info size={22} color={theme.colors.primary} strokeWidth={2.5} />}
          bg="#fff"
          small
          onPress={() => {/* flip handled by card tap */}}
        />
      </View>
    </View>
  );
}

function ActionBtn({
  icon,
  bg,
  onPress,
  big,
  small,
}: {
  icon: React.ReactNode;
  bg: string;
  onPress: () => void;
  big?: boolean;
  small?: boolean;
}) {
  const size = big ? 68 : small ? 50 : 58;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.actionBtn, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.bg },
  cardsArea: { flex: 1, padding: 20, position: 'relative' },
  cardWrap: { flex: 1, position: 'absolute', inset: 20 },
  cardBehind: { transform: [{ scale: 0.94 }], opacity: 0.6 },
  stamp: { position: 'absolute', top: 60, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 3 },
  stampLike: { left: 30, borderColor: theme.colors.success, transform: [{ rotate: '-15deg' }] },
  stampNope: { right: 30, borderColor: theme.colors.danger, transform: [{ rotate: '15deg' }] },
  stampText: { fontFamily: theme.fonts.extrabold, fontSize: 22, letterSpacing: 2, color: '#111' },

  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 14 },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  emptyTitle: { fontFamily: theme.fonts.extrabold, fontSize: 18, color: '#111', textAlign: 'center', marginBottom: 6 },
  emptySub: { fontFamily: theme.fonts.medium, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  refreshText: { color: '#fff', fontFamily: theme.fonts.bold, fontSize: 13 },
});
