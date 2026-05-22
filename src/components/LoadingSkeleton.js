// =============================================================================
// DreamDiary — LoadingSkeleton component
// =============================================================================
// Animated shimmer placeholder. Supports three preset shapes:
//   'dream-card' — full card layout (date + 2 text lines + chips)
//   'text'       — a single text line block
//   'circle'     — a circular avatar / icon placeholder
//
// Props:
//   type    {'dream-card' | 'text' | 'circle'}  (default 'text')
//   width   {number | string}                   — explicit width override
//   height  {number}                            — explicit height override
// =============================================================================

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

// =============================================================================
// Color constants
// =============================================================================

const CARD_BG    = '#1A1A2E';
const SHIMMER_BASE  = '#1A1A2E';
const SHIMMER_HIGH  = '#2A2A42'; // slightly lighter — creates the shimmer band

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =============================================================================
// ShimmerBlock — a single animated rectangle
// =============================================================================

function ShimmerBlock({ style }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1, // infinite
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // Map 0→1 to a translateX from -SCREEN_WIDTH to +SCREEN_WIDTH
    // so the shimmer band sweeps left → right
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [-SCREEN_WIDTH, SCREEN_WIDTH]
    );

    return { transform: [{ translateX }] };
  });

  return (
    <View
      style={[styles.shimmerHost, style]}
      overflow="hidden"
    >
      {/* Base colour */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: SHIMMER_BASE }]} />

      {/* Moving highlight band */}
      <Animated.View style={[styles.shimmerBand, animatedStyle]} />
    </View>
  );
}

// =============================================================================
// DreamCardSkeleton layout
// =============================================================================

function DreamCardSkeleton() {
  return (
    <View style={styles.card}>
      {/* Left accent bar */}
      <ShimmerBlock style={styles.leftAccent} />

      {/* Date line */}
      <ShimmerBlock style={styles.dateLine} />

      {/* Summary — two lines */}
      <ShimmerBlock style={[styles.textLine, { width: '96%' }]} />
      <ShimmerBlock style={[styles.textLine, { width: '72%', marginTop: 6, marginBottom: 14 }]} />

      {/* Chip row */}
      <View style={styles.chipRow}>
        <ShimmerBlock style={styles.emotionChip} />
        <ShimmerBlock style={styles.symbolChip} />
        <ShimmerBlock style={styles.symbolChip} />
      </View>
    </View>
  );
}

// =============================================================================
// Main component
// =============================================================================

export default function LoadingSkeleton({ type = 'text', width, height }) {
  if (type === 'dream-card') {
    return <DreamCardSkeleton />;
  }

  if (type === 'circle') {
    const size = height ?? width ?? 48;
    return (
      <ShimmerBlock
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    );
  }

  // Default: 'text' — a single rounded bar
  return (
    <ShimmerBlock
      style={{
        width: width ?? '100%',
        height: height ?? 14,
        borderRadius: 7,
      }}
    />
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // ── Shimmer host ─────────────────────────────────────────────────────────────
  shimmerHost: {
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: SHIMMER_BASE,
  },
  shimmerBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.55,
    // Diagonal gradient-like band using skewX
    transform: [{ skewX: '-20deg' }],
    backgroundColor: SHIMMER_HIGH,
    opacity: 0.85,
  },

  // ── Card layout ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    paddingLeft: 20,
    borderWidth: 1,
    borderColor: 'rgba(241, 240, 255, 0.05)',
    overflow: 'hidden',
  },
  leftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 0,
    backgroundColor: SHIMMER_HIGH,
  },
  dateLine: {
    width: 130,
    height: 11,
    borderRadius: 5.5,
    marginBottom: 10,
  },
  textLine: {
    height: 15,
    borderRadius: 7.5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emotionChip: {
    width: 76,
    height: 24,
    borderRadius: 12,
  },
  symbolChip: {
    width: 56,
    height: 24,
    borderRadius: 10,
  },
});
