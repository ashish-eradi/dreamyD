import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Share, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDreamStore } from '../../store';
import { COLORS, MOODS, SYMBOLS } from '../../constants/theme';

const THEMES = {
  peach: { colors: ['#fde8dc', '#f5e8d4'], accent: '#d4885e' },
  sky:   { colors: ['#e4ecf5', '#efe4f1'], accent: '#7fa2c0' },
  moss:  { colors: ['#e3eee2', '#f5e8d4'], accent: '#7ea98a' },
};

export default function ShareCardScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { dreamId } = route.params || {};
  const [theme, setTheme] = useState('peach');

  const dreams = useDreamStore(s => s.dreams) || [];
  const dream = dreams.find(d => d.id === dreamId) || dreams[0];
  const th = THEMES[theme];

  const snippet = dream?.ai_summary || dream?.transcript || '';
  const displaySnippet = snippet.length > 120 ? snippet.slice(0, 117) + '…' : snippet;
  const title = snippet.split('.')[0] || 'Untitled dream';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `"${displaySnippet}"\n\n— DreamDiary`,
        title: title,
      });
    } catch (e) {
      Alert.alert('Could not share', e?.message);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch { return ''; }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.circleBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share dream</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Card preview */}
      <View style={styles.cardWrap}>
        <LinearGradient colors={th.colors} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardDate}>{formatDate(dream?.recorded_at) || 'Last night'}</Text>
            <Text style={[styles.cardTitle, { color: th.accent }]}>{title}</Text>
          </View>
          <View style={styles.cardBottom}>
            <Text style={styles.cardSnippet}>"{displaySnippet}"</Text>
            <View style={styles.cardDivider} />
            <View style={styles.cardFooter}>
              <Text style={styles.cardSymbols}>
                {(dream?.dream_tags || []).filter(t => t.type === 'symbol').slice(0, 3).map(t => '· ' + t.label).join('  ')}
              </Text>
              <Text style={styles.cardBrand}>DreamDiary</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Theme picker */}
      <View style={styles.themePicker}>
        {Object.entries(THEMES).map(([k, t]) => (
          <TouchableOpacity
            key={k}
            onPress={() => setTheme(k)}
            style={[styles.themeChip, theme === k && styles.themeChipActive]}
          >
            <LinearGradient colors={t.colors} style={styles.themeChipGradient} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleShare}>
          <Text style={styles.primaryBtnText}>Share ↗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  circleBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  circleBtnText: { fontSize: 16, color: COLORS.ink },
  headerTitle: { fontSize: 15, fontWeight: '500', color: COLORS.ink },
  cardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 300, aspectRatio: 0.8, borderRadius: 24,
    padding: 28, justifyContent: 'space-between',
    shadowColor: '#2a2622', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  cardTop: {},
  cardDate: {
    fontSize: 11, color: COLORS.ink2, marginBottom: 14,
    textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600',
  },
  cardTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 26, fontWeight: '500', lineHeight: 30,
  },
  cardBottom: {},
  cardSnippet: {
    fontFamily: 'Lora_400Regular_Italic', fontSize: 14, lineHeight: 22,
    color: COLORS.ink, fontStyle: 'italic',
  },
  cardDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginVertical: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSymbols: { fontSize: 11, color: COLORS.ink2 },
  cardBrand: { fontSize: 11, fontWeight: '600', color: COLORS.ink2 },
  themePicker: { flexDirection: 'row', gap: 14, justifyContent: 'center', paddingBottom: 20 },
  themeChip: {
    width: 48, height: 60, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.line2,
  },
  themeChipActive: { borderWidth: 2, borderColor: COLORS.ink },
  themeChipGradient: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  secondaryBtn: {
    flex: 1, height: 52, borderRadius: 26,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line2,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '500', color: COLORS.ink },
  primaryBtn: {
    flex: 1, height: 52, borderRadius: 26,
    backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.bg2 },
});
