import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDreamStore } from '../../store';
import { updateProfile } from '../../services/supabase';
import { COLORS } from '../../constants/theme';

const WAKE_PRESETS = ['05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM'];

export default function ProfileEditScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  const user    = useDreamStore(s => s.user);
  const setUser = useDreamStore(s => s.setUser);

  const currentName = user?.user_metadata?.full_name ?? '';

  const [name,     setName]     = useState(currentName);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(false);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    const trimmed = name.trim();
    if (!trimmed) { setError('Name cannot be empty.'); return; }
    if (!user?.id) return;

    setLoading(true);
    try {
      await updateProfile(user.id, { name: trimmed });
      // Reflect in store so header/settings show updated name immediately
      setUser({
        ...user,
        user_metadata: { ...(user.user_metadata ?? {}), full_name: trimmed },
      });
      setSuccess(true);
      setTimeout(() => navigation.goBack(), 800);
    } catch (err) {
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes all your dreams, patterns and data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Contact support', 'To delete your account, email support@dreamdiary.app');
        }},
      ]
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.circleBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar placeholder */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {(name.trim()[0] || user?.email?.[0] || '?').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Name */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Display name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={v => { setName(v); setError(null); setSuccess(false); }}
              placeholder="Your name"
              placeholderTextColor={COLORS.ink4}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              autoCorrect={false}
            />

            {/* Email — read-only */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Email</Text>
            <View style={[styles.input, styles.inputReadOnly]}>
              <Text style={styles.inputReadOnlyText}>{user?.email ?? '—'}</Text>
            </View>
          </View>

          {/* Feedback */}
          {error   && <Text style={styles.errorText}>{error}</Text>}
          {success && <Text style={styles.successText}>Saved ✓</Text>}

          {/* Save */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={COLORS.bg2} />
              : <Text style={styles.saveBtnText}>Save changes</Text>
            }
          </TouchableOpacity>

          {/* Danger zone */}
          <View style={styles.dangerSection}>
            <Text style={styles.dangerTitle}>Danger zone</Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
              <Text style={styles.dangerBtnText}>Delete account…</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },

  avatarWrap: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.peach2,
    borderWidth: 2, borderColor: COLORS.peach,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Lora_500Medium', fontSize: 28,
    color: COLORS.peach, fontWeight: '500',
  },

  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.line,
    padding: 20, marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.ink3,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    height: 50, borderRadius: 12, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.line,
    paddingHorizontal: 16, fontSize: 16, color: COLORS.ink,
  },
  inputReadOnly: {
    justifyContent: 'center',
    backgroundColor: COLORS.bg2,
    borderColor: COLORS.line,
  },
  inputReadOnlyText: { fontSize: 15, color: COLORS.ink3 },

  errorText: {
    fontSize: 13, color: '#c0392b',
    marginBottom: 12, marginHorizontal: 4,
  },
  successText: {
    fontSize: 13, color: '#27ae60',
    marginBottom: 12, marginHorizontal: 4, fontWeight: '600',
  },

  saveBtn: {
    height: 52, borderRadius: 26, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center', marginBottom: 32,
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.bg2 },

  dangerSection: {
    borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 24,
  },
  dangerTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.ink3,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12,
  },
  dangerBtn: {
    height: 48, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(192,57,43,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  dangerBtnText: { fontSize: 14, fontWeight: '500', color: '#c0392b' },
});
