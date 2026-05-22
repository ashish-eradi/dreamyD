// =============================================================================
// DreamDiary V3 — DreamCard component
// =============================================================================
// Reusable card for displaying a dream entry in lists.
// Warm-paper aesthetic: white card, charcoal text, pastel mood/symbol pills.
//
// Props:
//   dream     {object}    — dream record from Supabase / store
//   tags      {array}     — dream_tags array (falls back to dream.dream_tags)
//   onPress   {function}  — tap handler
//   showDate  {boolean}   — whether to show the date line (default true)
// =============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, getMoodStyle, getSymbolStyle } from '../constants/theme';
import { formatDate, getTopEmotion, getTopSymbols } from '../utils';

// =============================================================================
// Internal mini-components
// =============================================================================

function MoodTile({ moodKey, size = 44 }) {
  const style = getMoodStyle(moodKey);
  return (
    <View
      style={[
        styles.moodTile,
        {
          width:           size,
          height:          size,
          backgroundColor: style.bg,
        },
      ]}
    >
      <Text style={[styles.moodEmoji, { color: style.color }]}>
        {style.emoji}
      </Text>
    </View>
  );
}

// =============================================================================
// Component
// =============================================================================

export default function DreamCard({
  dream,
  tags,
  onPress,
  showDate = true,
}) {
  if (!dream) return null;

  const dreamTags  = tags ?? dream.dream_tags ?? [];
  const topEmotion = getTopEmotion(dreamTags);
  const topSymbols = getTopSymbols(dreamTags, 3);

  const title   = dream.title ?? 'Untitled Dream';
  const snippet = dream.ai_summary ?? dream.transcript ?? '';
  const dateStr = formatDate(dream.recorded_at ?? dream.created_at);

  const moodKey = topEmotion?.label ?? null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Dream: ${title}, recorded on ${dateStr}`}
    >
      <View style={styles.inner}>
        {/* Left: mood tile */}
        <MoodTile moodKey={moodKey} size={44} />

        {/* Right: text content */}
        <View style={styles.content}>
          {/* Top row: title + date */}
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {showDate && (
              <Text style={styles.date} numberOfLines={1}>
                {dateStr}
              </Text>
            )}
          </View>

          {/* Snippet */}
          {snippet.length > 0 && (
            <Text style={styles.snippet} numberOfLines={2}>
              {snippet}
            </Text>
          )}

          {/* Symbols row */}
          {topSymbols.length > 0 && (
            <View style={styles.symbolsRow}>
              {topSymbols.map((sym) => {
                const symStyle = getSymbolStyle(sym.label);
                return (
                  <View
                    key={sym.id ?? sym.label}
                    style={[styles.symbolPill, { backgroundColor: symStyle.bg }]}
                  >
                    <Text style={[styles.symbolPillText, { color: symStyle.color }]}>
                      {sym.label.charAt(0).toUpperCase() + sym.label.slice(1)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
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
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     COLORS.line,
    padding:         18,
  },

  inner: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           14,
  },

  // ── Mood tile ────────────────────────────────────────────────────────────
  moodTile: {
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  moodEmoji: {
    fontSize: 18,
    fontFamily: 'serif',
  },

  // ── Text content ─────────────────────────────────────────────────────────
  content: {
    flex: 1,
    gap:  4,
  },
  topRow: {
    flexDirection:  'row',
    alignItems:     'baseline',
    justifyContent: 'space-between',
    gap:            8,
  },
  title: {
    flex:       1,
    fontSize:   18,
    fontWeight: '500',
    color:      COLORS.ink,
    fontFamily: 'serif',
  },
  date: {
    fontSize:  12,
    color:     COLORS.ink3,
    flexShrink: 0,
  },
  snippet: {
    fontSize:   14,
    color:      COLORS.ink2,
    fontFamily: 'serif',
    lineHeight: 21,
  },

  // ── Symbol pills ─────────────────────────────────────────────────────────
  symbolsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    marginTop:     4,
  },
  symbolPill: {
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  symbolPillText: {
    fontSize:   13,
    fontWeight: '500',
  },
});
