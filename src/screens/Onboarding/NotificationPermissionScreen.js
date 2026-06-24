import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useNotifications } from '../../hooks/useNotifications';
import { formatWakeTimeTo24h } from '../../utils';
import { COLORS } from '../../constants/theme';

export default function NotificationPermissionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const { requestPermissions, scheduleNotification } = useNotifications();

  const wakeTime = route.params?.wakeTime ?? null;

  const handleAllow = async () => {
    setLoading(true);
    try {
      const granted = await requestPermissions();
      if (granted && wakeTime) {
        const time24h = formatWakeTimeTo24h(wakeTime);
        if (time24h) await scheduleNotification(time24h);
      }
    } catch {
      // permission / schedule errors are non-fatal
    } finally {
      setLoading(false);
    }
    navigation.navigate('SignUp', { wakeTime });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.dots}>
          {[0,1,2].map(i => (
            <View key={i} style={[styles.dot, i === 2 && styles.dotActive]} />
          ))}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.glyph}>☾</Text>
        <Text style={styles.title}>One last thing</Text>
        <Text style={styles.subtitle}>
          We'll wake you gently at your chosen time and ask what you dreamed — before the memory dissolves.
        </Text>

        <View style={styles.benefitsList}>
          {[
            { icon: '◔', text: 'Morning reminder at your wake time' },
            { icon: '◐', text: 'Reality check nudges through the day' },
            { icon: '✦', text: 'Weekly pattern insights on Sunday' },
          ].map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>{b.icon}</Text>
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.ctaBtn} onPress={handleAllow} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>Allow notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('SignUp', { wakeTime })}>
          <Text style={styles.skipBtnText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 16, color: COLORS.ink },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(42,38,34,0.2)' },
  dotActive: { width: 24, backgroundColor: COLORS.ink },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  glyph: { fontFamily: 'Lora_400Regular', fontSize: 60, color: COLORS.ink, marginBottom: 20 },
  title: {
    fontFamily: 'Lora_500Medium', fontSize: 32, fontWeight: '500',
    color: COLORS.ink, marginBottom: 14,
  },
  subtitle: {
    fontFamily: 'Lora_400Regular', fontSize: 16, lineHeight: 24, color: COLORS.ink2, marginBottom: 32,
  },
  benefitsList: { gap: 12 },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.line, padding: 16,
  },
  benefitIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.peach2,
    alignItems: 'center', justifyContent: 'center',
  },
  benefitIconText: { fontSize: 18, color: COLORS.peach },
  benefitText: { fontSize: 15, fontWeight: '500', color: COLORS.ink, flex: 1 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  ctaBtn: {
    height: 56, borderRadius: 28, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  ctaBtnText: { fontSize: 17, fontWeight: '600', color: COLORS.bg2 },
  skipBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  skipBtnText: { fontSize: 15, color: COLORS.ink3 },
});
