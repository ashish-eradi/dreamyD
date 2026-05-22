// =============================================================================
// DreamDiary — RecordDreamScreen
// =============================================================================
// Full-screen voice recording workflow:
//   Phase 1 — Idle / pre-recording
//   Phase 2 — Active recording (live waveform, timer)
//   Phase 3 — Review (transcript + AI analysis preview)
//   Phase 4 — Saving / success
// =============================================================================

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useDreamAnalysis } from '../../hooks/useDreamAnalysis';
import { useDreamStore } from '../../store';
import { saveDream, saveTags, uploadAudio } from '../../services/supabase';
import { getEmotionColor, getTopEmotion, getTopSymbols } from '../../utils';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bg: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  gold: '#F59E0B',
  text: '#F1F0FF',
  muted: '#8B8BAE',
  success: '#10B981',
  error: '#EF4444',
  recording: '#EF4444',
};

const NUM_WAVEFORM_BARS = 20;
const WAVEFORM_BAR_WIDTH = 5;
const WAVEFORM_BAR_GAP = 4;
const WAVEFORM_MAX_HEIGHT = 56;
const WAVEFORM_MIN_HEIGHT = 6;

// Phases
const PHASE = {
  IDLE: 'IDLE',
  RECORDING: 'RECORDING',
  REVIEW: 'REVIEW',
  SAVING: 'SAVING',
  SUCCESS: 'SUCCESS',
};

// ─── Format duration ──────────────────────────────────────────────────────────
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── MicButton (Phase 1 idle) ─────────────────────────────────────────────────
function MicButton({ onPress }) {
  const breathe = useSharedValue(1);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1600, easing: Easing.inOut(Easing.sine) }),
        withTiming(0.96, { duration: 1600, easing: Easing.inOut(Easing.sine) }),
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  return (
    <Animated.View style={[styles.micButtonOuter, style]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Start recording"
        style={styles.micButtonTouchable}
      >
        <LinearGradient
          colors={['#7B5EA7', '#C084FC', '#A78BFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.micButtonGradient}
        >
          <Text style={styles.micEmoji}>🎙</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── WaveformBar ──────────────────────────────────────────────────────────────
/**
 * Single animated waveform bar. Each bar interpolates its height based on the
 * normalised metering level (0–1) and its own phase offset.
 */
function WaveformBar({ index, meteringNorm, isRecording }) {
  const heightAnim = useSharedValue(WAVEFORM_MIN_HEIGHT);
  const idleAnim = useSharedValue(WAVEFORM_MIN_HEIGHT);

  // Idle gentle wave
  useEffect(() => {
    const phaseDelay = (index / NUM_WAVEFORM_BARS) * 600;
    idleAnim.value = withDelay(
      phaseDelay,
      withRepeat(
        withSequence(
          withTiming(12 + (index % 4) * 3, {
            duration: 700 + (index % 5) * 120,
            easing: Easing.inOut(Easing.sine),
          }),
          withTiming(WAVEFORM_MIN_HEIGHT, {
            duration: 700 + (index % 5) * 120,
            easing: Easing.inOut(Easing.sine),
          }),
        ),
        -1,
        false
      )
    );
  }, [index]);

  // Update to metering value when recording
  useEffect(() => {
    if (!isRecording) return;

    // Each bar gets a slightly different multiplier for organic look
    const multiplier = 0.6 + ((index % 5) / 5) * 0.8;
    const targetHeight = Math.max(
      WAVEFORM_MIN_HEIGHT,
      Math.min(WAVEFORM_MAX_HEIGHT, meteringNorm * WAVEFORM_MAX_HEIGHT * multiplier)
    );

    heightAnim.value = withSpring(targetHeight, {
      damping: 8,
      stiffness: 120,
    });
  }, [meteringNorm, isRecording, index]);

  const barStyle = useAnimatedStyle(() => {
    const h = isRecording ? heightAnim.value : idleAnim.value;
    return {
      height: h,
      opacity: isRecording
        ? interpolate(h, [WAVEFORM_MIN_HEIGHT, WAVEFORM_MAX_HEIGHT], [0.5, 1])
        : 0.4,
    };
  });

  // Color: accent when recording, muted when idle
  const barColor = isRecording ? COLORS.accent : COLORS.muted;

  return (
    <Animated.View
      style={[
        styles.waveformBar,
        {
          width: WAVEFORM_BAR_WIDTH,
          borderRadius: WAVEFORM_BAR_WIDTH / 2,
          backgroundColor: barColor,
          marginHorizontal: WAVEFORM_BAR_GAP / 2,
        },
        barStyle,
      ]}
    />
  );
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ metering, isRecording }) {
  // Normalise metering from dB range (-160 to 0) to 0–1
  const meteringNorm = Math.max(0, Math.min(1, (metering + 80) / 80));

  return (
    <View style={styles.waveformContainer}>
      {Array.from({ length: NUM_WAVEFORM_BARS }, (_, i) => (
        <WaveformBar
          key={i}
          index={i}
          meteringNorm={meteringNorm}
          isRecording={isRecording}
        />
      ))}
    </View>
  );
}

// ─── RecordingDot ─────────────────────────────────────────────────────────────
function RecordingDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.1, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.recordingDot, style]} />;
}

// ─── VividnessBar ─────────────────────────────────────────────────────────────
function VividnessBar({ score }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(score / 10, {
      duration: 900,
      easing: Easing.out(Easing.ease),
    });
  }, [score]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  const color =
    score >= 8 ? COLORS.success : score >= 5 ? COLORS.gold : COLORS.accent;

  return (
    <View style={styles.vividnessTrack}>
      <Animated.View
        style={[styles.vividnessFill, { backgroundColor: color }, barStyle]}
      />
    </View>
  );
}

// ─── EmotionChip ──────────────────────────────────────────────────────────────
function EmotionChip({ label }) {
  const color = getEmotionColor(label);
  return (
    <View
      style={[
        styles.emotionChip,
        {
          backgroundColor: color + '28',
          borderColor: color + '60',
        },
      ]}
    >
      <Text style={[styles.emotionChipText, { color }]}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
    </View>
  );
}

// ─── SymbolTag ────────────────────────────────────────────────────────────────
function SymbolTag({ label }) {
  return (
    <View style={styles.symbolTag}>
      <Text style={styles.symbolTagText}>#{label}</Text>
    </View>
  );
}

// ─── SuccessAnimation ─────────────────────────────────────────────────────────
function SuccessAnimation() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.successContainer, style]}>
      <LinearGradient
        colors={['rgba(16,185,129,0.25)', 'rgba(16,185,129,0.10)']}
        style={styles.successCircle}
      >
        <Text style={styles.successCheck}>✓</Text>
      </LinearGradient>
      <Text style={styles.successTitle}>Dream saved!</Text>
      <Text style={styles.successSubtitle}>Opening your dream...</Text>
    </Animated.View>
  );
}

// ─── RecordDreamScreen ────────────────────────────────────────────────────────
export default function RecordDreamScreen({ navigation }) {
  const user = useDreamStore((s) => s.user);
  const addDream = useDreamStore((s) => s.addDream);
  const setCurrentDream = useDreamStore((s) => s.setCurrentDream);

  const {
    isRecording,
    audioUri,
    duration,
    metering,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  const {
    transcript,
    analysis,
    isTranscribing,
    isAnalyzing,
    error: analysisError,
    analyzeAudio,
    reset: resetAnalysis,
  } = useDreamAnalysis();

  const [phase, setPhase] = useState(PHASE.IDLE);
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [saveError, setSaveError] = useState(null);
  const [savedDream, setSavedDream] = useState(null);

  const savedDreamRef = useRef(null);
  const autoNavigateTimer = useRef(null);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (autoNavigateTimer.current) clearTimeout(autoNavigateTimer.current);
      resetAnalysis();
    };
  }, []);

  // ── Watch transcript changes from analysis hook ───────────────────────────
  useEffect(() => {
    if (transcript) {
      setEditedTranscript(transcript);
    }
  }, [transcript]);

  // ── Handle phase 2 → 3 transition (transcription starts automatically) ───
  const handleStartRecording = useCallback(async () => {
    setSaveError(null);
    await startRecording();
    setPhase(PHASE.RECORDING);
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    const uri = await stopRecording();
    if (!uri) {
      setPhase(PHASE.IDLE);
      return;
    }
    setPhase(PHASE.REVIEW);
    // Kick off transcription + analysis automatically
    await analyzeAudio(uri);
  }, [stopRecording, analyzeAudio]);

  // ── Re-record ─────────────────────────────────────────────────────────────
  const handleReRecord = useCallback(() => {
    clearRecording();
    resetAnalysis();
    setEditingTranscript(false);
    setEditedTranscript('');
    setSaveError(null);
    setPhase(PHASE.IDLE);
  }, [clearRecording, resetAnalysis]);

  // ── Save dream ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    setSaveError(null);
    setPhase(PHASE.SAVING);

    try {
      const finalTranscript =
        editingTranscript && editedTranscript.trim()
          ? editedTranscript.trim()
          : transcript ?? editedTranscript.trim() ?? '';

      // Upload audio (non-blocking best-effort)
      let audioUrl = null;
      if (audioUri) {
        try {
          audioUrl = await uploadAudio(user.id, audioUri);
        } catch (uploadErr) {
          console.warn('[RecordDreamScreen] Audio upload failed:', uploadErr);
        }
      }

      // Prepare dream row
      const dreamPayload = {
        user_id: user.id,
        transcript: finalTranscript,
        audio_url: audioUrl,
        recorded_at: new Date().toISOString(),
        ai_summary: analysis?.summary ?? null,
        vividness_score: analysis?.vividness_score ?? null,
        title: analysis?.title ?? null,
        is_favourite: false,
      };

      const newDream = await saveDream(dreamPayload);

      // Save tags if analysis produced them
      if (analysis?.tags?.length > 0 && newDream?.id) {
        try {
          const tagsPayload = analysis.tags.map((tag) => ({
            dream_id: newDream.id,
            type: tag.type,
            label: tag.label,
            confidence_score: tag.confidence_score ?? null,
          }));
          const savedTags = await saveTags(tagsPayload);
          newDream.dream_tags = savedTags;
        } catch (tagErr) {
          console.warn('[RecordDreamScreen] Tag save failed:', tagErr);
        }
      }

      // Update store
      addDream(newDream);
      setCurrentDream(newDream);
      setSavedDream(newDream);
      savedDreamRef.current = newDream;

      setPhase(PHASE.SUCCESS);

      // Auto-navigate to DreamDetail after 1.5s
      autoNavigateTimer.current = setTimeout(() => {
        if (savedDreamRef.current) {
          navigation.replace('DreamDetail', { dreamId: savedDreamRef.current.id });
        }
      }, 1500);
    } catch (err) {
      console.error('[RecordDreamScreen] Save failed:', err);
      setSaveError(err?.message ?? 'Failed to save dream. Please try again.');
      setPhase(PHASE.REVIEW);
    }
  }, [
    user?.id,
    audioUri,
    transcript,
    editedTranscript,
    editingTranscript,
    analysis,
    addDream,
    setCurrentDream,
    navigation,
  ]);

  // ── Render phases ─────────────────────────────────────────────────────────

  const renderPhaseIdle = () => (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(200)}
      style={styles.phaseContainer}
    >
      <View style={styles.idleIconArea}>
        <Text style={styles.idleMoonEmoji}>🌙</Text>
      </View>
      <Text style={styles.idleTitle}>Tap to start recording</Text>
      <Text style={styles.idleSubtitle}>
        Speak your dream out loud.{'\n'}We'll transcribe and analyze it automatically.
      </Text>
      <MicButton onPress={handleStartRecording} />
      <Text style={styles.idleHint}>Hold the thought — tap when ready</Text>
    </Animated.View>
  );

  const renderPhaseRecording = () => (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.phaseContainer}
    >
      {/* Recording indicator */}
      <View style={styles.recordingIndicatorRow}>
        <RecordingDot />
        <Text style={styles.recordingLabel}>Recording...</Text>
      </View>

      {/* Timer */}
      <Text style={styles.durationTimer}>{formatDuration(duration)}</Text>

      {/* Live waveform */}
      <View style={styles.waveformSection}>
        <Waveform metering={metering} isRecording={isRecording} />
      </View>

      <Text style={styles.recordingTip}>
        Describe everything you remember — people, places, feelings
      </Text>

      {/* Stop button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleStopRecording}
        style={styles.stopButtonOuter}
        accessibilityRole="button"
        accessibilityLabel="Stop recording"
      >
        <View style={styles.stopButton}>
          <View style={styles.stopButtonSquare} />
        </View>
        <Text style={styles.stopButtonLabel}>Stop Recording</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPhaseReview = () => {
    const isProcessing = isTranscribing || isAnalyzing;
    const topEmotion =
      analysis?.tags ? getTopEmotion(analysis.tags) : null;
    const topSymbols =
      analysis?.tags ? getTopSymbols(analysis.tags, 3) : [];

    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[styles.phaseContainer, { flex: 1 }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.reviewScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Transcript card */}
            <View style={styles.transcriptCard}>
              <View style={styles.transcriptHeader}>
                <Text style={styles.transcriptLabel}>Transcript</Text>
                {!isTranscribing && transcript && !editingTranscript && (
                  <TouchableOpacity
                    onPress={() => {
                      setEditingTranscript(true);
                      setEditedTranscript(transcript);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Edit transcript"
                  >
                    <Text style={styles.editLink}>Edit ✏️</Text>
                  </TouchableOpacity>
                )}
                {editingTranscript && (
                  <TouchableOpacity
                    onPress={() => setEditingTranscript(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Done editing"
                  >
                    <Text style={styles.doneEditLink}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isTranscribing ? (
                <View style={styles.transcribingState}>
                  <ActivityIndicator color={COLORS.accent} size="small" />
                  <Text style={styles.transcribingText}>Transcribing...</Text>
                </View>
              ) : editingTranscript ? (
                <TextInput
                  style={styles.transcriptInput}
                  value={editedTranscript}
                  onChangeText={setEditedTranscript}
                  multiline
                  autoFocus
                  placeholderTextColor={COLORS.muted}
                  placeholder="Edit your dream transcript..."
                  selectionColor={COLORS.accent}
                />
              ) : (
                <Text style={styles.transcriptText}>
                  {editedTranscript || transcript || 'No transcript available.'}
                </Text>
              )}
            </View>

            {/* Analysis card */}
            {(isAnalyzing || analysis) && (
              <Animated.View
                entering={FadeInDown.delay(100).duration(400)}
                style={styles.analysisCard}
              >
                <Text style={styles.analysisLabel}>Dream Analysis</Text>

                {isAnalyzing ? (
                  <View style={styles.analyzingState}>
                    <ActivityIndicator color={COLORS.accent} size="small" />
                    <Text style={styles.analyzingText}>Analyzing dream...</Text>
                  </View>
                ) : analysis ? (
                  <View style={styles.analysisContent}>
                    {/* Vividness */}
                    {analysis.vividness_score != null && (
                      <View style={styles.vividnessRow}>
                        <Text style={styles.vividnessLabel}>Vividness</Text>
                        <Text style={styles.vividnessScore}>
                          {analysis.vividness_score}
                          <Text style={styles.vividnessMax}>/10</Text>
                        </Text>
                      </View>
                    )}
                    {analysis.vividness_score != null && (
                      <VividnessBar score={analysis.vividness_score} />
                    )}

                    {/* AI summary */}
                    {analysis.summary && (
                      <Text style={styles.analysisSummary}>
                        {analysis.summary}
                      </Text>
                    )}

                    {/* Emotion + symbol tags */}
                    {(topEmotion || topSymbols.length > 0) && (
                      <View style={styles.tagRow}>
                        {topEmotion && <EmotionChip label={topEmotion.label} />}
                        {topSymbols.map((sym, i) => (
                          <SymbolTag
                            key={sym.id ?? `${sym.label}-${i}`}
                            label={sym.label}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                ) : null}
              </Animated.View>
            )}

            {/* Analysis error */}
            {analysisError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{analysisError.message}</Text>
              </View>
            )}

            {/* Save error */}
            {saveError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{saveError}</Text>
              </View>
            )}

            {/* Actions */}
            {!isTranscribing && (transcript || editedTranscript) && (
              <Animated.View
                entering={FadeInUp.delay(200).duration(400)}
                style={styles.reviewActions}
              >
                {/* Save button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSave}
                  disabled={isAnalyzing}
                  style={styles.saveButtonOuter}
                  accessibilityRole="button"
                  accessibilityLabel="Save dream"
                >
                  <LinearGradient
                    colors={
                      isAnalyzing
                        ? ['#2D6E55', '#1D4E3D']
                        : ['#059669', '#10B981']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButtonGradient}
                  >
                    <Text style={styles.saveButtonText}>
                      {isAnalyzing ? 'Wait for analysis...' : 'Save Dream'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Re-record button */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleReRecord}
                  style={styles.reRecordButton}
                  accessibilityRole="button"
                  accessibilityLabel="Re-record dream"
                >
                  <Text style={styles.reRecordButtonText}>↺ Re-record</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* No transcript yet — show re-record option */}
            {!isTranscribing && !transcript && !editedTranscript && (
              <View style={styles.reviewActions}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleReRecord}
                  style={styles.reRecordButton}
                  accessibilityRole="button"
                  accessibilityLabel="Re-record dream"
                >
                  <Text style={styles.reRecordButtonText}>↺ Try again</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    );
  };

  const renderPhaseSaving = () => (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.phaseContainer}
    >
      <View style={styles.savingContainer}>
        <ActivityIndicator color={COLORS.accent} size="large" />
        <Text style={styles.savingText}>Saving your dream...</Text>
        <Text style={styles.savingSubtext}>Just a moment</Text>
      </View>
    </Animated.View>
  );

  const renderPhaseSuccess = () => (
    <Animated.View
      entering={ZoomIn.duration(400)}
      style={styles.phaseContainer}
    >
      <SuccessAnimation />
    </Animated.View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(123,94,167,0.15)', 'transparent', COLORS.bg]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Screen header ── */}
        <Animated.View entering={FadeIn.duration(350)} style={styles.screenHeader}>
          {phase !== PHASE.SUCCESS ? (
            <TouchableOpacity
              onPress={() => {
                if (phase === PHASE.RECORDING) {
                  // Stop recording before leaving
                  stopRecording().then(() => {
                    clearRecording();
                    navigation.goBack();
                  });
                } else {
                  clearRecording();
                  resetAnalysis();
                  navigation.goBack();
                }
              }}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.closeButton} />
          )}

          <Text style={styles.screenTitle}>
            {phase === PHASE.IDLE && 'Record Dream'}
            {phase === PHASE.RECORDING && 'Recording'}
            {phase === PHASE.REVIEW && 'Review Dream'}
            {phase === PHASE.SAVING && 'Saving...'}
            {phase === PHASE.SUCCESS && 'Saved!'}
          </Text>

          <View style={{ width: 40 }} />
        </Animated.View>

        {/* ── Phase content ── */}
        <View style={styles.phaseWrapper}>
          {phase === PHASE.IDLE && renderPhaseIdle()}
          {phase === PHASE.RECORDING && renderPhaseRecording()}
          {phase === PHASE.REVIEW && renderPhaseReview()}
          {phase === PHASE.SAVING && renderPhaseSaving()}
          {phase === PHASE.SUCCESS && renderPhaseSuccess()}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },

  // Screen header
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,139,174,0.15)',
    borderRadius: 20,
  },
  closeIcon: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },

  // Phase wrapper
  phaseWrapper: {
    flex: 1,
  },
  phaseContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // ── Phase 1: Idle ──────────────────────────────────────────────────────────
  idleIconArea: {
    marginBottom: 16,
  },
  idleMoonEmoji: {
    fontSize: 52,
  },
  idleTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  idleSubtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  micButtonOuter: {
    borderRadius: 55,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 16,
    marginBottom: 20,
  },
  micButtonTouchable: {
    borderRadius: 55,
    overflow: 'hidden',
  },
  micButtonGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micEmoji: {
    fontSize: 46,
  },
  idleHint: {
    fontSize: 13,
    color: 'rgba(139,139,174,0.6)',
    textAlign: 'center',
  },

  // ── Phase 2: Recording ─────────────────────────────────────────────────────
  recordingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.recording,
    marginRight: 8,
  },
  recordingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.recording,
    letterSpacing: 0.5,
  },
  durationTimer: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
  },
  waveformSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: WAVEFORM_MAX_HEIGHT + 8,
  },
  waveformBar: {
    // width / borderRadius set inline per bar
  },
  recordingTip: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  stopButtonOuter: {
    alignItems: 'center',
  },
  stopButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 2,
    borderColor: COLORS.recording,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: COLORS.recording,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  stopButtonSquare: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: COLORS.recording,
  },
  stopButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.recording,
  },

  // ── Phase 3: Review ────────────────────────────────────────────────────────
  reviewScrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 24,
  },
  transcriptCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.22)',
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  editLink: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
  },
  doneEditLink: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '700',
  },
  transcribingState: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  transcribingText: {
    fontSize: 14,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  transcriptText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },
  transcriptInput: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#12122A',
    textAlignVertical: 'top',
  },

  // Analysis card
  analysisCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.22)',
  },
  analysisLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  analyzingState: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  analyzingText: {
    fontSize: 14,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  analysisContent: {
    gap: 10,
  },
  vividnessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vividnessLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  vividnessScore: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  vividnessMax: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.muted,
  },
  vividnessTrack: {
    height: 8,
    backgroundColor: 'rgba(139,139,174,0.18)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
    marginBottom: 4,
  },
  vividnessFill: {
    height: '100%',
    borderRadius: 4,
  },
  analysisSummary: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 21,
    fontStyle: 'italic',
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
    paddingLeft: 10,
    marginTop: 4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  emotionChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  emotionChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  symbolTag: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(139,139,174,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139,139,174,0.25)',
  },
  symbolTagText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },

  // Error
  errorCard: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    lineHeight: 20,
  },

  // Review actions
  reviewActions: {
    gap: 12,
    marginTop: 4,
  },
  saveButtonOuter: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  reRecordButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139,139,174,0.35)',
  },
  reRecordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.muted,
  },

  // ── Phase 4: Saving ────────────────────────────────────────────────────────
  savingContainer: {
    alignItems: 'center',
    gap: 14,
  },
  savingText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  savingSubtext: {
    fontSize: 14,
    color: COLORS.muted,
  },

  // ── Phase 5: Success ───────────────────────────────────────────────────────
  successContainer: {
    alignItems: 'center',
    gap: 14,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(16,185,129,0.50)',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  successCheck: {
    fontSize: 44,
    color: COLORS.success,
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
  },
});
