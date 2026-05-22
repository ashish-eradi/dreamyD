// =============================================================================
// DreamDiary — DreamCard component
// =============================================================================
// Reusable card for displaying a dream entry in lists.
//
// Props:
//   dream        {object}    — dream record from Supabase / store
//   onPress      {function}  — tap handler
//   showDate     {boolean}   — whether to show the date line (default true)
//   relevancePct {number}    — optional 0-100 similarity badge (Search screen)
//   matchText    {string}    — optional highlighted snippet (Search screen)
// =============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatDate,
  getTopEmotion,
  getTopSymbols,
  truncateText,
} from '../utils';
import EmotionChip from './EmotionChip';
import SymbolTag   from './SymbolTag';

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

export default function DreamCard({
  dream,
  onPress,
  showDate    = true,
  relevancePct,
  matchText,
}) {
  if (!dream) return null;

  const tags       = dream.dream_tags ?? [];
  const topEmotion = getTopEmotion(tags);
  const topSymbols = getTopSymbols(tags, 2);
  const summary    = dream.ai_summary ?? dream.transcript ?? '';
  const dateStr    = formatDate(dream.recorded_at ?? dream.created_at);

  const showRelevance =
    typeof relevancePct === 'number' && relevancePct >= 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Dream recorded on ${dateStr}`}
    >
      {/* Purple left accent strip */}
      <View style={styles.leftBorder} />

      {/* Header row: date + optional relevance badge */}
      {(showDate || showRelevance) && (
        <View style={styles.headerRow}>
          {showDate ? (
            <Text style={styles.date}>{dateStr}</Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {showRelevance && (
            <View style={styles.relevanceBadge}>
              <Text style={styles.relevanceText}>
                {Math.round(relevancePct)}% match
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Matched text snippet (highlighted if provided) */}
      {matchText ? (
        <Text style={styles.matchSnippet} numberOfLines={2}>
          {matchText}
        </Text>
      ) : (
        <Text style={styles.summary} numberOfLines={2}>
          {truncateText(summary, 140) || 'No summary recorded.'}
        </Text>
      )}

      {/* Bottom row: emotion chip + symbol tags + chevron */}
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
    borderRadius:    16,
    padding:         16,
    paddingLeft:     20,
    borderWidth:     1,
    borderColor:     'rgba(241, 240, 255, 0.06)',
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.18,
    shadowRadius:    8,
    elevation:       3,
  },

  // ── Left accent bar ──────────────────────────────────────────────────────────
  leftBorder: {
    position:               'absolute',
    left:                   0,
    top:                    0,
    bottom:                 0,
    width:                  3,
    borderTopLeftRadius:    16,
    borderBottomLeftRadius: 16,
    backgroundColor:        '#7B5EA7',
  },

  // ── Header row ───────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   6,
  },

  // ── Date ─────────────────────────────────────────────────────────────────────
  date: {
    flex:          1,
    fontSize:      12,
    color:         COLORS.muted,
    fontWeight:    '500',
    letterSpacing: 0.2,
  },

  // ── Relevance badge ──────────────────────────────────────────────────────────
  relevanceBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius:    10,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderWidth:     1,
    borderColor:     'rgba(16,185,129,0.35)',
  },
  relevanceText: {
    fontSize:   11,
    fontWeight: '700',
    color:      '#10B981',
  },

  // ── Summary ──────────────────────────────────────────────────────────────────
  summary: {
    fontSize:      15,
    color:         COLORS.text,
    fontWeight:    '600',
    lineHeight:    21,
    marginBottom:  12,
    letterSpacing: 0.1,
  },

  // ── Match snippet ─────────────────────────────────────────────────────────────
  matchSnippet: {
    fontSize:      14,
    color:         COLORS.accent,
    fontWeight:    '500',
    lineHeight:    20,
    marginBottom:  12,
    fontStyle:     'italic',
  },

  // ── Bottom row ───────────────────────────────────────────────────────────────
  bottomRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    flex:          1,
    flexWrap:      'wrap',
  },
});
