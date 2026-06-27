import { supabase } from './supabase';

// Pricing constants (keep in sync with admin/lib/costs.js)
const RATES = {
  whisper:          0.006,   // per minute
  'gpt-4o':         0.005,   // per 1k tokens (blended)
  'gemini-flash':   0.00015, // per 1k tokens
  'claude-sonnet':  0.003,   // per 1k tokens (blended)
};

/**
 * Log an API usage event to Supabase for cost tracking.
 * Fire-and-forget — never throws to avoid disrupting the calling flow.
 */
export async function logApiUsage({
  service,           // 'whisper' | 'gpt-4o' | 'gemini-flash' | 'claude-sonnet'
  userId,            // uuid from auth, or null for unauthenticated
  dreamId,           // uuid of the dream being processed, or null
  tokensIn,          // integer input tokens, or null
  tokensOut,         // integer output tokens, or null
  audioDurationSecs, // number of seconds of audio (Whisper only), or null
  costUsd,           // override — if provided, skips auto calculation
  metadata,          // optional extra JSON
}) {
  try {
    let calculatedCost = costUsd;

    if (calculatedCost == null) {
      const rate = RATES[service] ?? 0;
      if (service === 'whisper' && audioDurationSecs) {
        calculatedCost = (audioDurationSecs / 60) * rate;
      } else if (tokensIn != null || tokensOut != null) {
        const totalTokens = (tokensIn ?? 0) + (tokensOut ?? 0);
        calculatedCost = (totalTokens / 1000) * rate;
      } else {
        calculatedCost = 0;
      }
    }

    await supabase.from('api_usage_logs').insert({
      service,
      user_id:              userId   ?? null,
      dream_id:             dreamId  ?? null,
      tokens_in:            tokensIn ?? null,
      tokens_out:           tokensOut ?? null,
      audio_duration_secs:  audioDurationSecs ?? null,
      cost_usd:             calculatedCost,
      metadata:             metadata ?? null,
    });
  } catch (err) {
    console.warn('[CostTracking] Failed to log API usage:', err);
  }
}
