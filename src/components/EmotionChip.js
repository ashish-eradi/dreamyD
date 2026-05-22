// =============================================================================
// DreamDiary — EmotionChip component
// =============================================================================
// A colored pill badge that displays an emotion label and optional confidence.
//
// Props:
//   emotion    {string}            — emotion label (e.g. "joy", "fear")
//   confidence {number}            — 0–1 confidence score (optional)
//   size       {'sm' | 'md'}       — controls padding + font size (default 'sm')
// =============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getEmotionColor } from '../utils';

// =============================================================================
// Component
// =============================================================================

export default function EmotionChip({ emotion, confidence, size = 'sm' }) {
  if (!emotion) return null;

  const color = getEmotionColor(emotion);
  const isMd = size === 'md';

  const label =
    emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase();

  const showConfidence =
    typeof confidence === 'number' && confidence > 0 && confidence <= 1;

  return (
    <View
      style={[
        styles.chip,
        isMd ? styles.chipMd : styles.chipSm,
        {
          backgroundColor: `${color}22`,
          borderColor: `${color}55`,
        },
      ]}
      accessibilityLabel={`Emotion: ${label}${showConfidence ? `, ${Math.round(confidence * 100)}% confidence` : ''}`}
    >
      {/* Color dot */}
      <View
        style={[
          styles.dot,
          isMd ? styles.dotMd : styles.dotSm,
          { backgroundColor: color },
        ]}
      />

      {/* Label */}
      <Text
        style={[
          styles.label,
          isMd ? styles.labelMd : styles.labelSm,
          { color },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {/* Confidence percentage */}
      {showConfidence && (
        <Text
          style={[
            styles.confidence,
            isMd ? styles.confidenceMd : styles.confidenceSm,
            { color: `${color}BB` },
          ]}
        >
          {Math.round(confidence * 100)}%
        </Text>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },

  // ── Size variants ────────────────────────────────────────────────────────────
  chipSm: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 5,
  },
  chipMd: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },

  // ── Dot ─────────────────────────────────────────────────────────────────────
  dot: {
    borderRadius: 50,
  },
  dotSm: {
    width: 6,
    height: 6,
  },
  dotMd: {
    width: 8,
    height: 8,
  },

  // ── Label ───────────────────────────────────────────────────────────────────
  label: {
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  labelSm: {
    fontSize: 12,
  },
  labelMd: {
    fontSize: 14,
  },

  // ── Confidence ──────────────────────────────────────────────────────────────
  confidence: {
    fontWeight: '500',
  },
  confidenceSm: {
    fontSize: 11,
  },
  confidenceMd: {
    fontSize: 12,
  },
});
