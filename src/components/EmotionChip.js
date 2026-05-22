// =============================================================================
// DreamDiary V3 — EmotionChip component
// =============================================================================
// A colored pill badge displaying an emotion label with a colored dot.
//
// Props:
//   mood  {string}        — mood key (e.g. 'joy', 'fear', 'calm') OR label
//   size  {'sm' | 'md'}   — controls padding + font size (default 'sm')
// =============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getMoodStyle } from '../constants/theme';

// =============================================================================
// Component
// =============================================================================

export default function EmotionChip({ mood, size = 'sm' }) {
  if (!mood) return null;

  const style = getMoodStyle(mood);
  const isMd  = size === 'md';

  return (
    <View
      style={[
        styles.chip,
        isMd ? styles.chipMd : styles.chipSm,
        { backgroundColor: style.bg },
      ]}
      accessibilityLabel={`Mood: ${style.label}`}
    >
      {/* Colored dot */}
      <View
        style={[
          styles.dot,
          isMd ? styles.dotMd : styles.dotSm,
          { backgroundColor: style.color },
        ]}
      />

      {/* Label */}
      <Text
        style={[
          styles.label,
          isMd ? styles.labelMd : styles.labelSm,
          { color: style.color },
        ]}
        numberOfLines={1}
      >
        {style.label}
      </Text>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems:    'center',
    borderRadius:  20,
    alignSelf:     'flex-start',
  },

  // ── Size variants ─────────────────────────────────────────────────────────
  chipSm: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    gap:               6,
  },
  chipMd: {
    paddingHorizontal: 13,
    paddingVertical:   6,
    gap:               7,
  },

  // ── Dot ───────────────────────────────────────────────────────────────────
  dot: {
    borderRadius: 50,
  },
  dotSm: {
    width:  6,
    height: 6,
  },
  dotMd: {
    width:  8,
    height: 8,
  },

  // ── Label ─────────────────────────────────────────────────────────────────
  label: {
    fontWeight:    '500',
    letterSpacing: 0.1,
  },
  labelSm: {
    fontSize: 13,
  },
  labelMd: {
    fontSize: 15,
  },
});
