import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// ─── Constants ────────────────────────────────────────────────────────────────
const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

// Metering interval in milliseconds
const METERING_INTERVAL_MS = 80;

/**
 * useAudioRecorder
 *
 * Custom hook that manages the full audio recording lifecycle using expo-av.
 *
 * Returns:
 *   isRecording  — boolean, true while actively recording
 *   audioUri     — string | null, local file URI of the last completed recording
 *   duration     — number, elapsed recording time in seconds
 *   metering     — number, current dB level (-160 to 0); useful for waveform UI
 *   startRecording  — () => Promise<void>
 *   stopRecording   — () => Promise<string | null>  (resolves with audioUri)
 *   clearRecording  — () => void  (resets state and deletes cached file)
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [duration, setDuration] = useState(0);
  const [metering, setMetering] = useState(-160);
  const [hasPermission, setHasPermission] = useState(false);

  // Refs so callbacks always close over latest values without re-creating them
  const recordingRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const meteringIntervalRef = useRef(null);
  const durationRef = useRef(0);

  // ─── Request permissions on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function requestPermissions() {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (!cancelled) {
          setHasPermission(status === 'granted');
        }
      } catch (err) {
        console.warn('[useAudioRecorder] Permission request failed:', err);
      }
    }

    requestPermissions();

    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Configure audio mode once on mount ───────────────────────────────────
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch((err) =>
      console.warn('[useAudioRecorder] setAudioModeAsync failed:', err)
    );

    return () => {
      // Reset audio mode when hook unmounts
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      }).catch(() => {});
    };
  }, []);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      _clearTimers();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function _clearTimers() {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
      meteringIntervalRef.current = null;
    }
  }

  function _buildFilePath() {
    const timestamp = Date.now();
    return `${FileSystem.cacheDirectory}dream_audio_${timestamp}.m4a`;
  }

  async function _pollMetering() {
    if (!recordingRef.current) return;
    try {
      const status = await recordingRef.current.getStatusAsync();
      if (status.isRecording && status.metering !== undefined) {
        setMetering(status.metering);
      }
    } catch {
      // Metering errors are non-fatal
    }
  }

  // ─── startRecording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecording) {
      console.warn('[useAudioRecorder] Already recording');
      return;
    }

    if (!hasPermission) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[useAudioRecorder] Microphone permission denied');
        return;
      }
      setHasPermission(true);
    }

    try {
      // Ensure any leftover recording is unloaded first
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...RECORDING_OPTIONS,
        isMeteringEnabled: true,
      });

      await recording.startAsync();
      recordingRef.current = recording;

      // Reset counters
      durationRef.current = 0;
      setDuration(0);
      setMetering(-160);
      setIsRecording(true);

      // Tick duration every second
      durationIntervalRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);

      // Poll metering at a higher rate for smooth waveform
      meteringIntervalRef.current = setInterval(
        _pollMetering,
        METERING_INTERVAL_MS
      );
    } catch (err) {
      console.error('[useAudioRecorder] startRecording failed:', err);
      _clearTimers();
      setIsRecording(false);
    }
  }, [isRecording, hasPermission]);

  // ─── stopRecording ────────────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) {
      console.warn('[useAudioRecorder] No active recording to stop');
      return null;
    }

    _clearTimers();

    try {
      await recordingRef.current.stopAndUnloadAsync();

      const tmpUri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      setMetering(-160);

      if (!tmpUri) {
        console.warn('[useAudioRecorder] Recording URI is null after stop');
        return null;
      }

      // Move from temp location to a stable cache path with our naming convention
      const destPath = _buildFilePath();
      await FileSystem.moveAsync({ from: tmpUri, to: destPath });

      setAudioUri(destPath);
      return destPath;
    } catch (err) {
      console.error('[useAudioRecorder] stopRecording failed:', err);
      recordingRef.current = null;
      setIsRecording(false);
      return null;
    }
  }, []);

  // ─── clearRecording ───────────────────────────────────────────────────────
  const clearRecording = useCallback(async () => {
    // If currently recording, stop it first
    if (recordingRef.current) {
      _clearTimers();
      await recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }

    // Delete cached file if it exists
    if (audioUri) {
      FileSystem.deleteAsync(audioUri, { idempotent: true }).catch((err) =>
        console.warn('[useAudioRecorder] clearRecording delete failed:', err)
      );
    }

    setIsRecording(false);
    setAudioUri(null);
    setDuration(0);
    setMetering(-160);
    durationRef.current = 0;
  }, [audioUri]);

  return {
    isRecording,
    audioUri,
    duration,
    metering,
    hasPermission,
    startRecording,
    stopRecording,
    clearRecording,
  };
}

export default useAudioRecorder;
