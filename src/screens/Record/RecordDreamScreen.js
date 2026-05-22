// =============================================================================
// DreamDiary V3 — RecordDreamScreen (Capture)
// =============================================================================
// Warm paper / cream aesthetic with a peach→gold-tint→cream gradient bg.
// 4 phases: idle → rec → proc → done
// Hold-to-record button at the absolute bottom.
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
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
  PanResponder,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useDreamAnalysis } from '../../hooks/useDreamAnalysis';
import { useDreamStore } from '../../store';
import { saveDream, saveTags, uploadAudio } from '../../services/supabase';
import { getTopEmotion, getTopSymbols } from '../../utils';
import { COLORS, getMoodStyle, getSymbolStyle } from '../../constants/theme';

// =============================================================================
// Constants
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PHASES = {
  IDLE: 'idle',
  REC:  'rec',
  PROC: 'proc',
  DONE: 'done',
};

// =============================================================================
// Format seconds as mm:ss
// =============================================================================

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// =============================================================================
// Concentric breathing rings (rec phase)
// =============================================================================

function BreathingRings() {
  const s1 = useSharedValue(1);
  const s2 = useSharedValue(1);
  const s3 = useSharedValue(1);

  useEffect(() => {
    const ease = Easing.inOut(Easing.sine);
    s1.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1800, easing: ease }),
        withTiming(0.96, { duration: 1800, easing: ease }),
      ), -1, false
    );
    s2.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 300, easing: ease }),
        withTiming(1.08, { duration: 1800, easing: ease }),
        withTiming(0.94, { duration: 1800, easing: ease }),
      ), -1, false
    );
    s3.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: ease }),
        withTiming(1.10, { duration: 1800, easing: ease }),
        withTiming(0.92, { duration: 1800, easing: ease }),
      ), -1, false
    );
  }, []);

  const a1 = useAnimatedStyle(() => ({
    transform: [{ scale: s1.value }],
    opacity: 0.50,
  }));
  const a2 = useAnimatedStyle(() => ({
    transform: [{ scale: s2.value }],
    opacity: 0.35,
  }));
  const a3 = useAnimatedStyle(() => ({
    transform: [{ scale: s3.value }],
    opacity: 0.22,
  }));

  return (
    <View style={ringStyles.container}>
      {/* Outermost ring */}
      <Animated.View style={[ringStyles.ring, ringStyles.ring3, a3]} />
      {/* Middle ring */}
      <Animated.View style={[ringStyles.ring, ringStyles.ring2, a2]} />
      {/* Inner ring */}
      <Animated.View style={[ringStyles.ring, ringStyles.ring1, a1]} />
      {/* Core circle */}
      <View style={ringStyles.core} />
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    width:           220,
    height:          220,
    alignItems:      'center',
    justifyContent:  'center',
  },
  ring: {
    position:     'absolute',
    borderRadius: 999,
    borderWidth:  1,
    borderColor:  COLORS.peach,
  },
  ring1: {
    width:  160,
    height: 160,
  },
  ring2: {
    width:  190,
    height: 190,
  },
  ring3: {
    width:  220,
    height: 220,
  },
  core: {
    width:           100,
    height:          100,
    borderRadius:    50,
    backgroundColor: COLORS.peach,
    opacity:         0.85,
  },
});

// =============================================================================
// Pulsing proc circle
// =============================================================================

function ProcCircle() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.10, { duration: 900, easing: Easing.inOut(Easing.sine) }),
        withTiming(0.93, { duration: 900, easing: Easing.inOut(Easing.sine) }),
      ), -1, false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <LinearGradient
        colors={[COLORS.peach, COLORS.gold]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={procStyles.circle}
      />
    </Animated.View>
  );
}

const procStyles = StyleSheet.create({
  circle: {
    width:        90,
    height:       90,
    borderRadius: 45,
  },
});

// =============================================================================
// Hold-to-record button
// =============================================================================

function HoldButton({ phase, onHoldStart, onHoldEnd }) {
  const isHeld = phase === PHASES.REC;

  const scale = useSharedValue(1);

  // Gentle idle breathe
  useEffect(() => {
    if (phase === PHASES.IDLE) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.sine) }),
          withTiming(0.97, { duration: 1400, easing: Easing.inOut(Easing.sine) }),
        ), -1, false
      );
    } else {
      scale.value = withSpring(isHeld ? 1.06 : 1, { damping: 10, stiffness: 120 });
    }
  }, [phase]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // PanResponder for press-and-hold
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => false,
      onPanResponderGrant: () => {
        onHoldStart();
      },
      onPanResponderRelease: () => {
        onHoldEnd();
      },
      onPanResponderTerminate: () => {
        onHoldEnd();
      },
    })
  ).current;

  const isActive = isHeld;

  return (
    <View style={holdStyles.wrap}>
      <Animated.View
        style={[
          holdStyles.button,
          isActive
            ? {
                backgroundColor: COLORS.peach,
                shadowColor:     COLORS.peach,
                shadowOpacity:   0.5,
                shadowRadius:    24,
              }
            : {
                backgroundColor: COLORS.ink,
                shadowColor:     '#000',
                shadowOpacity:   0.30,
                shadowRadius:    16,
              },
          animStyle,
        ]}
        {...panResponder.panHandlers}
      >
        {/* Mic SVG-ish icon via Unicode */}
        <Text style={holdStyles.micIcon}>♪</Text>
      </Animated.View>
      <Text style={holdStyles.label}>
        {isActive ? 'Release to finish' : 'Hold to record'}
      </Text>
    </View>
  );
}

const holdStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap:        10,
  },
  button: {
    width:          96,
    height:         96,
    borderRadius:   48,
    alignItems:     'center',
    justifyContent: 'center',
    shadowOffset:   { width: 0, height: 8 },
    elevation:      10,
  },
  micIcon: {
    fontSize: 36,
    color:    COLORS.bg2,
  },
  label: {
    fontSize:  13,
    color:     COLORS.ink3,
    fontWeight: '500',
  },
});

// =============================================================================
// Phase: Idle
// =============================================================================

function IdlePhase() {
  return (
    <Animated.View
      entering={FadeIn.duration(350)}
      exiting={FadeOut.duration(200)}
      style={phaseStyles.centered}
    >
      <Text style={phaseStyles.headline}>
        {'Speak it before\nit dissolves.'}
      </Text>
      <Text style={phaseStyles.sub}>
        Hold the button below. Talk it through — we'll transcribe and tag it.
      </Text>
    </Animated.View>
  );
}

// =============================================================================
// Phase: Rec
// =============================================================================

function RecPhase({ duration }) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={phaseStyles.centered}
    >
      <BreathingRings />
      <Text style={[phaseStyles.sub, { marginTop: 24, fontStyle: 'italic' }]}>
        I'm listening…
      </Text>
      <Text style={phaseStyles.timer}>{formatDuration(duration)}</Text>
    </Animated.View>
  );
}

// =============================================================================
// Phase: Proc
// =============================================================================

function ProcPhase() {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={phaseStyles.centered}
    >
      <ProcCircle />
      <Text style={[phaseStyles.headline, { marginTop: 28, fontSize: 22 }]}>
        Reading the stars…
      </Text>
      <Text style={phaseStyles.procSub}>
        Transcribing · tagging · shelving
      </Text>
    </Animated.View>
  );
}

// =============================================================================
// Phase: Done
// =============================================================================

function DonePhase({ analysis, transcript, onSave, onReRecord }) {
  const tags       = analysis?.tags ?? [];
  const topEmotion = getTopEmotion(tags);
  const topSymbols = getTopSymbols(tags, 3);
  const moodStyle  = getMoodStyle(topEmotion?.label ?? null);

  const summary = analysis?.summary ?? transcript ?? '';
  const title   = analysis?.title   ?? 'The amber library';

  return (
    <Animated.View
      entering={ZoomIn.duration(400)}
      style={phaseStyles.doneWrap}
    >
      {/* White card */}
      <View style={doneStyles.card}>
        {/* Title */}
        <Text style={doneStyles.cardTitle}>{title}</Text>

        {/* Quote text with left border */}
        <View style={doneStyles.quoteWrap}>
          <View style={doneStyles.quoteBorder} />
          <Text style={doneStyles.quoteText} numberOfLines={6}>
            {summary || 'Your dream has been captured.'}
          </Text>
        </View>

        {/* Mood + symbol pills */}
        <View style={doneStyles.pillsRow}>
          {topEmotion && (
            <View
              style={[doneStyles.moodPill, { backgroundColor: moodStyle.bg }]}
            >
              <View
                style={[doneStyles.moodDot, { backgroundColor: moodStyle.color }]}
              />
              <Text style={[doneStyles.pillText, { color: moodStyle.color }]}>
                {moodStyle.label}
              </Text>
            </View>
          )}
          {topSymbols.map((sym) => {
            const symStyle = getSymbolStyle(sym.label);
            return (
              <View
                key={sym.id ?? sym.label}
                style={[doneStyles.symbolPill, { backgroundColor: symStyle.bg }]}
              >
                <Text style={[doneStyles.pillText, { color: symStyle.color }]}>
                  {sym.label.charAt(0).toUpperCase() + sym.label.slice(1)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={onSave}
          activeOpacity={0.88}
          style={doneStyles.saveBtn}
          accessibilityRole="button"
          accessibilityLabel="Save to journal"
        >
          <Text style={doneStyles.saveBtnText}>Save to journal</Text>
        </TouchableOpacity>

        {/* Re-record ghost button */}
        <TouchableOpacity
          onPress={onReRecord}
          activeOpacity={0.75}
          style={doneStyles.reRecordBtn}
          accessibilityRole="button"
          accessibilityLabel="Re-record"
        >
          <Text style={doneStyles.reRecordBtnText}>Re-record</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const doneStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius:    20,
    padding:         22,
    width:           '100%',
    maxWidth:        340,
    gap:             14,
  },
  cardTitle: {
    fontSize:   22,
    fontWeight: '500',
    color:      COLORS.ink,
    fontFamily: 'serif',
  },
  quoteWrap: {
    flexDirection: 'row',
    gap:           12,
  },
  quoteBorder: {
    width:           3,
    borderRadius:    2,
    backgroundColor: COLORS.peach,
    flexShrink:      0,
  },
  quoteText: {
    flex:       1,
    fontSize:   15,
    color:      COLORS.ink2,
    fontFamily: 'serif',
    lineHeight: 24,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  moodPill: {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      20,
    paddingVertical:   4,
    paddingHorizontal: 10,
    gap:               6,
  },
  moodDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  symbolPill: {
    borderRadius:      20,
    paddingVertical:   4,
    paddingHorizontal: 10,
  },
  pillText: {
    fontSize:   13,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: COLORS.ink,
    borderRadius:    999,
    height:          48,
    alignItems:      'center',
    justifyContent:  'center',
  },
  saveBtnText: {
    fontSize:   15,
    fontWeight: '500',
    color:      COLORS.bg2,
  },
  reRecordBtn: {
    backgroundColor: COLORS.card,
    borderRadius:    999,
    height:          44,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     COLORS.line2,
  },
  reRecordBtnText: {
    fontSize:   14,
    fontWeight: '500',
    color:      COLORS.ink,
  },
});

// Shared phase layout styles
const phaseStyles = StyleSheet.create({
  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap:            16,
  },
  doneWrap: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 20,
  },
  headline: {
    fontSize:   26,
    fontWeight: '500',
    color:      COLORS.ink,
    fontFamily: 'serif',
    textAlign:  'center',
    lineHeight: 36,
  },
  sub: {
    fontSize:  16,
    color:     COLORS.ink2,
    textAlign: 'center',
    lineHeight: 26,
  },
  timer: {
    fontSize:   22,
    fontWeight: '600',
    color:      COLORS.ink,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  procSub: {
    fontSize:  13,
    color:     COLORS.ink3,
    textAlign: 'center',
    marginTop: 8,
  },
});

// =============================================================================
// RecordDreamScreen
// =============================================================================

export default function RecordDreamScreen({ navigation }) {
  const user            = useDreamStore((s) => s.user);
  const addDream        = useDreamStore((s) => s.addDream);
  const setCurrentDream = useDreamStore((s) => s.setCurrentDream);

  const {
    isRecording,
    audioUri,
    duration,
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

  const [phase,    setPhase]    = useState(PHASES.IDLE);
  const [saveError, setSaveError] = useState(null);

  const savedDreamRef      = useRef(null);
  const autoNavigateTimer  = useRef(null);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (autoNavigateTimer.current) clearTimeout(autoNavigateTimer.current);
      resetAnalysis();
    };
  }, []);

  // ── Watch for analysis completion → move to done ─────────────────────────
  useEffect(() => {
    if (phase === PHASES.PROC && !isTranscribing && !isAnalyzing && (transcript || analysis)) {
      setPhase(PHASES.DONE);
    }
  }, [phase, isTranscribing, isAnalyzing, transcript, analysis]);

  // ── Hold start → begin recording ────────────────────────────────────────
  const handleHoldStart = useCallback(async () => {
    if (phase !== PHASES.IDLE) return;
    setSaveError(null);
    await startRecording();
    setPhase(PHASES.REC);
  }, [phase, startRecording]);

  // ── Hold end → stop recording + start analysis ───────────────────────────
  const handleHoldEnd = useCallback(async () => {
    if (phase !== PHASES.REC) return;
    const uri = await stopRecording();
    if (!uri) {
      setPhase(PHASES.IDLE);
      return;
    }
    setPhase(PHASES.PROC);
    await analyzeAudio(uri);
  }, [phase, stopRecording, analyzeAudio]);

  // ── Re-record ────────────────────────────────────────────────────────────
  const handleReRecord = useCallback(() => {
    clearRecording();
    resetAnalysis();
    setSaveError(null);
    setPhase(PHASES.IDLE);
  }, [clearRecording, resetAnalysis]);

  // ── Save dream ───────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaveError(null);

    try {
      let audioUrl = null;
      if (audioUri) {
        try {
          audioUrl = await uploadAudio(user.id, audioUri);
        } catch (uploadErr) {
          console.warn('[RecordDreamScreen] Audio upload failed:', uploadErr);
        }
      }

      const dreamPayload = {
        user_id:         user.id,
        transcript:      transcript ?? '',
        audio_url:       audioUrl,
        recorded_at:     new Date().toISOString(),
        ai_summary:      analysis?.summary ?? null,
        vividness_score: analysis?.vividness_score ?? null,
        title:           analysis?.title ?? null,
        is_favourite:    false,
      };

      const newDream = await saveDream(dreamPayload);

      if (analysis?.tags?.length > 0 && newDream?.id) {
        try {
          const tagsPayload = analysis.tags.map((tag) => ({
            dream_id:         newDream.id,
            type:             tag.type,
            label:            tag.label,
            confidence_score: tag.confidence_score ?? null,
          }));
          const savedTags = await saveTags(tagsPayload);
          newDream.dream_tags = savedTags;
        } catch (tagErr) {
          console.warn('[RecordDreamScreen] Tag save failed:', tagErr);
        }
      }

      addDream(newDream);
      setCurrentDream(newDream);
      savedDreamRef.current = newDream;

      // Navigate to DreamDetail after brief delay
      autoNavigateTimer.current = setTimeout(() => {
        if (savedDreamRef.current) {
          navigation.replace('DreamDetail', { dreamId: savedDreamRef.current.id });
        }
      }, 300);
    } catch (err) {
      console.error('[RecordDreamScreen] Save failed:', err);
      setSaveError(err?.message ?? 'Failed to save dream. Please try again.');
    }
  }, [
    user?.id,
    audioUri,
    transcript,
    analysis,
    addDream,
    setCurrentDream,
    navigation,
  ]);

  // ── Close handler ─────────────────────────────────────────────────────────
  const handleClose = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    }
    clearRecording();
    resetAnalysis();
    navigation.goBack();
  }, [isRecording, stopRecording, clearRecording, resetAnalysis, navigation]);

  // ── Phase label in header ─────────────────────────────────────────────────
  const phaseLabel = {
    [PHASES.IDLE]: 'Capture a dream',
    [PHASES.REC]:  formatDuration(duration),
    [PHASES.PROC]: 'Listening to your stars…',
    [PHASES.DONE]: 'Your dream',
  }[phase];

  const showHoldButton = phase === PHASES.IDLE || phase === PHASES.REC;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Background gradient */}
      <LinearGradient
        colors={['#fde8dc', '#f5e8d4', '#ece5d6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <Animated.View entering={FadeIn.duration(350)} style={styles.header}>
          {/* Close button */}
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeBtnText}>×</Text>
          </TouchableOpacity>

          {/* Phase label */}
          <Text style={styles.phaseLabel}>{phaseLabel}</Text>

          {/* Spacer */}
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* ── Phase content ── */}
        <View style={styles.phaseArea}>
          {phase === PHASES.IDLE && <IdlePhase />}
          {phase === PHASES.REC  && <RecPhase duration={duration} />}
          {phase === PHASES.PROC && <ProcPhase />}
          {phase === PHASES.DONE && (
            <DonePhase
              analysis={analysis}
              transcript={transcript}
              onSave={handleSave}
              onReRecord={handleReRecord}
            />
          )}
        </View>

        {/* ── Save error ── */}
        {saveError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{saveError}</Text>
          </View>
        )}

        {/* ── Hold-to-record button ── */}
        {showHoldButton && (
          <View style={styles.holdWrap}>
            <HoldButton
              phase={phase}
              onHoldStart={handleHoldStart}
              onHoldEnd={handleHoldEnd}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    position:       'absolute',
    top:            Platform.OS === 'ios' ? 56 : 32,
    left:           0,
    right:          0,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex:         10,
  },
  closeBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: 'rgba(255,255,255,0.60)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  closeBtnText: {
    fontSize:   22,
    color:      COLORS.ink,
    fontWeight: '400',
    lineHeight: 26,
  },
  phaseLabel: {
    fontSize:   15,
    fontWeight: '500',
    color:      COLORS.ink2,
    textAlign:  'center',
  },
  headerSpacer: {
    width: 36,
  },

  // ── Phase area ───────────────────────────────────────────────────────────────
  phaseArea: {
    flex:              1,
    paddingTop:        120, // clear the absolute header
    paddingBottom:     180, // clear the hold button
  },

  // ── Hold button ──────────────────────────────────────────────────────────────
  holdWrap: {
    position:        'absolute',
    bottom:          70,
    left:            0,
    right:           0,
    alignItems:      'center',
  },

  // ── Error banner ─────────────────────────────────────────────────────────────
  errorBanner: {
    position:          'absolute',
    bottom:            180,
    left:              20,
    right:             20,
    backgroundColor:   '#fde8dc',
    borderRadius:      12,
    padding:           12,
    borderWidth:       1,
    borderColor:       COLORS.peach,
  },
  errorText: {
    fontSize:  13,
    color:     COLORS.ink2,
    textAlign: 'center',
  },
});
