import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Share, PanResponder, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDreamStore } from '../../store';
import { getDreamById, deleteDream as deleteDreamFromDB } from '../../services/supabase';
import { COLORS, MOODS, SYMBOLS } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function MoodPill({ mood }) {
  const m = MOODS[mood] || MOODS.calm;
  return (
    <View style={[styles.pill, { backgroundColor: m.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: m.color }]} />
      <Text style={[styles.pillText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

function SymbolTag({ name }) {
  const s = SYMBOLS[name] || { color: COLORS.ink3, bg: COLORS.line };
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.pillText, { color: s.color }]}>{name}</Text>
    </View>
  );
}

export default function DreamDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { dreamId } = route.params || {};

  const { dreams: storeDreams, removeDream } = useDreamStore();
  const dreams = storeDreams || [];

  const [curIdx, setCurIdx] = useState(() => {
    const idx = dreams.findIndex(d => d.id === dreamId);
    return idx >= 0 ? idx : 0;
  });
  const [dream, setDream] = useState(null);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fav, setFav] = useState(false);

  const swipeRef = useRef(null);
  const touchStartX = useRef(null);

  const loadDream = useCallback(async (id) => {
    setLoading(true);
    try {
      const data = await getDreamById(id);
      if (data) {
        setDream(data.dream || data);
        setTags(data.tags || []);
      }
    } catch {
      const fallback = dreams[curIdx];
      if (fallback) {
        setDream(fallback);
        setTags(fallback.dream_tags || []);
      }
    } finally {
      setLoading(false);
    }
  }, [curIdx, dreams]);

  useEffect(() => {
    const targetId = dreams[curIdx]?.id;
    if (targetId) loadDream(targetId);
  }, [curIdx]);

  const curDream = dream || dreams[curIdx];

  const handleDelete = () => {
    Alert.alert('Delete dream?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteDreamFromDB(curDream.id);
            removeDream(curDream.id);
          } catch {}
          navigation.goBack();
        },
      },
    ]);
  };

  const handleShare = () => {
    navigation.navigate('ShareCard', { dreamId: curDream?.id });
  };

  const handleSwipe = (dx) => {
    if (dx > 60 && curIdx > 0) setCurIdx(i => i - 1);
    else if (dx < -60 && curIdx < dreams.length - 1) setCurIdx(i => i + 1);
  };

  const emotions = tags.filter(t => t.type === 'emotion');
  const symbols = tags.filter(t => t.type === 'symbol');

  const mood = curDream?.mood || (emotions[0]?.label?.toLowerCase()) || 'calm';
  const symbolNames = symbols.map(t => t.label?.toLowerCase()).filter(Boolean);

  const formatDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch { return d; }
  };

  const formatTime = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const prevDream = curIdx > 0 ? dreams[curIdx - 1] : null;
  const nextDream = curIdx < dreams.length - 1 ? dreams[curIdx + 1] : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Sticky header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.circleBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerCount}>{curIdx + 1} of {dreams.length}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => setFav(v => !v)}>
            <Text style={[styles.circleBtnText, { color: fav ? COLORS.peach : COLORS.ink2 }]}>
              {fav ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.circleBtn, { marginLeft: 8 }]} onPress={handleShare}>
            <Text style={styles.circleBtnText}>↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onTouchStart={e => { touchStartX.current = e.nativeEvent.pageX; }}
        onTouchEnd={e => {
          if (touchStartX.current != null) {
            handleSwipe(e.nativeEvent.pageX - touchStartX.current);
            touchStartX.current = null;
          }
        }}
      >
        {/* Date + time */}
        <Text style={styles.meta}>
          {formatDate(curDream?.recorded_at)} · {formatTime(curDream?.recorded_at)}
          {curDream?.vividness_score ? ` · ${curDream.vividness_score}/10 vividness` : ''}
        </Text>

        {/* Title */}
        <Text style={styles.title}>
          {curDream?.ai_summary?.split('.')[0] || 'Untitled dream'}
        </Text>

        {/* Pills */}
        <View style={styles.pills}>
          <MoodPill mood={mood} />
          {symbolNames.slice(0, 4).map(s => <SymbolTag key={s} name={s} />)}
        </View>

        {/* Body */}
        <View style={styles.bodyBlock}>
          {(curDream?.transcript || curDream?.ai_summary || '').split('\n').filter(Boolean).map((p, i) => (
            <Text key={i} style={styles.bodyParagraph}>{p}</Text>
          ))}
        </View>

        {/* AI observation */}
        {symbolNames.length > 0 && (
          <View style={styles.observationCard}>
            <View style={styles.observationHeader}>
              <Text style={styles.observationStar}>✦</Text>
              <Text style={styles.observationLabel}>What we noticed</Text>
            </View>
            <Text style={styles.observationText}>
              {`"${symbolNames[0]}"${symbolNames[1] ? ` + "${symbolNames[1]}"` : ''} — this pairing has appeared across multiple entries, often linked to how you process transition and memory.`}
            </Text>
          </View>
        )}

        {/* Prev / Next nav */}
        <View style={styles.dreamNav}>
          <TouchableOpacity
            style={[styles.dreamNavBtn, !prevDream && styles.dreamNavBtnDisabled]}
            onPress={() => prevDream && setCurIdx(i => i - 1)}
            disabled={!prevDream}
          >
            <Text style={styles.dreamNavLabel}>← Earlier</Text>
            <Text style={[styles.dreamNavTitle, !prevDream && { color: COLORS.ink4 }]} numberOfLines={1}>
              {prevDream?.ai_summary?.split('.')[0] || '—'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dreamNavBtn, styles.dreamNavBtnRight, !nextDream && styles.dreamNavBtnDisabled]}
            onPress={() => nextDream && setCurIdx(i => i + 1)}
            disabled={!nextDream}
          >
            <Text style={[styles.dreamNavLabel, { textAlign: 'right' }]}>Later →</Text>
            <Text style={[styles.dreamNavTitle, !nextDream && { color: COLORS.ink4 }, { textAlign: 'right' }]} numberOfLines={1}>
              {nextDream?.ai_summary?.split('.')[0] || '—'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delete */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete this dream</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.line,
    backgroundColor: COLORS.bg,
  },
  circleBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  circleBtnText: { fontSize: 16, color: COLORS.ink },
  headerCount: { fontSize: 13, color: COLORS.ink3 },
  headerRight: { flexDirection: 'row' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  meta: { fontSize: 13, color: COLORS.ink3, marginBottom: 10 },
  title: {
    fontFamily: 'Lora_500Medium', fontSize: 34, fontWeight: '500',
    lineHeight: 40, letterSpacing: -0.5, color: COLORS.ink, marginBottom: 16,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 24 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  pillText: { fontSize: 13, fontWeight: '500' },
  bodyBlock: { marginBottom: 24 },
  bodyParagraph: {
    fontFamily: 'Lora_400Regular', fontSize: 18, lineHeight: 30,
    color: COLORS.ink, marginBottom: 18,
  },
  observationCard: {
    padding: 20, borderRadius: 16, marginBottom: 28,
    backgroundColor: COLORS.peach2,
  },
  observationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  observationStar: { fontSize: 16, marginRight: 6 },
  observationLabel: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  observationText: {
    fontFamily: 'Lora_400Regular', fontSize: 16, lineHeight: 24, color: COLORS.ink,
  },
  dreamNav: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  dreamNavBtn: {
    flex: 1, padding: 14, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
  },
  dreamNavBtnRight: {},
  dreamNavBtnDisabled: { opacity: 0.4 },
  dreamNavLabel: { fontSize: 11, color: COLORS.ink3, marginBottom: 4 },
  dreamNavTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 14, fontWeight: '500', color: COLORS.ink,
  },
  deleteBtn: { alignItems: 'center', paddingVertical: 16 },
  deleteBtnText: { fontSize: 14, color: COLORS.ink3 },
});
