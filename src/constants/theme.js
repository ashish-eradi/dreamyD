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
  bg:    '#f6f1e8',   // warm cream paper
  bg2:   '#fbf7ee',   // lighter paper
  card:  '#ffffff',   // white cards
  ink:   '#2a2622',   // dark charcoal
  ink2:  '#5a544c',   // medium charcoal
  ink3:  '#8a8278',   // muted brown-grey
  ink4:  '#b8b0a4',   // faint
  line:  '#e8dfd0',   // border color
  line2: '#d8cebb',   // stronger border
  peach: '#f4a585',   // primary accent (warm orange-pink)
  peach2:'#fde8dc',   // peach tint bg
  moss:  '#8aaf94',   // green accent
  moss2: '#e3eee2',   // moss tint bg
  sky:   '#9bb8d4',   // blue accent
  sky2:  '#e4ecf5',   // sky tint bg
  plum:  '#c1a3cc',   // purple accent
  plum2: '#efe4f1',   // plum tint bg
  gold:  '#d4a574',   // warm gold
  gold2: '#f5e8d4',   // gold tint bg
};

// =============================================================================
// Mood system
// =============================================================================

export const MOODS = {
  joy:    { label: 'Joyful',   color: '#e7b75e', bg: '#fbeed5', emoji: '☀' },
  calm:   { label: 'Peaceful', color: '#7ea98a', bg: '#dfecdf', emoji: '~' },
  fear:   { label: 'Anxious',  color: '#b78db8', bg: '#ecdcec', emoji: '!' },
  melan:  { label: 'Tender',   color: '#7fa2c0', bg: '#dde8f1', emoji: '♡' },
  wonder: { label: 'Wonder',   color: '#d4885e', bg: '#f6dccb', emoji: '✦' },
  anger:  { label: 'Charged',  color: '#c97a5a', bg: '#f3d5c8', emoji: '◆' },
};

// =============================================================================
// Symbol system
// =============================================================================

export const SYMBOLS = {
  water:   { color: '#7fa2c0', bg: '#dde8f1' },
  ocean:   { color: '#7fa2c0', bg: '#dde8f1' },
  falling: { color: '#b78db8', bg: '#ecdcec' },
  flying:  { color: '#e7b75e', bg: '#fbeed5' },
  chase:   { color: '#c97a5a', bg: '#f3d5c8' },
  people:  { color: '#7ea98a', bg: '#dfecdf' },
  school:  { color: '#b78db8', bg: '#ecdcec' },
  forest:  { color: '#7ea98a', bg: '#dfecdf' },
  house:   { color: '#d4a574', bg: '#f5e8d4' },
  light:   { color: '#e7b75e', bg: '#fbeed5' },
  door:    { color: '#b78db8', bg: '#ecdcec' },
  lost:    { color: '#8a8278', bg: '#e8e3d8' },
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
