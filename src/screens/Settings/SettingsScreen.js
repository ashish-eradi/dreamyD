import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDreamStore } from '../../store';
import { signOut } from '../../services/supabase';
import { COLORS } from '../../constants/theme';

const SETTINGS_ROWS = [
  { t: 'Notifications', s: 'Reality checks, sleep alarm', icon: '◔' },
  { t: 'Privacy', s: 'On-device transcription', icon: '⌑' },
  { t: 'Export your data', s: 'JSON, PDF, Markdown', icon: '↗' },
  { t: 'Therapist sharing', s: 'HIPAA-friendly', icon: '♡' },
  { t: 'Help & support', s: '', icon: '?' },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, isPremium, setUser, setSession, setPremium } = useDreamStore();

  const initial = (user?.name || user?.email || 'A').charAt(0).toUpperCase();

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: async () => {
          await signOut();
          setUser(null);
          setSession(null);
          setPremium(false);
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sub}>Member since {user?.created_at ? new Date(user.created_at).getFullYear() : '2025'}</Text>
        <Text style={styles.pageTitle}>You</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name || 'Dreamer'}</Text>
            <Text style={styles.profileSub}>{isPremium ? 'Premium · ₹179/mo' : 'Free tier'}</Text>
          </View>
        </View>

        {/* Premium upsell */}
        {!isPremium && (
          <TouchableOpacity style={styles.upsellCard} onPress={() => navigation.navigate('Paywall')} activeOpacity={0.85}>
            <Text style={styles.upsellTitle}>Try Premium</Text>
            <Text style={styles.upsellBody}>
              Unlock pattern analysis, monthly reports, and the full constellation map.
            </Text>
            <Text style={styles.upsellCta}>Upgrade →</Text>
          </TouchableOpacity>
        )}

        {/* Settings rows */}
        <View style={styles.settingsCard}>
          {SETTINGS_ROWS.map((r, i, arr) => (
            <TouchableOpacity
              key={i}
              style={[styles.settingsRow, i < arr.length - 1 && styles.settingsRowBorder]}
              activeOpacity={0.7}
            >
              <View style={styles.settingsIcon}>
                <Text style={styles.settingsIconText}>{r.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsTitle}>{r.t}</Text>
                {r.s ? <Text style={styles.settingsSub}>{r.s}</Text> : null}
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DreamDiary 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  sub: { fontSize: 13, color: COLORS.ink3, marginBottom: 4, marginTop: 8 },
  pageTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 30, fontWeight: '500',
    color: COLORS.ink, marginBottom: 20,
  },
  profileCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line,
    padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.peach,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '600', color: '#fff' },
  profileName: { fontFamily: 'Lora_500Medium', fontSize: 22, fontWeight: '500', color: COLORS.ink },
  profileSub: { fontSize: 13, color: COLORS.ink3, marginTop: 2 },
  upsellCard: {
    padding: 20, borderRadius: 20, marginBottom: 14,
    backgroundColor: COLORS.peach2,
  },
  upsellTitle: { fontFamily: 'Lora_500Medium', fontSize: 20, fontWeight: '500', color: COLORS.ink, marginBottom: 8 },
  upsellBody: { fontSize: 14, color: COLORS.ink2, lineHeight: 20, marginBottom: 16 },
  upsellCta: { fontSize: 14, fontWeight: '600', color: COLORS.ink },
  settingsCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line, marginBottom: 14, overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 18,
  },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  settingsIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center',
  },
  settingsIconText: { fontSize: 16, color: COLORS.ink2 },
  settingsTitle: { fontSize: 15, fontWeight: '500', color: COLORS.ink },
  settingsSub: { fontSize: 13, color: COLORS.ink3, marginTop: 2 },
  arrow: { fontSize: 16, color: COLORS.ink3 },
  signOutBtn: {
    height: 52, borderRadius: 26, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  signOutText: { fontSize: 15, fontWeight: '500', color: COLORS.ink2 },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.ink4 },
});
