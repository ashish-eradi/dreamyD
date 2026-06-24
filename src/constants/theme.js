// =============================================================================
// DreamDiary — V3 Theme Constants
// =============================================================================
// Warm paper / cream aesthetic design system.
// Import COLORS, MOODS, SYMBOLS and the helper functions from this module.
// =============================================================================

// =============================================================================
// Color palette
// =============================================================================

export const COLORS = {
  // Paper / background — from design's --paper
  bg:    '#f7f3ec',   // warm off-white (design: #f7f3ec)
  bg2:   '#efe9df',   // slightly deeper paper (design: #efe9df)
  card:  '#ffffff',

  // Ink — from design's --ink hierarchy
  ink:   '#1c1733',   // deep night-indigo (design: #1c1733)
  ink2:  '#3a3354',   // (design: #3a3354)
  ink3:  '#6e6788',   // (design: #6e6788)
  ink4:  '#9c97ac',   // (design: #9c97ac)

  // Borders
  line:  'rgba(36,30,60,0.08)',   // (design: --line)
  line2: 'rgba(36,30,60,0.14)',   // (design: --line-2)

  // Accent palette — from design
  peach: '#e9a78a',   // (design: --peach)
  peach2:'#fde8dc',   // peach tint
  moon:  '#f5d896',   // (design: --moon gold)
  gold:  '#f5d896',   // alias for moon
  gold2: '#fbf2d6',   // gold tint bg (design: --joy-bg)
  lilac: '#b9a8e4',   // (design: --lilac)

  // Secondary accents (kept for chip system)
  moss:  '#9ec5b8',   // (design: --calm)
  moss2: '#e2eee9',   // (design: --calm-bg)
  sky:   '#92a8c9',   // (design: --melan)
  sky2:  '#e0e8f1',   // (design: --melan-bg)
  plum:  '#b9a8e4',   // (design: --lilac / fear)
  plum2: '#ece4f5',   // (design: --fear-bg)
};

// =============================================================================
// Mood system
// =============================================================================

export const MOODS = {
  // Colors matched to design's --emotion variables
  joy:    { label: 'Joyful',   color: '#9c7716', bg: '#fbf2d6', emoji: '☀' },
  calm:   { label: 'Peaceful', color: '#3e6e5e', bg: '#e2eee9', emoji: '~' },
  fear:   { label: 'Anxious',  color: '#5d428c', bg: '#ece4f5', emoji: '!' },
  melan:  { label: 'Tender',   color: '#3e5b80', bg: '#e0e8f1', emoji: '♡' },
  wonder: { label: 'Wonder',   color: '#5d428c', bg: '#ece4f5', emoji: '✦' },
  anger:  { label: 'Charged',  color: '#834638', bg: '#f1ddd5', emoji: '◆' },
};

// =============================================================================
// Symbol system
// =============================================================================

export const SYMBOLS = {
  // Colors from design's SYMBOL_LIBRARY hues
  water:   { color: '#3e5b80', bg: '#e0e8f1' },
  ocean:   { color: '#3e5b80', bg: '#e0e8f1' },
  falling: { color: '#5d428c', bg: '#ece4f5' },
  flying:  { color: '#9c7716', bg: '#fbf2d6' },
  chase:   { color: '#834638', bg: '#f1ddd5' },
  people:  { color: '#3e6e5e', bg: '#e2eee9' },
  school:  { color: '#5d428c', bg: '#ece4f5' },
  forest:  { color: '#3e6e5e', bg: '#e2eee9' },
  house:   { color: '#9c7716', bg: '#fbf2d6' },
  light:   { color: '#9c7716', bg: '#fbf2d6' },
  door:    { color: '#5d428c', bg: '#ece4f5' },
  lost:    { color: '#6e6788', bg: '#ece4f5' },
};

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Returns the mood style object for a given mood key.
 * Falls back to a neutral style if the key is not found.
 *
 * @param {string} mood — mood key (e.g. 'joy', 'fear', 'calm')
 * @returns {{ color: string, bg: string, label: string, emoji: string }}
 */
export function getMoodStyle(mood) {
  if (!mood) {
    return { color: COLORS.ink3, bg: COLORS.bg2, label: 'Unknown', emoji: '○' };
  }

  const key = mood.toLowerCase().trim();

  // Direct key lookup
  if (MOODS[key]) return MOODS[key];

  // Fuzzy alias map for common emotion labels from AI analysis
  const aliases = {
    joyful:    'joy',
    happy:     'joy',
    happiness: 'joy',
    joy:       'joy',
    excited:   'joy',
    peaceful:  'calm',
    peace:     'calm',
    serene:    'calm',
    tranquil:  'calm',
    calm:      'calm',
    anxious:   'fear',
    anxiety:   'fear',
    scared:    'fear',
    fear:      'fear',
    nervous:   'fear',
    tender:    'melan',
    sad:       'melan',
    sadness:   'melan',
    melancholy:'melan',
    nostalgic: 'melan',
    wonder:    'wonder',
    awe:       'wonder',
    curious:   'wonder',
    amazed:    'wonder',
    charged:   'anger',
    anger:     'anger',
    angry:     'anger',
    rage:      'anger',
    frustrated:'anger',
  };

  const aliasKey = aliases[key];
  if (aliasKey && MOODS[aliasKey]) return MOODS[aliasKey];

  return { color: COLORS.ink3, bg: COLORS.bg2, label: mood, emoji: '○' };
}

/**
 * Returns the symbol style object for a given symbol name.
 * Falls back to a neutral style if not found.
 *
 * @param {string} name — symbol name (e.g. 'water', 'forest')
 * @returns {{ color: string, bg: string }}
 */
export function getSymbolStyle(name) {
  if (!name) return { color: COLORS.ink3, bg: COLORS.bg2 };

  const key = name.toLowerCase().trim();
  return SYMBOLS[key] ?? { color: COLORS.ink3, bg: COLORS.bg2 };
}

/**
 * Returns the primary color for a given mood key.
 * Compatible with the legacy getEmotionColor API.
 *
 * @param {string} mood — mood key or emotion label
 * @returns {string} — hex color string
 */
export function getEmotionColor(mood) {
  return getMoodStyle(mood).color;
}
