import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import { useStore } from '../../store';
import PremiumGate from '../../components/PremiumGate';
import { getEmotionColor } from '../../utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

const COLORS = {
  background: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  gold: '#F59E0B',
  text: '#F1F0FF',
  muted: '#8B8BAE',
  success: '#10B981',
};

function useMonthData(dreams, year, month) {
  return useMemo(() => {
    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });

    const monthDreams = dreams.filter((d) => {
      const date = new Date(d.recorded_at || d.created_at);
      return date >= start && date <= end;
    });

    const dailyCounts = days.map((day) => ({
      day: day.getDate(),
      count: monthDreams.filter((d) => isSameDay(new Date(d.recorded_at || d.created_at), day)).length,
    }));

    const symbolCounts = {};
    const emotionCounts = {};
    let totalVividness = 0;
    let vividnessDreams = 0;

    for (const dream of monthDreams) {
      if (dream.vividness_score) {
        totalVividness += dream.vividness_score;
        vividnessDreams++;
      }
      for (const tag of dream.tags || []) {
        if (tag.type === 'symbol') symbolCounts[tag.label] = (symbolCounts[tag.label] || 0) + 1;
        if (tag.type === 'emotion') emotionCounts[tag.label] = (emotionCounts[tag.label] || 0) + 1;
      }
    }

    const topSymbols = Object.entries(symbolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    const emotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));

    const totalEmotions = emotions.reduce((s, e) => s + e.count, 0);
    const emotionShares = emotions.map((e) => ({
      ...e,
      pct: totalEmotions > 0 ? (e.count / totalEmotions) * 100 : 0,
    }));

    return {
      monthDreams,
      dailyCounts,
      topSymbols,
      emotionShares,
      avgVividness: vividnessDreams > 0 ? (totalVividness / vividnessDreams).toFixed(1) : '—',
    };
  }, [dreams, year, month]);
}

function FrequencyChart({ dailyCounts }) {
  const maxCount = Math.max(...dailyCounts.map((d) => d.count), 1);
  const barW = 8;
  const chartH = 80;
  const gap = 2;
  const totalW = dailyCounts.length * (barW + gap);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={totalW + 16} height={chartH + 20}>
        {dailyCounts.map((d, i) => {
          const h = Math.max(4, (d.count / maxCount) * chartH);
          const x = i * (barW + gap) + 8;
          const y = chartH - h;
          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={4}
                fill={d.count > 0 ? COLORS.accent : 'rgba(123,94,167,0.2)'}
              />
              {i % 5 === 0 && (
                <SvgText x={x + barW / 2} y={chartH + 14} fill={COLORS.muted} fontSize={9} textAnchor="middle">
                  {d.day}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
}

function EmotionPie({ emotions }) {
  const SIZE = 120;
  const r = 45;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  let cumAngle = -Math.PI / 2;

  const slices = emotions.map((e) => {
    const angle = (e.pct / 100) * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    return {
      ...e,
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: getEmotionColor(e.label),
    };
  });

  if (emotions.length === 0) {
    return (
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={cx} cy={cy} r={r} fill="rgba(123,94,167,0.2)" />
      </Svg>
    );
  }

  return (
    <Svg width={SIZE} height={SIZE}>
      {slices.map((s, i) => (
        <Path key={i} d={s.d} fill={s.color} />
      ))}
      <Circle cx={cx} cy={cy} r={28} fill={COLORS.card} />
    </Svg>
  );
}

export default function MonthlyReportScreen() {
  const navigation = useNavigation();
  const dreams = useStore((s) => s.dreams);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [exporting, setExporting] = useState(false);

  const { monthDreams, dailyCounts, topSymbols, emotionShares, avgVividness } = useMonthData(dreams, year, month);

  const monthLabel = format(new Date(year, month), 'MMMM yyyy');

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const html = `
        <html><body style="font-family:sans-serif;background:#0D0D1A;color:#F1F0FF;padding:32px;">
        <h1 style="color:#C084FC;">DreamDiary — ${monthLabel}</h1>
        <p>Total Dreams: ${monthDreams.length}</p>
        <p>Average Vividness: ${avgVividness}/10</p>
        <h2 style="color:#C084FC;">Top Symbols</h2>
        ${topSymbols.map(s => `<p>${s.label}: ${s.count}</p>`).join('')}
        <h2 style="color:#C084FC;">Emotions</h2>
        ${emotionShares.map(e => `<p>${e.label}: ${e.pct.toFixed(0)}%</p>`).join('')}
        </body></html>
      `;
      await Print.printAsync({ html });
    } catch {
      Alert.alert('Export failed', 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <PremiumGate featureName="Monthly Reports">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Monthly Report</Text>
          <TouchableOpacity onPress={handleExport} style={styles.exportBtn} disabled={exporting}>
            {exporting
              ? <ActivityIndicator size="small" color={COLORS.gold} />
              : <Ionicons name="share-outline" size={20} color={COLORS.gold} />}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Month selector */}
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
              <Ionicons name="chevron-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
              <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{monthDreams.length}</Text>
              <Text style={styles.statLabel}>Dreams</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{avgVividness}</Text>
              <Text style={styles.statLabel}>Avg Vividness</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {monthDreams.length > 0
                  ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                      new Date(monthDreams[0].recorded_at || monthDreams[0].created_at).getDay()
                    ]
                  : '—'}
              </Text>
              <Text style={styles.statLabel}>Top Day</Text>
            </View>
          </View>

          {/* Frequency chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dream Frequency</Text>
            <View style={styles.card}>
              <FrequencyChart dailyCounts={dailyCounts} />
            </View>
          </View>

          {/* Top symbols */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top 5 Symbols</Text>
            <View style={styles.card}>
              {topSymbols.length === 0 ? (
                <Text style={styles.emptyText}>No symbols recorded this month</Text>
              ) : (
                topSymbols.map((sym, i) => {
                  const maxCount = topSymbols[0].count;
                  return (
                    <View key={i} style={styles.symbolRow}>
                      <Text style={styles.symbolName}>{sym.label}</Text>
                      <View style={styles.symbolBarBg}>
                        <View
                          style={[styles.symbolBarFill, { width: `${(sym.count / maxCount) * 100}%` }]}
                        />
                      </View>
                      <Text style={styles.symbolCount}>{sym.count}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Emotion breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emotion Breakdown</Text>
            <View style={[styles.card, styles.emotionCard]}>
              <EmotionPie emotions={emotionShares} />
              <View style={styles.emotionLegend}>
                {emotionShares.slice(0, 5).map((e, i) => (
                  <View key={i} style={styles.emotionLegendItem}>
                    <View style={[styles.emotionDot, { backgroundColor: getEmotionColor(e.label) }]} />
                    <Text style={styles.emotionLegendText}>
                      {e.label} — {e.pct.toFixed(0)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* AI narrative */}
          {monthDreams.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Narrative</Text>
              <View style={[styles.card, styles.narrativeCard]}>
                <Ionicons name="sparkles" size={16} color={COLORS.accent} style={{ marginBottom: 10 }} />
                <Text style={styles.narrativeText}>
                  {`In ${monthLabel}, your dream life was ${
                    monthDreams.length > 10 ? 'particularly active' : 'moderately present'
                  }, with ${monthDreams.length} recorded dream${monthDreams.length !== 1 ? 's' : ''}. ${
                    emotionShares[0]
                      ? `The dominant emotional tone was ${emotionShares[0].label.toLowerCase()}, appearing in ${emotionShares[0].pct.toFixed(0)}% of your dream moments.`
                      : ''
                  } ${
                    topSymbols[0]
                      ? `Recurring symbols included ${topSymbols
                          .slice(0, 3)
                          .map((s) => s.label)
                          .join(', ')}, suggesting themes worth exploring in your waking life.`
                      : ''
                  }`}
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
  exportBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  monthArrow: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  monthLabel: { color: COLORS.text, fontSize: 18, fontWeight: '700', minWidth: 150, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.2)',
  },
  statValue: { color: COLORS.accent, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: COLORS.muted, fontSize: 11 },
  section: { marginBottom: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.2)',
  },
  emptyText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', paddingVertical: 10 },
  symbolRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  symbolName: { color: COLORS.text, fontSize: 13, width: 80 },
  symbolBarBg: { flex: 1, height: 6, backgroundColor: 'rgba(123,94,167,0.2)', borderRadius: 3, overflow: 'hidden' },
  symbolBarFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },
  symbolCount: { color: COLORS.muted, fontSize: 12, width: 24, textAlign: 'right' },
  emotionCard: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  emotionLegend: { flex: 1, gap: 8 },
  emotionLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emotionDot: { width: 10, height: 10, borderRadius: 5 },
  emotionLegendText: { color: COLORS.text, fontSize: 12 },
  narrativeCard: { borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  narrativeText: { color: COLORS.text, fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
});
