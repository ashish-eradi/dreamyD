import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatShortDate, getEmotionColor, getTopEmotion, getTopSymbols } from '../../utils';

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

export default function ShareCardScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { dream, tags = [] } = route.params || {};
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  const topEmotion = getTopEmotion(tags);
  const topSymbols = getTopSymbols(tags, 3);
  const emotionColor = topEmotion ? getEmotionColor(topEmotion.label) : COLORS.accent;

  const dreamTitle = dream?.ai_summary
    ? dream.ai_summary.split(' ').slice(0, 5).join(' ') + '...'
    : 'A Dream';

  const dreamDate = dream?.recorded_at
    ? formatShortDate(new Date(dream.recorded_at))
    : formatShortDate(new Date());

  const handleSaveToGallery = async () => {
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library to save the card.');
        return;
      }

      const html = buildCardHTML({ dreamTitle, topEmotion, topSymbols, dreamDate, emotionColor });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'Your dream card has been saved to your gallery.');
    } catch (e) {
      Alert.alert('Error', 'Could not save the card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const message = `✨ "${dreamTitle}"\n\nEmotion: ${topEmotion?.label ?? 'Unknown'}\nSymbols: ${topSymbols.map(s => s.label).join(', ')}\nDate: ${dreamDate}\n\nCaptured with DreamDiary 🌙`;
      await Share.share({ message, title: 'My Dream — DreamDiary' });
    } catch (e) {
      // user cancelled
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Dream Card</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* The visual card */}
        <LinearGradient
          colors={['#1A0A2E', '#0D0D1A', '#0A0A1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Stars decoration */}
          <View style={styles.starsRow}>
            {['✦', '✧', '✦', '✧', '✦'].map((s, i) => (
              <Text key={i} style={[styles.starText, { opacity: 0.3 + i * 0.1 }]}>{s}</Text>
            ))}
          </View>

          {/* Branding */}
          <View style={styles.branding}>
            <Text style={styles.brandIcon}>🌙</Text>
            <Text style={styles.brandName}>DreamDiary</Text>
          </View>

          {/* Emotion */}
          {topEmotion && (
            <Text style={[styles.emotionLabel, { color: emotionColor }]}>
              {topEmotion.label.toUpperCase()}
            </Text>
          )}

          {/* Dream title */}
          <Text style={styles.dreamTitle}>"{dreamTitle}"</Text>

          {/* Divider */}
          <LinearGradient
            colors={['transparent', emotionColor, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.divider}
          />

          {/* Symbols */}
          {topSymbols.length > 0 && (
            <View style={styles.symbolsRow}>
              {topSymbols.map((sym, i) => (
                <View key={i} style={[styles.symbolPill, { borderColor: emotionColor + '60' }]}>
                  <Text style={styles.symbolPillText}>{sym.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Date */}
          <Text style={styles.dateText}>{dreamDate}</Text>

          {/* Bottom decoration */}
          <View style={styles.bottomStars}>
            {['★', '✧', '★'].map((s, i) => (
              <Text key={i} style={[styles.starText, { opacity: 0.2 + i * 0.1, fontSize: 10 }]}>{s}</Text>
            ))}
          </View>
        </LinearGradient>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleSaveToGallery}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7B5EA7', '#C084FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionBtnGradient}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#fff" />
              )}
              <Text style={styles.actionBtnText}>
                {saving ? 'Saving...' : 'Save to Gallery'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.8}
          >
            <View style={styles.actionBtnOutlined}>
              {sharing ? (
                <ActivityIndicator color={COLORS.accent} size="small" />
              ) : (
                <Ionicons name="share-outline" size={20} color={COLORS.accent} />
              )}
              <Text style={[styles.actionBtnText, { color: COLORS.accent }]}>
                {sharing ? 'Sharing...' : 'Share to...'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function buildCardHTML({ dreamTitle, topEmotion, topSymbols, dreamDate, emotionColor }) {
  return `
    <html><body style="background:#0D0D1A;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif;">
    <div style="width:400px;background:linear-gradient(135deg,#1A0A2E,#0D0D1A);border-radius:20px;padding:40px;color:white;text-align:center;border:1px solid rgba(192,132,252,0.2);">
      <div style="font-size:40px;margin-bottom:8px;">🌙</div>
      <div style="color:#8B8BAE;font-size:14px;letter-spacing:3px;margin-bottom:24px;">DREAMDIARY</div>
      ${topEmotion ? `<div style="color:${emotionColor};font-size:12px;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px;">${topEmotion.label}</div>` : ''}
      <div style="color:#F1F0FF;font-size:22px;font-weight:bold;margin-bottom:24px;line-height:1.4;">"${dreamTitle}"</div>
      <hr style="border:none;border-top:1px solid ${emotionColor}40;margin:24px 0;"/>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:24px;">
        ${topSymbols.map(s => `<span style="border:1px solid ${emotionColor}60;border-radius:20px;padding:4px 12px;font-size:12px;">${s.label}</span>`).join('')}
      </div>
      <div style="color:#8B8BAE;font-size:12px;">${dreamDate}</div>
    </div></body></html>
  `;
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
  scroll: { padding: 20, alignItems: 'center' },
  card: {
    width: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.2)',
    marginBottom: 32,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  starText: { color: COLORS.accent, fontSize: 14 },
  branding: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  brandIcon: { fontSize: 20 },
  brandName: { color: COLORS.muted, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase' },
  emotionLabel: { fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 },
  dreamTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  divider: { width: '80%', height: 1, marginBottom: 20 },
  symbolsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  symbolPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  symbolPillText: { color: COLORS.text, fontSize: 12 },
  dateText: { color: COLORS.muted, fontSize: 12, marginBottom: 16 },
  bottomStars: { flexDirection: 'row', gap: 6 },
  actions: { width: '100%', gap: 12 },
  actionBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  actionBtnOutlined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  actionBtnText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
});
