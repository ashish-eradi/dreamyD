// =============================================================================
// DreamDiary — Utility Functions
// =============================================================================
// Pure helpers used across screens and hooks.
// No React imports — this file is safe to use in any JS context.
// =============================================================================

// =============================================================================
// Date / Time formatting
// =============================================================================

/**
 * Format a date as a long human-readable string.
 *
 * @param {Date | string | number} date
 * @returns {string} e.g. "Thursday, May 22"
 */
export function formatDate(date) {
  const d = toDate(date);
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date as a short string without the weekday.
 *
 * @param {Date | string | number} date
 * @returns {string} e.g. "May 22"
 */
export function formatShortDate(date) {
  const d = toDate(date);
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date as a 12-hour time string with AM/PM.
 *
 * @param {Date | string | number} date
 * @returns {string} e.g. "7:30 AM"
 */
export function formatTime(date) {
  const d = toDate(date);
  if (!d) return '';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// =============================================================================
// Streak calculation
// =============================================================================

/**
 * Calculate the number of consecutive days (ending today or yesterday) on
 * which the user recorded at least one dream.
 *
 * The function works backward from today.  A gap of more than one calendar
 * day breaks the streak.
 *
 * @param {Array<{ recorded_at: string }>} dreams — array of dream objects,
 *   each with a `recorded_at` ISO timestamp.  Order does not matter.
 * @returns {number} — streak length in days (0 if no dreams)
 */
export function getDreamStreak(dreams) {
  if (!Array.isArray(dreams) || dreams.length === 0) return 0;

  // Collect unique calendar dates (YYYY-MM-DD) from the dreams array
  const dateSet = new Set(
    dreams
      .map((d) => {
        const dt = toDate(d?.recorded_at);
        return dt ? toDateKey(dt) : null;
      })
      .filter(Boolean)
  );

  const today = toDateKey(new Date());
  const yesterday = toDateKey(offsetDays(new Date(), -1));

  // The streak must include today or yesterday, otherwise it is broken
  if (!dateSet.has(today) && !dateSet.has(yesterday)) return 0;

  // Walk backward from the most recent active day
  let streak = 0;
  let cursor = dateSet.has(today) ? new Date() : offsetDays(new Date(), -1);

  while (dateSet.has(toDateKey(cursor))) {
    streak += 1;
    cursor = offsetDays(cursor, -1);
  }

  return streak;
}

// =============================================================================
// Emotion / symbol helpers
// =============================================================================

/**
 * Map an emotion label to a representative hex color.
 *
 * Unknown emotions fall back to the neutral muted color #8B8BAE.
 *
 * @param {string} emotion — lowercase emotion label (e.g. "joy", "fear")
 * @returns {string} — hex color string
 */
export function getEmotionColor(emotion) {
  if (!emotion) return '#8B8BAE';

  const map = {
    // Positive
    joy: '#F59E0B',
    happiness: '#F59E0B',
    happy: '#F59E0B',
    excitement: '#FB923C',
    excited: '#FB923C',
    love: '#F472B6',
    wonder: '#A78BFA',
    awe: '#A78BFA',
    hope: '#34D399',
    calm: '#67E8F9',
    peace: '#67E8F9',
    peaceful: '#67E8F9',
    gratitude: '#86EFAC',

    // Negative
    fear: '#6366F1',
    scared: '#6366F1',
    anxiety: '#818CF8',
    anxious: '#818CF8',
    anger: '#EF4444',
    angry: '#EF4444',
    sadness: '#60A5FA',
    sad: '#60A5FA',
    grief: '#3B82F6',
    disgust: '#84CC16',
    surprise: '#FBBF24',
    confused: '#C084FC',
    confusion: '#C084FC',
    guilt: '#9CA3AF',
    shame: '#9CA3AF',
    loneliness: '#93C5FD',
    lonely: '#93C5FD',
    frustration: '#F97316',
    frustrated: '#F97316',
    despair: '#4B5563',
    dread: '#7C3AED',

    // Neutral
    neutral: '#8B8BAE',
    curious: '#C084FC',
    curiosity: '#C084FC',
    nostalgia: '#D8B4FE',
    nostalgic: '#D8B4FE',
  };

  const key = emotion.toLowerCase().trim();
  return map[key] ?? '#8B8BAE';
}

/**
 * Given an array of dream tags, return the emotion tag with the highest
 * confidence score.
 *
 * @param {Array<{ type: string, label: string, confidence_score: number }>} tags
 * @returns {{ type: string, label: string, confidence_score: number } | null}
 */
export function getTopEmotion(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return null;

  const emotionTags = tags.filter(
    (t) => t?.type === 'emotion' && typeof t?.label === 'string'
  );
  if (emotionTags.length === 0) return null;

  return emotionTags.reduce((best, current) =>
    (current?.confidence_score ?? 0) > (best?.confidence_score ?? 0)
      ? current
      : best
  );
}

/**
 * Return the top N symbol tags sorted by confidence score, descending.
 *
 * @param {Array<{ type: string, label: string, confidence_score: number }>} tags
 * @param {number} [limit=2]
 * @returns {Array<{ type: string, label: string, confidence_score: number }>}
 */
export function getTopSymbols(tags, limit = 2) {
  if (!Array.isArray(tags) || tags.length === 0) return [];

  return tags
    .filter((t) => t?.type === 'symbol' && typeof t?.label === 'string')
    .sort((a, b) => (b?.confidence_score ?? 0) - (a?.confidence_score ?? 0))
    .slice(0, limit);
}

// =============================================================================
// Text helpers
// =============================================================================

/**
 * Truncate text to a maximum character length, appending an ellipsis if cut.
 *
 * @param {string} text
 * @param {number} maxLength — characters (not grapheme clusters)
 * @returns {string}
 */
export function truncateText(text, maxLength) {
  if (typeof text !== 'string') return '';
  if (typeof maxLength !== 'number' || maxLength <= 0) return text;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

/**
 * Generate a short dream title from an AI-produced summary by taking the
 * first 5 words and capitalising them.
 *
 * If the summary is empty or undefined, returns "Untitled Dream".
 *
 * @param {string} summary — the full AI summary sentence
 * @returns {string} e.g. "I Was Flying Over Mountains"
 */
export function generateDreamTitle(summary) {
  if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
    return 'Untitled Dream';
  }

  const words = summary.trim().split(/\s+/).slice(0, 5);
  return words
    .map((word) => {
      if (!word) return '';
      // Capitalise first letter; lowercase the rest to avoid ALL-CAPS artifacts
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Coerce a value to a Date object.
 * Accepts Date, ISO string, or Unix timestamp (ms).
 * Returns null if the value cannot be converted or produces an invalid date.
 *
 * @param {Date | string | number | null | undefined} value
 * @returns {Date | null}
 */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Produce a "YYYY-MM-DD" key from a Date, suitable for use in a Set.
 *
 * @param {Date} date
 * @returns {string}
 */
function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Return a new Date that is `days` days offset from `date`.
 * Negative values go backward in time.
 *
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function offsetDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
