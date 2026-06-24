import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { signInWithEmail } from '../../services/supabase';
import { useDreamStore } from '../../store';
import { COLORS } from '../../constants/theme';

function friendlyAuthError(raw) {
  const msg = (raw || '').toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('email not confirmed')) {
    return 'Invalid email or password. Please check and try again.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  return raw || 'Sign in failed. Please try again.';
}

export default function SignInScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const passwordRef = useRef(null);

  const handleSignIn = async () => {
    setError(null);
    if (!email.trim()) { setError('Enter your email.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    setLoading(true);
    try {
      const session = await signInWithEmail(email.trim(), password);
      // Directly update the store so navigation happens immediately,
      // without waiting for the onAuthStateChange event to propagate.
      if (session) {
        useDreamStore.getState().setSession(session);
      }
    } catch (err) {
      setError(friendlyAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>

          <View style={styles.titleSection}>
            <Text style={styles.glyph}>☾</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue your dream journal</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.ink3}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={COLORS.ink3}
                secureTextEntry={!passwordVisible}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setPasswordVisible(v => !v)}
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
              >
                <Text style={styles.eyeBtnText}>{passwordVisible ? '⊘' : '⊙'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotBtnText}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.ctaBtn} onPress={handleSignIn} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color={COLORS.bg2} />
                : <Text style={styles.ctaBtnText}>Sign in</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerHint}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, marginTop: 8, marginLeft: 16,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 16, color: COLORS.ink },
  titleSection: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 32, paddingBottom: 32 },
  glyph: { fontFamily: 'Lora_400Regular', fontSize: 60, color: COLORS.ink, marginBottom: 16 },
  title: { fontFamily: 'Lora_500Medium', fontSize: 30, fontWeight: '500', color: COLORS.ink, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.ink2, textAlign: 'center' },
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
  passwordRow: { position: 'relative', marginBottom: 16 },
  passwordInput: { marginBottom: 0, paddingRight: 48 },
  eyeBtn: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: 48, alignItems: 'center', justifyContent: 'center',
  },
  eyeBtnText: { fontSize: 18, color: COLORS.ink3 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -8 },
  forgotBtnText: { fontSize: 13, color: COLORS.ink3, fontWeight: '500' },
  errorText: { fontSize: 13, color: '#c0392b', marginBottom: 12 },
  ctaBtn: {
    height: 52, borderRadius: 26, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.bg2 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerHint: { fontSize: 15, color: COLORS.ink2 },
  footerLink: { fontSize: 15, color: COLORS.ink, fontWeight: '600' },
});
