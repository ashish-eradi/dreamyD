// =============================================================================
// DreamDiary — RecordDreamScreen
// Design: dark night capture screen matching DreamDiary.html VoiceCapture
// Phases: idle → recording → transcribing → review
// =============================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Platform, PanResponder, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay, withSpring,
  Easing, FadeIn, FadeOut, ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAudioRecorder }  from '../../hooks/useAudioRecorder';
import { useDreamAnalysis }  from '../../hooks/useDreamAnalysis';
import { useDreamStore }     from '../../store';
import { saveDream, saveTags, uploadAudio } from '../../services/supabase';
import { getTopEmotion, getTopSymbols }     from '../../utils';
import { getMoodStyle, getSymbolStyle }     from '../../constants/theme';

const { width: SW } = Dimensions.get('window');

const PHASES = { IDLE: 'idle', REC: 'rec', PROC: 'proc', DONE: 'done' };

function fmt(s) {
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}

// ─── Star positions (deterministic) ──────────────────────────────────────────

const STARS = [
  { x:'6%',  y:'8%',  sz:2, delay:0    },
  { x:'18%', y:'5%',  sz:1, delay:700  },
  { x:'34%', y:'11%', sz:2, delay:1300 },
  { x:'52%', y:'4%',  sz:1, delay:400  },
  { x:'67%', y:'14%', sz:2, delay:900  },
  { x:'83%', y:'6%',  sz:1, delay:1600 },
  { x:'92%', y:'20%', sz:2, delay:200  },
  { x:'4%',  y:'28%', sz:1, delay:1100 },
  { x:'14%', y:'22%', sz:2, delay:500  },
  { x:'76%', y:'30%', sz:1, delay:800  },
  { x:'90%', y:'45%', sz:2, delay:1400 },
  { x:'8%',  y:'55%', sz:1, delay:300  },
  { x:'30%', y:'70%', sz:2, delay:1000 },
  { x:'60%', y:'80%', sz:1, delay:600  },
  { x:'85%', y:'72%', sz:2, delay:1700 },
  { x:'45%', y:'90%', sz:1, delay:250  },
  { x:'20%', y:'85%', sz:2, delay:950  },
  { x:'72%', y:'92%', sz:1, delay:1200 },
  { x:'96%', y:'60%', sz:2, delay:450  },
  { x:'50%', y:'50%', sz:1, delay:1500 },
];

function Star({ x, y, sz, delay }) {
  const op = useSharedValue(0.2);
  useEffect(() => {
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1,   { duration: 1400 }),
        withTiming(0.15,{ duration: 1400 }),
      ), -1, false
    ));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View style={[style, {
      position:'absolute', left:x, top:y,
      width:sz, height:sz, borderRadius:sz/2, backgroundColor:'#ffffff',
    }]} />
  );
}

function StarField() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARS.map((s,i) => <Star key={i} {...s} />)}
    </View>
  );
}

// ─── Waveform (recording phase) ───────────────────────────────────────────────

function Waveform({ duration }) {
  const bars = 28;
  return (
    <View style={styles.waveform}>
      {[...Array(bars)].map((_,i) => {
        const h = 8 + Math.abs(Math.sin(duration * 4 + i * 0.7)) * 38 + (i % 5) * 4;
        return (
          <View key={i} style={[styles.waveBar, { height: Math.min(h, 54) }]} />
        );
      })}
    </View>
  );
}

// ─── Pulsing transcribing circle ──────────────────────────────────────────────

function TranscribingCircle() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.90, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[animStyle, styles.transcribeCircle]}>
      <LinearGradient
        colors={['#fff5d9','#f0c876','#c98f3d']}
        start={{ x:0.32, y:0.32 }}
        end={{ x:1, y:1 }}
        style={styles.transcribeCircleGrad}
      />
    </Animated.View>
  );
}

// ─── Moon hold-to-record button ───────────────────────────────────────────────

function MoonButton({ phase, onHoldStart, onHoldEnd }) {
  const isHeld  = phase === PHASES.REC;
  const scale   = useSharedValue(1);
  const glow    = useSharedValue(0);

  useEffect(() => {
    if (phase === PHASES.IDLE) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.97, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ), -1, false
      );
      glow.value = withTiming(0, { duration: 200 });
    } else {
      scale.value = withSpring(isHeld ? 1.08 : 1, { damping: 10 });
      glow.value  = withTiming(isHeld ? 1 : 0, { duration: 200 });
    }
  }, [phase]);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: isHeld ? 0.55 : 0.35,
    shadowRadius:  isHeld ? 40 : 24,
  }));

  const panRef = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => false,
    onPanResponderGrant:     onHoldStart,
    onPanResponderRelease:   onHoldEnd,
    onPanResponderTerminate: onHoldEnd,
  })).current;

  return (
    <Animated.View
      style={[styles.moonBtn, btnStyle, {
        shadowColor: isHeld ? '#e9a78a' : '#f5d896',
      }]}
      {...panRef.panHandlers}
    >
      <LinearGradient
        colors={isHeld
          ? ['#fff5d9','#e9a78a','#d68a6b']
          : ['#fff5d9','#f0c876','#c98f3d']
        }
        start={{ x:0.32, y:0.32 }}
        end={{ x:1, y:1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// ─── Review card (done phase) ─────────────────────────────────────────────────

function ReviewCard({ analysis, transcript, aiUnavailable, onSave, onReRecord }) {
  const tags       = analysis?.tags ?? [];
  const topEmotion = getTopEmotion(tags);
  const topSymbols = getTopSymbols(tags, 3);
  const moodStyle  = getMoodStyle(topEmotion?.label ?? null);
  const summary    = analysis?.summary ?? transcript ?? '';
  const title      = analysis?.title   ?? 'Untitled dream';

  return (
    <Animated.View entering={ZoomIn.duration(380)} style={styles.reviewWrap}>
      <Text style={styles.reviewTitle}>{title}</Text>

      {/* Frosted transcript card */}
      <View style={styles.reviewCard}>
        {aiUnavailable ? (
          <Text style={[styles.reviewText, { opacity: 0.5 }]}>
            Audio captured. AI transcription is not available yet — your dream will be saved with the recording.
          </Text>
        ) : (
          <Text style={styles.reviewText} numberOfLines={5}>
            {summary || 'Your dream has been captured.'}
          </Text>
        )}
      </View>

      {/* Tags */}
      <View style={styles.reviewTags}>
        {topEmotion && (
          <View style={[styles.tag, styles.moodTag]}>
            <View style={[styles.tagDot, { backgroundColor: moodStyle.color }]} />
            <Text style={[styles.tagText, { color: '#f7f3ec' }]}>{moodStyle.label}</Text>
          </View>
        )}
        {topSymbols.map(sym => (
          <View key={sym.id ?? sym.label} style={[styles.tag, styles.symbolTag]}>
            <Text style={[styles.tagText, { color: '#f5d896' }]}>
              ✦ {sym.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <TouchableOpacity onPress={onSave} activeOpacity={0.88} style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>Save to journal</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onReRecord} activeOpacity={0.75} style={styles.reRecordBtn}>
        <Text style={styles.reRecordBtnText}>Re-record</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── RecordDreamScreen ────────────────────────────────────────────────────────

export default function RecordDreamScreen({ navigation }) {
  const insets         = useSafeAreaInsets();
  const user           = useDreamStore((s) => s.user);
  const addDream       = useDreamStore((s) => s.addDream);
  const setCurrentDream= useDreamStore((s) => s.setCurrentDream);

  const { isRecording, audioUri, duration, startRecording, stopRecording, clearRecording } =
    useAudioRecorder();
  const { transcript, analysis, isTranscribing, isAnalyzing, error: analysisError, analyzeAudio, reset: resetAnalysis } =
    useDreamAnalysis();

  const [phase,     setPhase]     = useState(PHASES.IDLE);
  const [saveError, setSaveError] = useState(null);
  const savedRef   = useRef(null);
  const timerRef   = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    resetAnalysis();
  }, []);

  useEffect(() => {
    if (phase !== PHASES.PROC) return;
    if (isTranscribing || isAnalyzing) return;
    // Advance to DONE whether AI succeeded or failed — let user save the raw audio
    if (transcript || analysis || analysisError) {
      setPhase(PHASES.DONE);
    }
  }, [phase, isTranscribing, isAnalyzing, transcript, analysis, analysisError]);

  const handleHoldStart = useCallback(async () => {
    if (phase !== PHASES.IDLE) return;
    setSaveError(null);
    await startRecording();
    setPhase(PHASES.REC);
  }, [phase, startRecording]);

  const handleHoldEnd = useCallback(async () => {
    if (phase !== PHASES.REC) return;
    const uri = await stopRecording();
    if (!uri) { setPhase(PHASES.IDLE); return; }
    setPhase(PHASES.PROC);
    const result = await analyzeAudio(uri);
    // If analyzeAudio returns null without setting an error (e.g. aborted),
    // fall through to DONE so the user can still save the raw audio.
    if (!result) setPhase(PHASES.DONE);
  }, [phase, stopRecording, analyzeAudio]);

  const handleReRecord = useCallback(() => {
    clearRecording(); resetAnalysis(); setSaveError(null); setPhase(PHASES.IDLE);
  }, [clearRecording, resetAnalysis]);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaveError(null);
    try {
      let audioUrl = null;
      if (audioUri) {
        try { audioUrl = await uploadAudio(user.id, audioUri); } catch {}
      }
      const dream = await saveDream({
        user_id:         user.id,
        transcript:      transcript ?? '',
        audio_url:       audioUrl,
        recorded_at:     new Date().toISOString(),
        ai_summary:      analysis?.summary ?? null,
        vividness_score: analysis?.vividness_score ?? null,
        title:           analysis?.title ?? null,
        is_favourite:    false,
      });
      if (analysis?.tags?.length > 0 && dream?.id) {
        try {
          const saved = await saveTags(analysis.tags.map(t => ({
            dream_id: dream.id, type: t.type, label: t.label,
            confidence_score: t.confidence_score ?? null,
          })));
          dream.dream_tags = saved;
        } catch {}
      }
      addDream(dream);
      setCurrentDream(dream);
      savedRef.current = dream;
      timerRef.current = setTimeout(() => {
        if (savedRef.current)
          navigation.replace('DreamDetail', { dreamId: savedRef.current.id });
      }, 300);
    } catch (err) {
      setSaveError(err?.message ?? 'Failed to save. Please try again.');
    }
  }, [user?.id, audioUri, transcript, analysis, addDream, setCurrentDream, navigation]);

  const handleClose = useCallback(async () => {
    if (isRecording) await stopRecording();
    clearRecording(); resetAnalysis();
    navigation.goBack();
  }, [isRecording, stopRecording, clearRecording, resetAnalysis, navigation]);

  const showMoon = phase === PHASES.IDLE || phase === PHASES.REC;

  const phaseLabel = {
    [PHASES.IDLE]: 'New dream',
    [PHASES.REC]:  'Recording',
    [PHASES.PROC]: 'Transcribing',
    [PHASES.DONE]: 'Review',
  }[phase];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Night sky background */}
      <LinearGradient
        colors={['#1c1733','#2a2350']}
        start={{ x:0, y:0 }} end={{ x:0, y:1 }}
        style={StyleSheet.absoluteFill}
      />
      <StarField />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.phaseLabel}>{phaseLabel}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── IDLE ── */}
      {phase === PHASES.IDLE && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.centerArea}>
          <Text style={styles.idleHeadline}>What did you dream?</Text>
          <Text style={styles.idleSub}>Hold the moon and speak.{'\n'}We'll do the rest.</Text>
        </Animated.View>
      )}

      {/* ── RECORDING ── */}
      {phase === PHASES.REC && (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={styles.centerArea}>
          <Text style={styles.recTimer}>{fmt(duration)}</Text>
          <Text style={styles.recSub}>Listening… release when finished</Text>
          <Waveform duration={duration} />
        </Animated.View>
      )}

      {/* ── TRANSCRIBING ── */}
      {phase === PHASES.PROC && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.centerArea}>
          <TranscribingCircle />
          <Text style={styles.procTitle}>Transcribing…</Text>
          <Text style={styles.procSub}>Cleaning filler words and tagging symbols</Text>
        </Animated.View>
      )}

      {/* ── REVIEW ── */}
      {phase === PHASES.DONE && (
        <View style={styles.centerArea}>
          <ReviewCard
            analysis={analysis}
            transcript={transcript}
            aiUnavailable={!analysis && !transcript}
            onSave={handleSave}
            onReRecord={handleReRecord}
          />
          {saveError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Moon button ── */}
      {showMoon && (
        <View style={[styles.moonWrap, { paddingBottom: insets.bottom + 32 }]}>
          <MoonButton
            phase={phase}
            onHoldStart={handleHoldStart}
            onHoldEnd={handleHoldEnd}
          />
          {phase === PHASES.IDLE && (
            <Text style={styles.holdLabel}>Hold to speak</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, zIndex: 10,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16, color: '#f7f3ec', fontWeight: '400' },
  phaseLabel: {
    fontSize: 12, fontWeight: '600', color: 'rgba(247,243,236,0.55)',
    letterSpacing: 0.06, textTransform: 'uppercase',
  },

  // Content area
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 200,
    gap: 16,
  },

  // Idle
  idleHeadline: {
    fontFamily: 'Lora_500Medium', fontSize: 26,
    color: '#f7f3ec', textAlign: 'center',
    lineHeight: 34, marginBottom: 4,
  },
  idleSub: {
    fontSize: 13, color: 'rgba(247,243,236,0.55)',
    textAlign: 'center', lineHeight: 20,
  },

  // Recording
  recTimer: {
    fontFamily: 'Lora_500Medium', fontSize: 56,
    color: '#f5d896', letterSpacing: -0.02,
    fontVariant: ['tabular-nums'],
  },
  recSub: {
    fontSize: 13, color: 'rgba(247,243,236,0.65)', marginBottom: 20,
  },
  waveform: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, height: 60,
  },
  waveBar: {
    width: 3, borderRadius: 2,
    backgroundColor: '#f5d896',
    opacity: 0.75,
  },

  // Transcribing
  transcribeCircle: { marginBottom: 8 },
  transcribeCircleGrad: { width: 80, height: 80, borderRadius: 40 },
  procTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 22,
    color: '#f7f3ec', marginBottom: 4,
  },
  procSub: {
    fontSize: 13, color: 'rgba(247,243,236,0.55)', textAlign: 'center',
  },

  // Review
  reviewWrap: { width: '100%', maxWidth: 340, alignItems: 'stretch' },
  reviewTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 22,
    color: '#f7f3ec', marginBottom: 14,
  },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18, padding: 16, marginBottom: 16,
  },
  reviewText: {
    fontSize: 14, lineHeight: 22,
    color: 'rgba(247,243,236,0.85)',
    fontFamily: 'Lora_400Regular',
  },
  reviewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 22 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, gap: 5,
  },
  moodTag:   { backgroundColor: 'rgba(185,168,228,0.2)' },
  symbolTag: { backgroundColor: 'rgba(245,216,150,0.15)' },
  tagDot:    { width: 5, height: 5, borderRadius: 3 },
  tagText:   { fontSize: 11, fontWeight: '500' },

  saveBtn: {
    height: 50, borderRadius: 25,
    backgroundColor: '#f5d896',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#1c1733' },
  reRecordBtn: {
    height: 44, borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  reRecordBtnText: { fontSize: 13, color: 'rgba(247,243,236,0.6)' },

  // Moon button
  moonWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', gap: 12,
  },
  moonBtn: {
    width: 110, height: 110, borderRadius: 55,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  holdLabel: {
    fontSize: 11, color: 'rgba(247,243,236,0.4)',
    letterSpacing: 0.06, textTransform: 'uppercase',
  },

  // Error
  errorBanner: {
    marginTop: 12, padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,100,100,0.15)',
    borderWidth: 0.5, borderColor: 'rgba(255,100,100,0.3)',
  },
  errorText: { fontSize: 12, color: '#ffaaaa', textAlign: 'center' },
});
