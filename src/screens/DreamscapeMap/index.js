import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { useDreamStore } from '../../store';
import { COLORS, SYMBOLS } from '../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_W = SCREEN_W - 40;
const MAP_H = 400;

const NODES = [
  { name: 'water',   x: 0.25, y: 0.28, r: 32 },
  { name: 'ocean',   x: 0.50, y: 0.17, r: 24 },
  { name: 'people',  x: 0.61, y: 0.43, r: 38 },
  { name: 'school',  x: 0.22, y: 0.56, r: 22 },
  { name: 'house',   x: 0.78, y: 0.63, r: 26 },
  { name: 'falling', x: 0.44, y: 0.76, r: 24 },
  { name: 'flying',  x: 0.19, y: 0.82, r: 22 },
  { name: 'light',   x: 0.81, y: 0.33, r: 30 },
  { name: 'forest',  x: 0.69, y: 0.87, r: 20 },
  { name: 'chase',   x: 0.36, y: 0.48, r: 24 },
];
const EDGES = [
  ['water','ocean'],['water','people'],['ocean','light'],
  ['people','house'],['people','school'],['school','chase'],
  ['chase','falling'],['falling','flying'],['house','forest'],
  ['light','people'],['water','falling'],
];

export default function DreamscapeMapScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(null);
  const dreams = useDreamStore(s => s.dreams) || [];
  const isPremium = useDreamStore(s => s.isPremium);

  const dreamsForSym = (sym) =>
    dreams.filter(d => (d.dream_tags || []).some(t => t.type === 'symbol' && t.label?.toLowerCase() === sym));

  const byName = Object.fromEntries(NODES.map(n => [n.name, n]));

  const nodeX = (n) => n.x * MAP_W;
  const nodeY = (n) => n.y * MAP_H;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.circleBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Symbol map</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sub}>Last 90 days</Text>
        <Text style={styles.pageTitle}>Your patterns</Text>

        {/* SVG map */}
        <View style={styles.mapCard}>
          <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
            {/* Edges */}
            {EDGES.map(([a, b], i) => {
              const na = byName[a], nb = byName[b];
              if (!na || !nb) return null;
              const active = selected && (a === selected || b === selected);
              return (
                <Line
                  key={i}
                  x1={nodeX(na)} y1={nodeY(na)}
                  x2={nodeX(nb)} y2={nodeY(nb)}
                  stroke={active ? COLORS.peach : COLORS.line2}
                  strokeWidth={active ? 1.5 : 1}
                />
              );
            })}
            {/* Nodes */}
            {NODES.map(n => {
              const isActive = selected === n.name;
              const isDim = selected && !isActive;
              const sym = SYMBOLS[n.name] || { color: COLORS.ink3, bg: COLORS.line };
              const count = dreamsForSym(n.name).length;
              return (
                <React.Fragment key={n.name}>
                  <Circle
                    cx={nodeX(n)} cy={nodeY(n)} r={n.r}
                    fill={sym.bg}
                    stroke={isActive ? sym.color : 'transparent'}
                    strokeWidth={isActive ? 2 : 0}
                    opacity={isDim ? 0.35 : 1}
                    onPress={() => setSelected(isActive ? null : n.name)}
                  />
                  <SvgText
                    x={nodeX(n)} y={nodeY(n) + 5}
                    textAnchor="middle"
                    fill={sym.color}
                    fontSize={12} fontWeight="500"
                    opacity={isDim ? 0.4 : 1}
                    onPress={() => setSelected(isActive ? null : n.name)}
                  >{n.name}</SvgText>
                  {count > 0 && (
                    <SvgText
                      x={nodeX(n)} y={nodeY(n) + n.r + 14}
                      textAnchor="middle"
                      fill={COLORS.ink3}
                      fontSize={10}
                      opacity={isDim ? 0.35 : 0.85}
                    >×{count}</SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
          {!selected && (
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>Tap a symbol</Text>
            </View>
          )}
        </View>

        {/* Selected symbol detail */}
        {selected && (
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>{selected}</Text>
            <Text style={styles.detailSub}>
              {dreamsForSym(selected).length} appearances · often paired with "people"
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
                    {d.recorded_at ? new Date(d.recorded_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
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
            <Text style={styles.upsellTitle}>Premium reveals what your symbols predict — not just what they connect to.</Text>
            <TouchableOpacity style={styles.upsellBtn} onPress={() => navigation.navigate('Paywall')}>
              <Text style={styles.upsellBtnText}>Unlock for ₹179/mo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sub: { fontSize: 13, color: COLORS.ink3, marginBottom: 4 },
  pageTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 30, fontWeight: '500',
    color: COLORS.ink, marginBottom: 16,
  },
  mapCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line,
    overflow: 'hidden', marginBottom: 16,
  },
  tapHint: {
    position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center',
  },
  tapHintText: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    fontSize: 12, color: COLORS.ink2,
  },
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
  upsellCard: {
    padding: 22, borderRadius: 20,
    backgroundColor: COLORS.peach2,
  },
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
