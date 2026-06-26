import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { useDreamStore } from '../../store';
import { COLORS, SYMBOLS } from '../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_W = SCREEN_W - 40;
const MAP_H = 360;

// ─── Deterministic positions for known symbols ────────────────────────────────
// Fixed so the map looks the same every render (no Math.random).

const SYMBOL_POS = {
  water:   { x: 0.25, y: 0.28 },
  ocean:   { x: 0.50, y: 0.17 },
  people:  { x: 0.61, y: 0.43 },
  school:  { x: 0.22, y: 0.56 },
  house:   { x: 0.78, y: 0.63 },
  falling: { x: 0.44, y: 0.76 },
  flying:  { x: 0.19, y: 0.82 },
  light:   { x: 0.81, y: 0.33 },
  forest:  { x: 0.69, y: 0.87 },
  chase:   { x: 0.36, y: 0.48 },
  door:    { x: 0.56, y: 0.62 },
  lost:    { x: 0.33, y: 0.72 },
};

// Fallback positions for symbols not in SYMBOL_POS
const EXTRA_POS = [
  { x: 0.88, y: 0.20 }, { x: 0.14, y: 0.38 }, { x: 0.70, y: 0.22 },
  { x: 0.42, y: 0.55 }, { x: 0.58, y: 0.80 }, { x: 0.28, y: 0.88 },
  { x: 0.80, y: 0.75 }, { x: 0.10, y: 0.70 }, { x: 0.92, y: 0.50 },
  { x: 0.48, y: 0.35 },
];

// Default constellation shown when there are no real dreams yet
const DEFAULT_NODES = [
  { name: 'water',   x: 0.25, y: 0.28, r: 30 },
  { name: 'people',  x: 0.61, y: 0.43, r: 34 },
  { name: 'house',   x: 0.78, y: 0.63, r: 24 },
  { name: 'falling', x: 0.44, y: 0.76, r: 22 },
  { name: 'flying',  x: 0.19, y: 0.82, r: 20 },
  { name: 'light',   x: 0.81, y: 0.33, r: 28 },
  { name: 'forest',  x: 0.69, y: 0.87, r: 18 },
  { name: 'chase',   x: 0.36, y: 0.48, r: 22 },
];
const DEFAULT_EDGES = [
  ['water','people'],['people','house'],['people','chase'],
  ['chase','falling'],['falling','flying'],['house','forest'],['light','people'],
];

// ─── Pre-defined star positions (deterministic — no Math.random at render) ───

const STAR_POSITIONS = [
  { x: '7%',  y: '8%',  size: 2, delay: 0 },
  { x: '18%', y: '4%',  size: 1, delay: 600 },
  { x: '33%', y: '10%', size: 2, delay: 1200 },
  { x: '52%', y: '6%',  size: 1, delay: 300 },
  { x: '67%', y: '13%', size: 2, delay: 900 },
  { x: '82%', y: '5%',  size: 1, delay: 1500 },
  { x: '91%', y: '18%', size: 2, delay: 200 },
  { x: '4%',  y: '32%', size: 1, delay: 800 },
  { x: '13%', y: '20%', size: 2, delay: 400 },
  { x: '29%', y: '38%', size: 1, delay: 1100 },
  { x: '72%', y: '25%', size: 2, delay: 700 },
  { x: '88%', y: '42%', size: 1, delay: 1400 },
  { x: '57%', y: '30%', size: 2, delay: 100 },
  { x: '40%', y: '60%', size: 1, delay: 1000 },
  { x: '8%',  y: '68%', size: 2, delay: 500 },
  { x: '93%', y: '60%', size: 1, delay: 1300 },
  { x: '76%', y: '78%', size: 2, delay: 250 },
  { x: '30%', y: '88%', size: 1, delay: 850 },
  { x: '55%', y: '92%', size: 2, delay: 650 },
  { x: '85%', y: '90%', size: 1, delay: 1600 },
  { x: '47%', y: '45%', size: 1, delay: 450 },
  { x: '62%', y: '72%', size: 2, delay: 950 },
  { x: '15%', y: '50%', size: 1, delay: 1700 },
  { x: '97%', y: '35%', size: 2, delay: 350 },
  { x: '24%', y: '74%', size: 1, delay: 1050 },
];

// ─── Single twinkling star ────────────────────────────────────────────────────

function TwinkleStar({ x, y, size, delay }) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1,    { duration: 1200 }),
          withTiming(0.2,  { duration: 1200 }),
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(opacity);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          left: x, top: y,
          width: size, height: size,
          borderRadius: size / 2,
          backgroundColor: '#ffffff',
        },
      ]}
    />
  );
}

// ─── Star field ───────────────────────────────────────────────────────────────

function StarField() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STAR_POSITIONS.map((s, i) => (
        <TwinkleStar key={i} x={s.x} y={s.y} size={s.size} delay={s.delay} />
      ))}
    </View>
  );
}

// ─── DreamscapeMap screen ─────────────────────────────────────────────────────

export default function DreamscapeMapScreen() {
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();
  const [selected, setSelected] = useState(null);
  const dreams      = useDreamStore(s => s.dreams) || [];
  const isPremium   = useDreamStore(s => s.isPremium);

  const dreamsForSym = (sym) =>
    dreams.filter(d => (d.dream_tags || []).some(
      t => t.type === 'symbol' && t.label?.toLowerCase() === sym
    ));

  // Build nodes from real symbol frequencies; fall back to defaults if no data
  const nodes = useMemo(() => {
    const counts = {};
    dreams.forEach(d => {
      (d.dream_tags ?? []).filter(t => t.type === 'symbol' && t.label).forEach(t => {
        const k = t.label.toLowerCase();
        counts[k] = (counts[k] || 0) + 1;
      });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (sorted.length === 0) return DEFAULT_NODES;

    let extraIdx = 0;
    return sorted.map(([name, count]) => {
      const pos = SYMBOL_POS[name] ?? EXTRA_POS[extraIdx++ % EXTRA_POS.length];
      const r   = Math.min(40, Math.max(18, 18 + count * 4));
      return { name, x: pos.x, y: pos.y, r, count };
    });
  }, [dreams]);

  // Build edges from symbol co-occurrence within the same dream
  const edges = useMemo(() => {
    if (dreams.length === 0) return DEFAULT_EDGES;
    const coOccur = {};
    dreams.forEach(d => {
      const syms = [...new Set(
        (d.dream_tags ?? [])
          .filter(t => t.type === 'symbol' && t.label)
          .map(t => t.label.toLowerCase())
      )];
      for (let i = 0; i < syms.length; i++) {
        for (let j = i + 1; j < syms.length; j++) {
          const key = [syms[i], syms[j]].sort().join('|');
          coOccur[key] = (coOccur[key] || 0) + 1;
        }
      }
    });
    const nodeNames = new Set(nodes.map(n => n.name));
    return Object.entries(coOccur)
      .filter(([key]) => { const [a, b] = key.split('|'); return nodeNames.has(a) && nodeNames.has(b); })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([key]) => key.split('|'));
  }, [dreams, nodes]);

  const byName = Object.fromEntries(nodes.map(n => [n.name, n]));
  const nodeX  = (n) => n.x * MAP_W;
  const nodeY  = (n) => n.y * MAP_H;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.circleBtnText}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
        <Text style={styles.headerTitle}>Symbol map</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sub}>
          {dreams.length > 0 ? `${dreams.length} dream${dreams.length !== 1 ? 's' : ''} · last 90 days` : 'No dreams yet'}
        </Text>
        <Text style={styles.pageTitle}>Your patterns</Text>

        {/* ── Constellation map on night canvas with stars ── */}
        <View style={styles.mapCard}>
          {/* Dark sky background */}
          <View style={styles.nightSky}>
            <StarField />

            {/* SVG constellation */}
            <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
              {/* Edges */}
              {edges.map(([a, b], i) => {
                const na = byName[a], nb = byName[b];
                if (!na || !nb) return null;
                const active = selected && (a === selected || b === selected);
                return (
                  <Line
                    key={i}
                    x1={nodeX(na)} y1={nodeY(na)}
                    x2={nodeX(nb)} y2={nodeY(nb)}
                    stroke={active ? '#f5d896' : 'rgba(185,168,228,0.3)'}
                    strokeWidth={active ? 1.5 : 0.8}
                    strokeDasharray={active ? undefined : '4 3'}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map(n => {
                const isActive = selected === n.name;
                const isDim    = selected && !isActive;
                const sym      = SYMBOLS[n.name] || { color: '#b9a8e4', bg: '#2a2350' };
                const count    = dreamsForSym(n.name).length;

                // Node fill: semi-transparent on dark bg
                const fillColor = isActive
                  ? 'rgba(245,216,150,0.25)'
                  : 'rgba(185,168,228,0.15)';
                const strokeColor = isActive ? '#f5d896' : 'rgba(185,168,228,0.5)';

                return (
                  <React.Fragment key={n.name}>
                    <Circle
                      cx={nodeX(n)} cy={nodeY(n)} r={n.r}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isActive ? 1.5 : 0.8}
                      opacity={isDim ? 0.3 : 1}
                      onPress={() => setSelected(isActive ? null : n.name)}
                    />
                    <SvgText
                      x={nodeX(n)} y={nodeY(n) + 4}
                      textAnchor="middle"
                      fill={isActive ? '#f5d896' : 'rgba(255,255,255,0.75)'}
                      fontSize={10} fontWeight="500"
                      opacity={isDim ? 0.3 : 1}
                      onPress={() => setSelected(isActive ? null : n.name)}
                    >
                      {n.name}
                    </SvgText>
                    {count > 0 && (
                      <SvgText
                        x={nodeX(n)} y={nodeY(n) + n.r + 13}
                        textAnchor="middle"
                        fill="rgba(185,168,228,0.7)"
                        fontSize={9}
                        opacity={isDim ? 0.3 : 0.9}
                      >
                        ×{count}
                      </SvgText>
                    )}
                  </React.Fragment>
                );
              })}
            </Svg>

            {!selected && (
              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>
                  {dreams.length === 0 ? 'Record dreams to build your map' : 'Tap a symbol to explore'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Selected symbol detail ── */}
        {selected && (
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>{selected}</Text>
            <Text style={styles.detailSub}>
              {dreamsForSym(selected).length} {dreamsForSym(selected).length === 1 ? 'appearance' : 'appearances'} in your journal
            </Text>
            {dreamsForSym(selected).slice(0, 3).map(d => (
              <TouchableOpacity
                key={d.id}
                style={styles.dreamRow}
                onPress={() => navigation.navigate('DreamDetail', { dreamId: d.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.dreamRowTitle} numberOfLines={1}>
                    {d.ai_summary?.split('.')[0] || 'Untitled dream'}
                  </Text>
                  <Text style={styles.dreamRowDate}>
                    {d.recorded_at
                      ? new Date(d.recorded_at).toLocaleDateString('en-IN', {
                          weekday: 'short', day: 'numeric', month: 'short',
                        })
                      : ''}
                  </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!isPremium && !selected && (
          <View style={styles.upsellCard}>
            <Text style={styles.upsellEyebrow}>✦ Go deeper</Text>
            <Text style={styles.upsellTitle}>
              Premium reveals what your symbols predict — not just what they connect to.
            </Text>
            <TouchableOpacity
              style={styles.upsellBtn}
              onPress={() => navigation.navigate('Paywall')}
            >
              <Text style={styles.upsellBtnText}>Unlock for ₹179/mo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  circleBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  circleBtnText: { fontSize: 16, color: COLORS.ink },
  headerTitle: { fontSize: 15, fontWeight: '500', color: COLORS.ink },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },

  sub: { fontSize: 13, color: COLORS.ink3, marginBottom: 4 },
  pageTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 30, fontWeight: '500',
    color: COLORS.ink, marginBottom: 16,
  },

  // Night sky map card
  mapCard: {
    borderRadius: 20, overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(185,168,228,0.2)',
  },
  nightSky: {
    width: MAP_W, height: MAP_H,
    backgroundColor: '#1c1733',
    position: 'relative',
  },

  // Tap hint inside the dark map
  tapHint: {
    position: 'absolute', bottom: 14, left: 0, right: 0, alignItems: 'center',
  },
  tapHintText: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    fontSize: 11, color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.4,
  },

  // Selected detail
  detailSection: { marginBottom: 16 },
  detailTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 24, fontWeight: '500',
    color: COLORS.ink, textTransform: 'capitalize', marginBottom: 4,
  },
  detailSub: { fontSize: 13, color: COLORS.ink3, marginBottom: 12 },
  dreamRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.line,
    padding: 14, marginBottom: 8,
  },
  dreamRowTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 16, fontWeight: '500', color: COLORS.ink,
  },
  dreamRowDate: { fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  arrow: { fontSize: 16, color: COLORS.ink3 },

  // Upsell
  upsellCard: { padding: 22, borderRadius: 20, backgroundColor: COLORS.peach2 },
  upsellEyebrow: { fontSize: 13, fontWeight: '600', color: COLORS.ink, marginBottom: 8 },
  upsellTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 17, lineHeight: 24,
    color: COLORS.ink, marginBottom: 16,
  },
  upsellBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 22, paddingVertical: 10,
    borderRadius: 20, backgroundColor: COLORS.ink,
  },
  upsellBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.bg2 },
});
