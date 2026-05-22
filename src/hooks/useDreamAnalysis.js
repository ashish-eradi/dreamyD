import { useState, useCallback, useRef } from 'react';
import { useStore } from '../store';
import { openaiService } from '../services/openai';

/**
 * useDreamAnalysis
 *
 * Orchestrates the two-step AI pipeline:
 *   1. Transcription  — audio URI → text via openaiService.transcribeAudio
 *   2. Analysis       — transcript → structured dream data via openaiService.analyzeDream
 *
 * Returns:
 *   transcript     — string | null, raw Whisper output
 *   analysis       — object | null, structured GPT-4o response (see analyzeDream)
 *   isTranscribing — boolean
 *   isAnalyzing    — boolean
 *   error          — Error | null
 *   analyzeAudio   — (audioUri: string) => Promise<{ transcript, analysis } | null>
 *   reset          — () => void
 */
export function useDreamAnalysis() {
  const [transcript, setTranscript] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Access zustand store setters
  const setStoreTranscribing = useStore((s) => s.setIsTranscribing);
  const setStoreAnalyzing = useStore((s) => s.setIsAnalyzing);

  // Allow in-flight requests to be cancelled when the hook unmounts or reset is called
  const abortRef = useRef(false);

  // ─── reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current = true; // Signal any in-flight pipeline to bail out
    setTranscript(null);
    setAnalysis(null);
    setIsTranscribing(false);
    setIsAnalyzing(false);
    setError(null);

    // Sync zustand store
    if (setStoreTranscribing) setStoreTranscribing(false);
    if (setStoreAnalyzing) setStoreAnalyzing(false);

    // Re-arm after clearing so future calls work normally
    abortRef.current = false;
  }, [setStoreTranscribing, setStoreAnalyzing]);

  // ─── analyzeAudio ─────────────────────────────────────────────────────────
  /**
   * Full pipeline: transcribe → analyze.
   *
   * @param {string} audioUri  Local file URI produced by useAudioRecorder
   * @returns {Promise<{ transcript: string, analysis: object } | null>}
   */
  const analyzeAudio = useCallback(
    async (audioUri) => {
      if (!audioUri) {
        const err = new Error('No audio URI provided to analyzeAudio');
        setError(err);
        return null;
      }

      // Reset abort flag for a fresh run
      abortRef.current = false;

      // Clear previous results and errors
      setTranscript(null);
      setAnalysis(null);
      setError(null);

      // ── Step 1: Transcription ─────────────────────────────────────────────
      setIsTranscribing(true);
      if (setStoreTranscribing) setStoreTranscribing(true);

      let rawTranscript;
      try {
        rawTranscript = await openaiService.transcribeAudio(audioUri);

        if (abortRef.current) return null;

        setTranscript(rawTranscript);
      } catch (transcribeErr) {
        console.error('[useDreamAnalysis] Transcription failed:', transcribeErr);
        const wrappedErr = new Error(
          `Transcription failed: ${transcribeErr?.message ?? 'Unknown error'}`
        );
        setError(wrappedErr);
        setIsTranscribing(false);
        if (setStoreTranscribing) setStoreTranscribing(false);
        return null;
      } finally {
        setIsTranscribing(false);
        if (setStoreTranscribing) setStoreTranscribing(false);
      }

      if (!rawTranscript || rawTranscript.trim().length === 0) {
        const emptyErr = new Error(
          'Transcription returned empty text. Please try speaking more clearly.'
        );
        setError(emptyErr);
        return null;
      }

      if (abortRef.current) return null;

      // ── Step 2: Analysis ──────────────────────────────────────────────────
      setIsAnalyzing(true);
      if (setStoreAnalyzing) setStoreAnalyzing(true);

      let dreamAnalysis;
      try {
        dreamAnalysis = await openaiService.analyzeDream(rawTranscript);

        if (abortRef.current) return null;

        setAnalysis(dreamAnalysis);
      } catch (analyzeErr) {
        console.error('[useDreamAnalysis] Analysis failed:', analyzeErr);
        const wrappedErr = new Error(
          `Dream analysis failed: ${analyzeErr?.message ?? 'Unknown error'}`
        );
        setError(wrappedErr);
        setIsAnalyzing(false);
        if (setStoreAnalyzing) setStoreAnalyzing(false);
        return null;
      } finally {
        setIsAnalyzing(false);
        if (setStoreAnalyzing) setStoreAnalyzing(false);
      }

      if (abortRef.current) return null;

      return { transcript: rawTranscript, analysis: dreamAnalysis };
    },
    [setStoreTranscribing, setStoreAnalyzing]
  );

  return {
    transcript,
    analysis,
    isTranscribing,
    isAnalyzing,
    error,
    analyzeAudio,
    reset,
  };
}

export default useDreamAnalysis;
