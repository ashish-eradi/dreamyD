// =============================================================================
// DreamDiary — Zustand Global Store
// =============================================================================
// The store is split into three logical slices that are composed into a single
// useDreamStore hook.  All slices are defined inside `create()` so they share
// the same `set` / `get` reference.
//
// Usage:
//   import { useDreamStore } from '../store';
//   const user = useDreamStore((state) => state.user);
// =============================================================================

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// =============================================================================
// Slice factories
// =============================================================================

// ---------------------------------------------------------------------------
// Auth slice
// ---------------------------------------------------------------------------
// Tracks the authenticated user, Supabase session, premium status, and the
// loading state while the session is being restored on app launch.

/**
 * @typedef {Object} AuthSlice
 * @property {import('@supabase/supabase-js').User | null} user
 * @property {import('@supabase/supabase-js').Session | null} session
 * @property {boolean} isLoading   — true while the initial session check runs
 * @property {boolean} isPremium   — mirrors public.users.is_premium
 * @property {function(import('@supabase/supabase-js').User | null): void} setUser
 * @property {function(import('@supabase/supabase-js').Session | null): void} setSession
 * @property {function(boolean): void} setIsLoading
 * @property {function(boolean): void} setIsPremium
 * @property {function(): void} signOut  — clears auth state locally (call
 *   supabase.auth.signOut() separately to invalidate the server session)
 */

const createAuthSlice = (set) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  user: null,
  session: null,
  isLoading: true,   // starts true — App.js flips to false after session check
  isPremium: false,

  // ── Actions ───────────────────────────────────────────────────────────────
  setUser: (user) => set({ user }),

  setSession: (session) =>
    set({
      session,
      // Keep user in sync with the session so callers don't need to call both
      user: session?.user ?? null,
    }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setIsPremium: (isPremium) => set({ isPremium }),
  setPremium: (isPremium) => set({ isPremium }),

  signOut: () =>
    set({
      user: null,
      session: null,
      isPremium: false,
    }),
});

// ---------------------------------------------------------------------------
// Dreams slice
// ---------------------------------------------------------------------------
// Holds the in-memory list of dreams and a pointer to the "active" dream
// being viewed or edited.

/**
 * @typedef {Object} Dream
 * @property {string}   id
 * @property {string}   user_id
 * @property {string}   [audio_url]
 * @property {string}   [transcript]
 * @property {string}   [ai_summary]
 * @property {number}   [vividness_score]
 * @property {string}   [title]
 * @property {boolean}  is_favourite
 * @property {string}   recorded_at   — ISO timestamp
 * @property {string}   created_at    — ISO timestamp
 * @property {Array}    [dream_tags]
 */

/**
 * @typedef {Object} DreamsSlice
 * @property {Dream[]}       dreams
 * @property {Dream | null}  currentDream
 * @property {function(Dream[]): void}                    setDreams
 * @property {function(Dream): void}                      addDream
 * @property {function(string, Partial<Dream>): void}     updateDream
 * @property {function(string): void}                     removeDream
 * @property {function(Dream | null): void}               setCurrentDream
 */

const createDreamsSlice = (set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  dreams: [],
  currentDream: null,

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Replace the entire dreams list (e.g. after fetching from Supabase). */
  setDreams: (dreams) => set({ dreams: Array.isArray(dreams) ? dreams : [] }),

  /**
   * Prepend a newly created dream to the list (so newest appears first without
   * a full re-fetch).
   */
  addDream: (dream) =>
    set((state) => ({
      dreams: [dream, ...state.dreams],
    })),

  /**
   * Merge partial updates into an existing dream by id.
   * Used when AI analysis arrives asynchronously after the initial save.
   *
   * @param {string}        id      — dream UUID
   * @param {Partial<Dream>} updates — fields to merge
   */
  updateDream: (id, updates) =>
    set((state) => ({
      dreams: state.dreams.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
      // Also update currentDream if it is the one being modified
      currentDream:
        state.currentDream?.id === id
          ? { ...state.currentDream, ...updates }
          : state.currentDream,
    })),

  /**
   * Remove a dream from the local list (mirrors a DELETE in Supabase).
   * @param {string} id — dream UUID
   */
  removeDream: (id) =>
    set((state) => ({
      dreams: state.dreams.filter((d) => d.id !== id),
      currentDream:
        state.currentDream?.id === id ? null : state.currentDream,
    })),

  /**
   * Set the dream currently being viewed / edited in the detail screen.
   * Pass null to clear.
   */
  setCurrentDream: (dream) => set({ currentDream: dream }),
});

// ---------------------------------------------------------------------------
// UI slice
// ---------------------------------------------------------------------------
// Lightweight flags that drive global loading/recording indicators.  Keeping
// them in the store (rather than component state) lets the header, tab bar,
// and status overlays all react to the same source of truth.

/**
 * @typedef {Object} UISlice
 * @property {boolean} isRecording      — audio capture is active
 * @property {boolean} isTranscribing   — Whisper API call is in-flight
 * @property {boolean} isAnalyzing      — GPT-4o analysis call is in-flight
 * @property {function(boolean): void}  setIsRecording
 * @property {function(boolean): void}  setIsTranscribing
 * @property {function(boolean): void}  setIsAnalyzing
 * @property {function(): void}         resetUIFlags  — convenience reset
 */

const createUISlice = (set) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  isRecording: false,
  isTranscribing: false,
  isAnalyzing: false,

  // ── Actions ───────────────────────────────────────────────────────────────
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsTranscribing: (isTranscribing) => set({ isTranscribing }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

  /** Reset all UI flags to false — call after a recording workflow completes
   *  or is cancelled. */
  resetUIFlags: () =>
    set({
      isRecording: false,
      isTranscribing: false,
      isAnalyzing: false,
    }),
});

// =============================================================================
// Composed store
// =============================================================================

export const useDreamStore = create(
  subscribeWithSelector((set, get) => ({
    ...createAuthSlice(set, get),
    ...createDreamsSlice(set, get),
    ...createUISlice(set, get),
  }))
);

// =============================================================================
// Convenience selectors
// =============================================================================
// Pre-built selectors keep components free of repetitive boilerplate and help
// with memoisation since the selector reference is stable.

/** Select just the authenticated user */
export const selectUser = (state) => state.user;

/** Select the Supabase session */
export const selectSession = (state) => state.session;

/** Select the isPremium flag */
export const selectIsPremium = (state) => state.isPremium;

/** Select the global loading flag */
export const selectIsLoading = (state) => state.isLoading;

/** Select the full dreams array */
export const selectDreams = (state) => state.dreams;

/** Select the dream currently being viewed */
export const selectCurrentDream = (state) => state.currentDream;

/** Select all UI flags as an object */
export const selectUIFlags = (state) => ({
  isRecording: state.isRecording,
  isTranscribing: state.isTranscribing,
  isAnalyzing: state.isAnalyzing,
});

/** Returns true when any async AI operation is running */
export const selectIsProcessing = (state) =>
  state.isTranscribing || state.isAnalyzing;

// =============================================================================
// Legacy alias — keeps any existing imports of `useStore` working during the
// migration to the new `useDreamStore` name.
// =============================================================================
export const useStore = useDreamStore;

// Default export — the hook, for convenience
export default useDreamStore;
