// =============================================================================
// DreamDiary — DreamCard component
// =============================================================================
// Reusable card for displaying a dream entry in lists.
//
// Props:
//   dream     {object}    — dream record from Supabase / store
//   onPress   {function}  — tap handler
//   showDate  {boolean}   — whether to show the date line (default true)
// =============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, getEmotionColor, getTopEmotion, getTopSymbols, truncateText } from '../utils';
import EmotionChip from './EmotionChip';
import SymbolTag from './SymbolTag';

// =============================================================================
// Color constants
// =============================================================================

const COLORS = {
  bg:      '#0D0D1A',
  card:    '#1A1A2E',
  primary: '#7B5EA7',
  accent:  '#C084FC',
  gold:    '#F59E0B',
  text:    '#F1F0FF',
  muted:   '#8B8BAE',
  success: '#10B981',
};

// =============================================================================
// Component
// =============================================================================

export default function DreamCard({ dream, onPress, showDate = true }) {
  if (!dream) return null;

  const tags       = dream.dream_tags ?? [];
  const topEmotion = getTopEmotion(tags);
  const topSymbols = getTopSymbols(tags, 2);
  const summary    = dream.ai_summary ?? dream.transcript ?? '';
  const dateStr    = formatDate(dream.recorded_at ?? dream.created_at);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Dream recorded on ${dateStr}`}
    >
      {/* Purple left accent border via an absolutely positioned strip */}
      <View style={styles.leftBorder} />

      {/* Date */}
      {showDate && (
        <Text style={styles.date}>{dateStr}</Text>
      )}

      {/* Summary — 2-line clamp */}
      <Text style={styles.summary} numberOfLines={2}>
        {truncateText(summary, 140) || 'No summary recorded.'}
      </Text>

      {/* Bottom row: emotion + symbols + chevron */}
      <View style={styles.bottomRow}>
        <View style={styles.tagsRow}>
          {topEmotion && (
            <EmotionChip
              emotion={topEmotion.label}
              confidence={topEmotion.confidence_score}
              size="sm"
            />
          )}

          {topSymbols.map((sym) => (
            <SymbolTag
              key={sym.id ?? sym.label}
              symbol={sym.label}
              confidence={sym.confidence_score}
            />
          ))}
        </View>

        <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    paddingLeft: 20,
    borderWidth: 1,
    borderColor: 'rgba(241, 240, 255, 0.06)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Left accent bar ──────────────────────────────────────────────────────────
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: '#7B5EA7',
  },

  // ── Date ─────────────────────────────────────────────────────────────────────
  date: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  // ── Summary ──────────────────────────────────────────────────────────────────
  summary: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 12,
    letterSpacing: 0.1,
  },

  // ── Bottom row ───────────────────────────────────────────────────────────────
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
});
