import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { useDreamStore } from '../../store';
import { COLORS } from '../../constants/theme';

export default function SetNewPasswordScreen() {
  const insets = useSafeAreaInsets();
  const setNeedsPasswordReset = useDreamStore(s => s.setNeedsPasswordReset);

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [done,      setDone]      = useState(false);

  const confirmRef = useRef(null);

  const handleSave = async () => {
    setError(null);
    if (!password)           { setError('Enter a new password.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      // USER_UPDATED event will fire and clear needsPasswordReset in App.js,
      // but set it here too so the transition is instant.
      setTimeout(() => setNeedsPasswordReset(false), 1200);
    } catch (err) {
      setError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleSection}>
            <Text style={styles.glyph}>☾</Text>
            <Text style={styles.title}>Set new password</Text>
            <Text style={styles.subtitle}>
              Choose a new password for your DreamDiary account.
            </Text>
          </View>

          {done ? (
            <View style={styles.successCard}>
              <Text style={styles.successGlyph}>✓</Text>
              <Text style={styles.successTitle}>Password updated</Text>
              <Text style={styles.successBody}>Taking you back to your journal…</Text>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.inputLabel}>New password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={v => { setPassword(v); setError(null); }}
                  placeholder="At least 8 characters"
                  placeholderTextColor={COLORS.ink3}
                  secureTextEntry={!showPass}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  autoFocus
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(v => !v)}>
                  <Text style={styles.eyeBtnText}>{showPass ? '⊘' : '⊙'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Confirm password</Text>
              <TextInput
                ref={confirmRef}
                style={styles.input}
                value={confirm}
                onChangeText={v => { setConfirm(v); setError(null); }}
                placeholder="Repeat your password"
                placeholderTextColor={COLORS.ink3}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={styles.ctaBtn}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={COLORS.bg2} />
                  : <Text style={styles.ctaBtnText}>Save password</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  titleSection: {
    alignItems: 'center', paddingHorizontal: 28,
    paddingTop: 48, paddingBottom: 32,
  },
  glyph: {
    fontFamily: 'Lora_400Regular', fontSize: 60,
    color: COLORS.ink, marginBottom: 16,
  },
  title: {
    fontFamily: 'Lora_500Medium', fontSize: 30, fontWeight: '500',
    color: COLORS.ink, marginBottom: 8,
  },
  subtitle: { fontSize: 15, color: COLORS.ink2, textAlign: 'center', lineHeight: 22 },

  form: {
    marginHorizontal: 24, backgroundColor: COLORS.card,
    borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: COLORS.line,
  },
  inputLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.ink3,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    height: 50, borderRadius: 12, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.line,
    paddingHorizontal: 16, fontSize: 16, color: COLORS.ink,
    marginBottom: 16,
  },
  passwordRow: { position: 'relative', marginBottom: 0 },
  passwordInput: { marginBottom: 16, paddingRight: 48 },
  eyeBtn: {
    position: 'absolute', right: 0, top: 0, bottom: 16,
    width: 48, alignItems: 'center', justifyContent: 'center',
  },
  eyeBtnText: { fontSize: 18, color: COLORS.ink3 },
  errorText: { fontSize: 13, color: '#c0392b', marginBottom: 12 },
  ctaBtn: {
    height: 52, borderRadius: 26, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.bg2 },

  successCard: {
    marginHorizontal: 24, backgroundColor: COLORS.card,
    borderRadius: 24, padding: 28,
    borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center',
  },
  successGlyph: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.moss2,
    textAlign: 'center', lineHeight: 56,
    fontSize: 22, color: COLORS.moss,
    marginBottom: 16, overflow: 'hidden',
  },
  successTitle: {
    fontFamily: 'Lora_500Medium', fontSize: 22,
    color: COLORS.ink, marginBottom: 10,
  },
  successBody: { fontSize: 15, color: COLORS.ink2, textAlign: 'center' },
});
