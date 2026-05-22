// =============================================================================
// DreamDiary — useSupabase hook
// =============================================================================
// Binds all Supabase service functions to the currently authenticated user
// and keeps the Zustand store in sync with auth state changes.
//
// Returns:
//   user            — current Supabase User | null
//   session         — current Supabase Session | null
//   isLoading       — true while the initial session is being resolved
//   // Auth
//   signInWithEmail  — (email, password) => Promise<Session>
//   signUpWithEmail  — (email, password, name?) => Promise<Session | null>
//   signInWithGoogle — () => Promise<OAuthData>
//   signOut          — () => Promise<void>
//   // Profile
//   getProfile       — () => Promise<Object | null>  (uses current user id)
//   updateProfile    — (updates) => Promise<Object>
//   // Dreams
//   getDreams        — () => Promise<Array>
//   getDreamById     — (id) => Promise<Object | null>
//   saveDream        — (dreamData) => Promise<Object>
//   updateDream      — (id, updates) => Promise<Object>
//   deleteDream      — (id) => Promise<void>
//   // Tags
//   getTagsForDream  — (dreamId) => Promise<Array>
//   saveTag          — (tagData) => Promise<Object>
//   saveTags         — (tags) => Promise<Array>
//   // Patterns
//   getPatterns      — () => Promise<Array>
//   savePattern      — (patternData) => Promise<Object>
//   // Storage
//   uploadAudio      — (localUri, dreamId?) => Promise<string>
//   deleteAudio      — (dreamId) => Promise<void>
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useDreamStore } from '../store';
import {
  supabase,
  signInWithEmail as _signInWithEmail,
  signUpWithEmail as _signUpWithEmail,
  signInWithGoogle as _signInWithGoogle,
  signOut as _signOut,
  getProfile as _getProfile,
  updateProfile as _updateProfile,
  getDreams as _getDreams,
  getDreamById as _getDreamById,
  saveDream as _saveDream,
  updateDream as _updateDream,
  deleteDream as _deleteDream,
  getTagsForDream as _getTagsForDream,
  saveTag as _saveTag,
  saveTags as _saveTags,
  getPatterns as _getPatterns,
  savePattern as _savePattern,
  uploadAudio as _uploadAudio,
  deleteAudio as _deleteAudio,
} from '../services/supabase';

export function useSupabase() {
  const setUser = useDreamStore((s) => s.setUser);
  const setSession = useDreamStore((s) => s.setSession);
  const setIsLoading = useDreamStore((s) => s.setIsLoading);
  const storeSignOut = useDreamStore((s) => s.signOut);
  const storeUser = useDreamStore((s) => s.user);
  const storeSession = useDreamStore((s) => s.session);
  const isLoading = useDreamStore((s) => s.isLoading);

  // ─── Bootstrap: resolve any persisted session on mount ───────────────────
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!cancelled) {
          setSession(session ?? null);
          // setSession already syncs user via the store action
        }
      } catch (err) {
        console.warn('[useSupabase] Failed to resolve initial session:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // setSession updates both session + user in the store
      setSession(session ?? null);

      if (event === 'SIGNED_OUT') {
        // Clear cached dream data when the user signs out
        useDreamStore.getState().setDreams([]);
        useDreamStore.getState().setCurrentDream(null);
      }

      if (event === 'INITIAL_SESSION') {
        // Mark auth bootstrap as complete
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Helper: require an authenticated user id ─────────────────────────────
  // Reads directly from the store snapshot so it's always fresh even if the
  // component hasn't re-rendered yet.
  function requireUserId() {
    const uid =
      useDreamStore.getState().user?.id ??
      useDreamStore.getState().session?.user?.id;
    if (!uid) {
      throw new Error('[useSupabase] No authenticated user. Please sign in first.');
    }
    return uid;
  }

  // ─── Auth wrappers ────────────────────────────────────────────────────────

  const signInWithEmail = useCallback(
    (email, password) => _signInWithEmail(email, password),
    []
  );

  const signUpWithEmail = useCallback(
    (email, password, name) => _signUpWithEmail(email, password, name),
    []
  );

  const signInWithGoogle = useCallback(() => _signInWithGoogle(), []);

  const signOut = useCallback(async () => {
    await _signOut();
    // The onAuthStateChange listener fires SIGNED_OUT and clears the store
  }, []);

  // ─── Profile wrappers ─────────────────────────────────────────────────────

  const getProfile = useCallback(() => {
    const userId = requireUserId();
    return _getProfile(userId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateProfile = useCallback((updates) => {
    const userId = requireUserId();
    return _updateProfile(userId, updates);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Dream wrappers ───────────────────────────────────────────────────────

  const getDreams = useCallback(() => {
    const userId = requireUserId();
    return _getDreams(userId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getDreamById = useCallback(
    (id) => _getDreamById(id),
    []
  );

  const saveDream = useCallback((dreamData) => {
    const userId = requireUserId();
    return _saveDream({ ...dreamData, user_id: userId });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDream = useCallback(
    (id, updates) => _updateDream(id, updates),
    []
  );

  const deleteDream = useCallback(
    (id) => _deleteDream(id),
    []
  );

  // ─── Tag wrappers ─────────────────────────────────────────────────────────

  const getTagsForDream = useCallback(
    (dreamId) => _getTagsForDream(dreamId),
    []
  );

  const saveTag = useCallback(
    (tagData) => _saveTag(tagData),
    []
  );

  const saveTags = useCallback(
    (tags) => _saveTags(tags),
    []
  );

  // ─── Pattern wrappers ─────────────────────────────────────────────────────

  const getPatterns = useCallback(() => {
    const userId = requireUserId();
    return _getPatterns(userId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const savePattern = useCallback((patternData) => {
    const userId = requireUserId();
    return _savePattern({ ...patternData, user_id: userId });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Storage wrappers ─────────────────────────────────────────────────────

  const uploadAudio = useCallback((localUri, dreamId) => {
    const userId = requireUserId();
    return _uploadAudio(userId, localUri, dreamId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteAudio = useCallback((dreamId) => {
    const userId = requireUserId();
    return _deleteAudio(userId, dreamId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Return ───────────────────────────────────────────────────────────────
  return {
    // State
    user: storeUser,
    session: storeSession,
    isLoading,

    // Auth
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,

    // Profile
    getProfile,
    updateProfile,

    // Dreams
    getDreams,
    getDreamById,
    saveDream,
    updateDream,
    deleteDream,

    // Tags
    getTagsForDream,
    saveTag,
    saveTags,

    // Patterns
    getPatterns,
    savePattern,

    // Storage
    uploadAudio,
    deleteAudio,
  };
}

export default useSupabase;
