// =============================================================================
// DreamDiary — SymbolTag component
// =============================================================================
// An outlined pill that displays a symbol label with an optional confidence dot.
//
// Props:
//   symbol     {string}        — symbol label (e.g. "ocean", "mirror")
//   confidence {number}        — 0–1 confidence score (optional)
//   onPress    {function}      — tap handler (optional)
// =============================================================================

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

// =============================================================================
// Color constants
// =============================================================================

const ACCENT = '#C084FC';
const TEXT = '#F1F0FF';
const MUTED = '#8B8BAE';

// =============================================================================
// Confidence → dot color helper
// =============================================================================

function confidenceColor(confidence) {
  if (typeof confidence !== 'number') return MUTED;
  if (confidence >= 0.75) return '#10B981'; // high — green
  if (confidence >= 0.45) return '#F59E0B'; // medium — gold
  return '#8B8BAE'; // low — muted
}

// =============================================================================
// Component
// =============================================================================

export default function SymbolTag({ symbol, confidence, onPress }) {
  if (!symbol) return null;

  const label =
    symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase();

  const showDot =
    typeof confidence === 'number' && confidence >= 0 && confidence <= 1;

  const content = (
    <View style={styles.inner}>
      {showDot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: confidenceColor(confidence) },
          ]}
        />
      )}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.chip}
        accessibilityRole="button"
        accessibilityLabel={`Symbol: ${label}`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={styles.chip}
      accessibilityLabel={`Symbol: ${label}`}
    >
      {content}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: `${ACCENT}70`,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  label: {
    fontSize: 12,
    color: TEXT,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
