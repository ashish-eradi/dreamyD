// =============================================================================
// DreamDiary V3 — SymbolTag component
// =============================================================================
// A pastel pill displaying a dream symbol label in the V3 warm-paper style.
//
// Props:
//   name     {string}    — symbol key (e.g. 'water', 'forest', 'flying')
//   onPress  {function}  — optional tap handler
// =============================================================================

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { getSymbolStyle } from '../constants/theme';

// =============================================================================
// Component
// =============================================================================

export default function SymbolTag({ name, onPress }) {
  if (!name) return null;

  const style = getSymbolStyle(name);
  const label = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  const inner = (
    <Text style={[styles.label, { color: style.color }]} numberOfLines={1}>
      {label}
    </Text>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.72}
        style={[styles.chip, { backgroundColor: style.bg }]}
        accessibilityRole="button"
        accessibilityLabel={`Symbol: ${label}`}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.chip, { backgroundColor: style.bg }]}
      accessibilityLabel={`Symbol: ${label}`}
    >
      {inner}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  chip: {
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   4,
    alignSelf:         'flex-start',
  },
  label: {
    fontSize:   13,
    fontWeight: '500',
  },
});
