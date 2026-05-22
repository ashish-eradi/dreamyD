import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useStore } from '../../store';
import PremiumGate from '../../components/PremiumGate';
import { getEmotionColor } from '../../utils';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MAP_W = SCREEN_W - 32;
const MAP_H = SCREEN_H * 0.5;

const COLORS = {
  background: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  text: '#F1F0FF',
  muted: '#8B8BAE',
};

const EMOTIONS = ['Joy', 'Fear', 'Peace', 'Sadness', 'Confusion'];
const EMOTION_COLORS_LIST = EMOTIONS.map((e) => ({ emotion: e, color: getEmotionColor(e) }));

function buildGraph(dreams) {
  const symbolMap = {};
  const edgeMap = {};

  for (const dream of dreams) {
    const tags = dream.tags || [];
    const symbols = tags.filter((t) => t.type === 'symbol').map((t) => t.label);
    const topEmotion = tags
      .filter((t) => t.type === 'emotion')
      .sort((a, b) => b.confidence_score - a.confidence_score)[0];

    for (const sym of symbols) {
      if (!symbolMap[sym]) {
        symbolMap[sym] = { label: sym, count: 0, emotion: topEmotion?.label ?? 'mystery' };
      }
      symbolMap[sym].count += 1;
    }

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const key = [symbols[i], symbols[j]].sort().join('|');
        edgeMap[key] = (edgeMap[key] || 0) + 1;
      }
    }
  }

  const nodes = Object.values(symbolMap);
  const edges = Object.entries(edgeMap).map(([key, weight]) => {
    const [a, b] = key.split('|');
    return { from: a, to: b, weight };
  });

  // Assign positions in a circle layout
  const cx = MAP_W / 2;
  const cy = MAP_H / 2;
  const r = Math.min(MAP_W, MAP_H) * 0.35;
  nodes.forEach((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    node.x = cx + r * Math.cos(angle);
    node.y = cy + r * Math.sin(angle);
  });

  return { nodes, edges };
}

// Mock data for when no dreams exist
const MOCK_GRAPH = {
  nodes: [
    { label: 'Water', count: 8, emotion: 'peace', x: MAP_W / 2, y: MAP_H / 2 - 120 },
    { label: 'Flying', count: 6, emotion: 'joy', x: MAP_W / 2 + 120, y: MAP_H / 2 - 40 },
    { label: 'House', count: 5, emotion: 'confusion', x: MAP_W / 2 + 80, y: MAP_H / 2 + 100 },
    { label: 'Falling', count: 4, emotion: 'fear', x: MAP_W / 2 - 80, y: MAP_H / 2 + 100 },
    { label: 'People', count: 7, emotion: 'sadness', x: MAP_W / 2 - 120, y: MAP_H / 2 - 40 },
  ],
  edges: [
    { from: 'Water', to: 'Flying', weight: 3 },
    { from: 'Flying', to: 'House', weight: 2 },
    { from: 'House', to: 'Falling', weight: 2 },
    { from: 'Falling', to: 'People', weight: 4 },
    { from: 'People', to: 'Water', weight: 3 },
    { from: 'Water', to: 'House', weight: 1 },
  ],
};

export default function DreamscapeMapScreen() {
  const navigation = useNavigation();
  const dreams = useStore((s) => s.dreams);
  const [selectedNode, setSelectedNode] = useState(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const graph = useMemo(() => (dreams.length > 0 ? buildGraph(dreams) : MOCK_GRAPH), [dreams]);

  const maxCount = useMemo(() => Math.max(...graph.nodes.map((n) => n.count), 1), [graph]);

  const nodeRadius = useCallback(
    (count) => 14 + (count / maxCount) * 22,
    [maxCount]
  );

  const findNode = useCallback(
    (label) => graph.nodes.find((n) => n.label === label),
    [graph]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(3, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleNodePress = (node) => {
    setSelectedNode(node.label === selectedNode ? null : node.label);
  };

  const selectedDreams = useMemo(() => {
    if (!selectedNode) return [];
    return dreams.filter((d) =>
      (d.tags || []).some((t) => t.type === 'symbol' && t.label === selectedNode)
    );
  }, [selectedNode, dreams]);

  return (
    <PremiumGate featureName="Dreamscape Map">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Dreamscape Map</Text>
            <Text style={styles.headerSubtitle}>Your Symbol Universe</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <GestureDetector gesture={composed}>
            <Animated.View style={[styles.mapInner, animatedStyle]}>
              <Svg width={MAP_W} height={MAP_H}>
                {/* Edges */}
                {graph.edges.map((edge, i) => {
                  const from = findNode(edge.from);
                  const to = findNode(edge.to);
                  if (!from || !to) return null;
                  return (
                    <Line
                      key={i}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={`rgba(192,132,252,${0.1 + edge.weight * 0.05})`}
                      strokeWidth={edge.weight}
                    />
                  );
                })}

                {/* Nodes */}
                {graph.nodes.map((node, i) => {
                  const r = nodeRadius(node.count);
                  const color = getEmotionColor(node.emotion);
                  const isSelected = selectedNode === node.label;
                  return (
                    <React.Fragment key={i}>
                      <Circle
                        cx={node.x}
                        cy={node.y}
                        r={r}
                        fill={color + (isSelected ? 'CC' : '50')}
                        stroke={isSelected ? color : `${color}80`}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        onPress={() => handleNodePress(node)}
                      />
                      <SvgText
                        x={node.x}
                        y={node.y + r + 12}
                        fill={COLORS.text}
                        fontSize={11}
                        textAnchor="middle"
                        opacity={0.85}
                      >
                        {node.label}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>
            </Animated.View>
          </GestureDetector>

          <Text style={styles.mapHint}>Pinch to zoom · Drag to pan · Tap node to explore</Text>
        </View>

        {/* Legend */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legend}
        >
          {EMOTION_COLORS_LIST.map(({ emotion, color }) => (
            <View key={emotion} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{emotion}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Node detail */}
        {selectedNode && (
          <View style={styles.nodeDetail}>
            <View style={styles.nodeDetailHeader}>
              <Text style={styles.nodeDetailTitle}>{selectedNode}</Text>
              <Text style={styles.nodeDetailCount}>
                {graph.nodes.find((n) => n.label === selectedNode)?.count ?? 0} dreams
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nodeDetailDreams}>
              {selectedDreams.length === 0 ? (
                <Text style={styles.noRelatedDreams}>No recorded dreams with this symbol yet</Text>
              ) : (
                selectedDreams.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={styles.miniDreamCard}
                    onPress={() => navigation.navigate('DreamDetail', { dreamId: d.id })}
                  >
                    <Text style={styles.miniDreamDate} numberOfLines={1}>
                      {d.recorded_at ? new Date(d.recorded_at).toLocaleDateString() : ''}
                    </Text>
                    <Text style={styles.miniDreamSummary} numberOfLines={2}>
                      {d.ai_summary || 'No summary'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(123,94,167,0.2)',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  mapContainer: {
    margin: 16,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.25)',
  },
  mapInner: { width: MAP_W, height: MAP_H },
  mapHint: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
  },
  legend: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.muted, fontSize: 12 },
  nodeDetail: {
    margin: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.3)',
  },
  nodeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nodeDetailTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  nodeDetailCount: { color: COLORS.muted, fontSize: 13 },
  nodeDetailDreams: {},
  noRelatedDreams: { color: COLORS.muted, fontSize: 13, fontStyle: 'italic' },
  miniDreamCard: {
    width: 140,
    backgroundColor: '#0D0D1A',
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.3)',
  },
  miniDreamDate: { color: COLORS.muted, fontSize: 11, marginBottom: 4 },
  miniDreamSummary: { color: COLORS.text, fontSize: 12, lineHeight: 16 },
});
