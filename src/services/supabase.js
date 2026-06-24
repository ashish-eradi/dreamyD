// =============================================================================
// DreamDiary — Supabase Client & Data Access Layer
// =============================================================================
// All database interactions go through this module.  Every exported function
// returns a plain value (or throws) so callers don't need to touch the raw
// Supabase response shape.
// =============================================================================

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Client initialisation
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  '';

const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.supabaseAnonKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. ' +
      'Copy .env.example → .env and fill in your project credentials.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persist the session in AsyncStorage so the user stays logged in
    // across app restarts.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// =============================================================================
// Auth helpers
// =============================================================================

/**
 * Sign in with an OAuth provider (Google).
 * On mobile this triggers a browser redirect; handle the callback in your
 * deep-link handler by calling supabase.auth.exchangeCodeForSession(code).
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'dreamdiary://auth/callback',
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sign in with email + password.
 * @param {string} email
 * @param {string} password
 * @returns {import('@supabase/supabase-js').Session}
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.session;
}

/**
 * Create a new account with email + password.
 * @param {string} email
 * @param {string} password
 * @param {string} [name] — optional display name stored in user metadata
 * @returns {import('@supabase/supabase-js').Session | null}
 */
export async function signUpWithEmail(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name ?? '' },
    },
  });
  if (error) throw error;
  // Return both so callers can detect the "email confirmation required" case
  // (session is null but user exists) vs an immediate session.
  return { session: data.session, user: data.user };
}

/**
 * Send a password-reset email via Supabase.
 * @param {string} email
 */
export async function resetPasswordForEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'dreamdiary://auth/reset',
  });
  if (error) throw error;
}

/**
 * Sign the current user out and clear the persisted session.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Return the currently authenticated user, or null.
 * @returns {import('@supabase/supabase-js').User | null}
 */
export async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// =============================================================================
// Dreams
// =============================================================================

/**
 * Fetch all dreams for a user, newest first.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getDreams(userId) {
  const { data, error } = await supabase
    .from('dreams')
    .select(
      `
      id,
      audio_url,
      transcript,
      ai_summary,
      vividness_score,
      title,
      is_favourite,
      recorded_at,
      created_at,
      dream_tags (
        id,
        type,
        label,
        confidence_score
      )
    `
    )
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch a single dream by primary key (including its tags).
 * @param {string} id — UUID
 * @returns {Promise<Object | null>}
 */
export async function getDreamById(id) {
  const { data, error } = await supabase
    .from('dreams')
    .select(
      `
      id,
      user_id,
      audio_url,
      transcript,
      ai_summary,
      vividness_score,
      title,
      is_favourite,
      recorded_at,
      created_at,
      updated_at,
      dream_tags (
        id,
        type,
        label,
        confidence_score
      )
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Insert a new dream record.
 * @param {Object} dreamData
 * @param {string} dreamData.user_id
 * @param {string} [dreamData.audio_url]
 * @param {string} [dreamData.transcript]
 * @param {string} [dreamData.ai_summary]
 * @param {number} [dreamData.vividness_score]
 * @param {string} [dreamData.title]
 * @param {string} [dreamData.recorded_at] — ISO timestamp
 * @returns {Promise<Object>} — the inserted row
 */
export async function saveDream(dreamData) {
  const { data, error } = await supabase
    .from('dreams')
    .insert(dreamData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Partially update a dream.
 * @param {string} id — UUID of the dream
 * @param {Object} updates — fields to update
 * @returns {Promise<Object>} — the updated row
 */
export async function updateDream(id, updates) {
  const { data, error } = await supabase
    .from('dreams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a dream (cascades to dream_tags via FK constraint).
 * @param {string} id — UUID
 */
export async function deleteDream(id) {
  const { error } = await supabase.from('dreams').delete().eq('id', id);
  if (error) throw error;
}

// =============================================================================
// Dream Tags
// =============================================================================

/**
 * Fetch all tags for a specific dream.
 * @param {string} dreamId — UUID
 * @returns {Promise<Array>}
 */
export async function getTagsForDream(dreamId) {
  const { data, error } = await supabase
    .from('dream_tags')
    .select('id, type, label, confidence_score, created_at')
    .eq('dream_id', dreamId)
    .order('confidence_score', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Insert a single tag.
 * @param {Object} tagData
 * @param {string} tagData.dream_id
 * @param {'symbol'|'emotion'} tagData.type
 * @param {string} tagData.label
 * @param {number} [tagData.confidence_score] — 0.00–1.00
 * @returns {Promise<Object>} — the inserted row
 */
export async function saveTag(tagData) {
  const { data, error } = await supabase
    .from('dream_tags')
    .insert(tagData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Bulk-insert multiple tags for a dream in a single round-trip.
 * @param {Array<Object>} tags — each must include dream_id, type, label
 * @returns {Promise<Array>}
 */
export async function saveTags(tags) {
  if (!tags || tags.length === 0) return [];
  const { data, error } = await supabase
    .from('dream_tags')
    .insert(tags)
    .select();

  if (error) throw error;
  return data ?? [];
}

// =============================================================================
// Patterns
// =============================================================================

/**
 * Fetch all patterns for a user, newest first.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getPatterns(userId) {
  const { data, error } = await supabase
    .from('patterns')
    .select('id, pattern_text, symbols_involved, window_start, window_end, generated_at')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Insert a new pattern row.
 * @param {Object} patternData
 * @param {string} patternData.user_id
 * @param {string} patternData.pattern_text
 * @param {string[]} [patternData.symbols_involved]
 * @param {string} [patternData.window_start] — ISO timestamp
 * @param {string} [patternData.window_end]   — ISO timestamp
 * @returns {Promise<Object>} — the inserted row
 */
export async function savePattern(patternData) {
  const { data, error } = await supabase
    .from('patterns')
    .insert(patternData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// User Profile
// =============================================================================

/**
 * Fetch a user's application profile.
 * @param {string} userId
 * @returns {Promise<Object | null>}
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, avatar_url, wake_time, is_premium, language, onboarding_done, created_at')
    .eq('id', userId)
    .single();

  if (error) {
    // PostgREST returns PGRST116 when no rows are found — return null gracefully
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Update a user's profile fields.
 * @param {string} userId
 * @param {Object} updates — partial fields to update
 * @returns {Promise<Object>} — the updated row
 */
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// Storage — Audio uploads
// =============================================================================

const AUDIO_BUCKET = 'dream-audio';

/**
 * Upload an audio recording to Supabase Storage and return its public URL.
 *
 * The file is stored at: dream-audio/<userId>/<dreamId>.m4a
 * The bucket should be private; a signed URL is returned so only the owner
 * can access it (or swap to getPublicUrl if the bucket is public).
 *
 * @param {string} userId  — UUID of the authenticated user
 * @param {string} localUri — file:// URI from expo-av
 * @param {string} [dreamId] — optional; a UUID is generated if omitted
 * @returns {Promise<string>} — signed URL valid for 1 year
 */
export async function uploadAudio(userId, localUri, dreamId) {
  // Generate a stable path for this recording
  const filename = dreamId ?? generateUUID();
  const storagePath = `${userId}/${filename}.m4a`;

  // Read the file as a base64 string
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Decode base64 → Uint8Array for the Supabase JS v2 upload API
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(storagePath, bytes, {
      contentType: 'audio/m4a',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // Create a signed URL valid for 365 days
  const { data: signedData, error: signedError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (signedError) throw signedError;

  return signedData.signedUrl;
}

/**
 * Delete an audio file from Supabase Storage.
 * @param {string} userId
 * @param {string} dreamId
 */
export async function deleteAudio(userId, dreamId) {
  const storagePath = `${userId}/${dreamId}.m4a`;
  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .remove([storagePath]);
  if (error) throw error;
}

// =============================================================================
// Utility
// =============================================================================

/** RFC 4122 v4 UUID — used when no dreamId is provided to uploadAudio. */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 * @param {Function} callback — (event, session) => void
 */
export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}
