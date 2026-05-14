import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../theme';

interface Props {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

function colorForScore(score: number): string {
  if (score >= 85) return theme.colors.success;
  if (score >= 60) return theme.colors.primary;
  return theme.colors.textMuted;
}

export function MatchScoreRing({ score, size = 96, strokeWidth = 6, children }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const color = colorForScore(clamped);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E0E8FF"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.inner}>{children}</View>
      <View style={styles.badge}>
        <Text style={[styles.badgeText, { color }]}>{Math.round(clamped)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  inner: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeText: { fontFamily: theme.fonts.extrabold, fontSize: 10, letterSpacing: 0.3 },
});
