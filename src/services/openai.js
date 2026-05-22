// =============================================================================
// DreamDiary — OpenAI Service
// =============================================================================
// Handles all OpenAI API calls:
//   1. transcribeAudio  — Whisper API (whisper-1) for speech-to-text
//   2. analyzeDream     — GPT-4o for structured dream analysis
//
// SECURITY NOTE:
//   In production, route these calls through a Supabase Edge Function so your
//   OPENAI_API_KEY never ships inside the app bundle.  During development you
//   can set OPENAI_API_KEY in .env and it will be read here directly.
// =============================================================================

import OpenAI from 'openai';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const OPENAI_API_KEY =
  Constants.expoConfig?.extra?.openaiApiKey ??
  process.env.OPENAI_API_KEY ??
  '';

if (!OPENAI_API_KEY) {
  console.warn(
    '[OpenAI] OPENAI_API_KEY is not set. ' +
      'Add it to your .env file (never prefix with EXPO_PUBLIC_ — it is a secret).'
  );
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  // dangerouslyAllowBrowser is required by the openai package when running in
  // a browser-like environment (React Native's Hermes JS engine triggers this).
  dangerouslyAllowBrowser: true,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WHISPER_MODEL = 'whisper-1';
const GPT_MODEL = 'gpt-4o';

const DREAM_ANALYST_SYSTEM_PROMPT = `You are a dream analyst. Given a dream transcript, return a JSON object with:
- summary: a single sentence that captures the core narrative of the dream
- vividness: an integer from 1 to 10 representing how vivid and detailed the dream appears
- symbols: an array of up to 5 objects, each with "label" (string, the symbol name) and "confidence" (number between 0 and 1)
- emotions: an array of up to 3 objects, each with "label" (string, the emotion name) and "confidence" (number between 0 and 1)

Return only valid JSON, no extra text, no markdown code fences.`;

// ---------------------------------------------------------------------------
// Whisper transcription
// ---------------------------------------------------------------------------

/**
 * Transcribe an audio recording using OpenAI Whisper.
 *
 * The audio file at `audioUri` (a file:// URI produced by expo-av) is read
 * into memory as base64, converted to a Blob, then sent to the Whisper API.
 *
 * @param {string} audioUri — file:// URI of the recorded audio (e.g. .m4a)
 * @param {string} [language] — optional BCP-47 language code hint (e.g. 'en')
 * @returns {Promise<string>} — the raw transcript text
 * @throws {Error} if the upload or API call fails
 */
export async function transcribeAudio(audioUri, language) {
  if (!audioUri) {
    throw new Error('[OpenAI.transcribeAudio] audioUri is required.');
  }

  // Read the file as a Base64 string
  const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert Base64 → Uint8Array → Blob
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Determine MIME type from URI extension
  const extension = audioUri.split('.').pop()?.toLowerCase() ?? 'm4a';
  const mimeType = getMimeType(extension);

  const audioBlob = new Blob([bytes], { type: mimeType });

  // The openai SDK accepts a File-like object; wrap the Blob with a filename
  // so Whisper can infer the codec.
  const audioFile = new File([audioBlob], `recording.${extension}`, {
    type: mimeType,
  });

  const params = {
    file: audioFile,
    model: WHISPER_MODEL,
    response_format: 'text',
  };

  if (language) {
    params.language = language;
  }

  const transcription = await openai.audio.transcriptions.create(params);

  // When response_format is 'text', the SDK returns the transcript as a plain
  // string rather than an object.
  return typeof transcription === 'string'
    ? transcription.trim()
    : (transcription.text ?? '').trim();
}

// ---------------------------------------------------------------------------
// GPT-4o dream analysis
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DreamAnalysis
 * @property {string}   summary    — one-sentence narrative summary
 * @property {number}   vividness  — integer 1–10
 * @property {Array<{label: string, confidence: number}>} symbols   — up to 5
 * @property {Array<{label: string, confidence: number}>} emotions  — up to 3
 */

/**
 * Analyse a dream transcript with GPT-4o and return a structured object.
 *
 * @param {string} transcript — the raw dream narration
 * @returns {Promise<DreamAnalysis>}
 * @throws {Error} if the API call fails or the response is not valid JSON
 */
export async function analyzeDream(transcript) {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('[OpenAI.analyzeDream] transcript cannot be empty.');
  }

  const response = await openai.chat.completions.create({
    model: GPT_MODEL,
    temperature: 0.4, // Lower temperature → more deterministic JSON
    max_tokens: 512,
    messages: [
      {
        role: 'system',
        content: DREAM_ANALYST_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: transcript.trim(),
      },
    ],
    response_format: { type: 'json_object' },
  });

  const rawContent = response.choices?.[0]?.message?.content ?? '';

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (parseError) {
    console.error('[OpenAI.analyzeDream] Failed to parse GPT response:', rawContent);
    throw new Error(
      `Dream analysis returned invalid JSON: ${parseError.message}`
    );
  }

  return normalizeDreamAnalysis(parsed);
}

// ---------------------------------------------------------------------------
// Pattern detection (premium feature)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DreamPattern
 * @property {string}   pattern_text     — narrative description of the pattern
 * @property {string[]} symbols_involved — array of symbol labels
 */

/**
 * Detect recurring patterns across multiple dream summaries.
 *
 * @param {string[]} summaries — array of dream summary strings (pass the most
 *                               recent 20–30 for best results)
 * @returns {Promise<DreamPattern[]>} — up to 3 detected patterns
 */
export async function detectPatterns(summaries) {
  if (!summaries || summaries.length === 0) {
    return [];
  }

  const summaryList = summaries
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');

  const systemPrompt = `You are a Jungian dream analyst. Given a numbered list of dream summaries, identify up to 3 recurring patterns or themes across the dreams.
Return a JSON array where each element has:
- "pattern_text": a 1-2 sentence description of the recurring pattern
- "symbols_involved": an array of symbol/emotion labels that appear repeatedly

Return only valid JSON (an array), no extra text.`;

  const response = await openai.chat.completions.create({
    model: GPT_MODEL,
    temperature: 0.5,
    max_tokens: 600,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: summaryList },
    ],
    response_format: { type: 'json_object' },
  });

  const rawContent = response.choices?.[0]?.message?.content ?? '[]';

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return [];
  }

  // The model may wrap in { patterns: [...] } — normalise to array
  const patternsArray = Array.isArray(parsed)
    ? parsed
    : parsed.patterns ?? parsed.results ?? [];

  return patternsArray.map((p) => ({
    pattern_text: String(p.pattern_text ?? ''),
    symbols_involved: Array.isArray(p.symbols_involved)
      ? p.symbols_involved.map(String)
      : [],
  }));
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Map a file extension to an appropriate MIME type for the Whisper API.
 * @param {string} ext — lowercase extension without dot
 * @returns {string}
 */
function getMimeType(ext) {
  const map = {
    m4a: 'audio/m4a',
    mp4: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    caf: 'audio/x-caf',
  };
  return map[ext] ?? 'audio/m4a';
}

/**
 * Ensure the raw parsed object from GPT conforms to the DreamAnalysis shape.
 * Coerces types and fills in sensible defaults so downstream code can trust
 * the structure.
 *
 * @param {Object} raw
 * @returns {DreamAnalysis}
 */
function normalizeDreamAnalysis(raw) {
  const vividness = Math.min(10, Math.max(1, Math.round(Number(raw.vividness ?? 5))));

  const normalizeTagArray = (arr, maxItems) =>
    (Array.isArray(arr) ? arr : [])
      .slice(0, maxItems)
      .map((item) => ({
        label: String(item.label ?? item.name ?? '').toLowerCase().trim(),
        confidence: Math.min(1, Math.max(0, Number(item.confidence ?? item.score ?? 0.5))),
      }))
      .filter((item) => item.label.length > 0);

  return {
    summary: String(raw.summary ?? 'A dream was recorded.').trim(),
    vividness,
    symbols: normalizeTagArray(raw.symbols, 5),
    emotions: normalizeTagArray(raw.emotions, 3),
  };
}
