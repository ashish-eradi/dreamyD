import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { signUpWithEmail, updateProfile } from '../../services/supabase';
import { formatWakeTimeTo24h, friendlySignUpError } from '../../utils';
import { COLORS } from '../../constants/theme';
import { useDreamStore } from '../../store';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const { handleGoogleSignIn, googleLoading } = useGoogleAuth();

  const wakeTime = route.params?.wakeTime ?? null;

  const handleSignUp = async () => {
    setError(null);
    setConfirmSent(false);
    if (!name.trim()) { setError('Enter your name.'); return; }
    if (!email.trim()) { setError('Enter your email.'); return; }
    if (!EMAIL_RE.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      // Compute wake_time before calling signUp so it can go into user_metadata
      // for the email-confirmation flow (where no session is returned immediately).
      const time24h = wakeTime ? formatWakeTimeTo24h(wakeTime) : null;
      const pendingMeta = time24h ? { pending_wake_time: time24h } : {};

      const { session, user } = await signUpWithEmail(email.trim(), password, name.trim(), pendingMeta);

      if (!session && user) {
        // Email confirmation required — wake_time is stored in user_metadata and
        // will be applied by hydrateProfile on first sign-in after confirmation.
        setConfirmSent(true);
        return;
      }

      if (session?.user?.id) {
        const profileUpdates = { onboarding_done: true };
        if (time24h) profileUpdates.wake_time = time24h;
        try {
          await updateProfile(session.user.id, profileUpdates);
          useDreamStore.getState().setOnboardingDone(true);
        } catch (profileErr) {
          console.warn('[SignUp] updateProfile failed:', profileErr?.message);
          useDreamStore.getState().setOnboardingDone(true);
        }
      }
    } catch (err) {
      setError(friendlySignUpError(err?.message));
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
            <Text style={styles.glyph}>✦</Text>
            <Text style={styles.title}>Open the journal</Text>
            <Text style={styles.subtitle}>Create your account to begin</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.inputLabel}>Your name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Anya"
              placeholderTextColor={COLORS.ink3}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              ref={emailRef}
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
                placeholder="At least 8 characters"
                placeholderTextColor={COLORS.ink3}
                secureTextEntry={!passwordVisible}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {confirmSent ? (
              <Text style={styles.confirmText}>
                ✓ Check your inbox — we sent a confirmation link to {email.trim()}. Tap it to activate your account, then sign in.
              </Text>
            ) : null}

            <TouchableOpacity style={styles.ctaBtn} onPress={handleSignUp} disabled={loading || confirmSent} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color={COLORS.bg2} />
                : <Text style={styles.ctaBtnText}>Create account</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Google Sign-In */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            {googleLoading
              ? <ActivityIndicator color={COLORS.ink} />
              : <>
                  <Text style={styles.googleBtnIcon}>G</Text>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
            }
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerHint}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.footerLink}>Sign in</Text>
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
  errorText: { fontSize: 13, color: '#c0392b', marginBottom: 12 },
  confirmText: { fontSize: 13, color: '#2e7d32', lineHeight: 19, marginBottom: 12 },
  ctaBtn: {
    height: 52, borderRadius: 26, backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.bg2 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.line2 },
  dividerText: { fontSize: 13, color: COLORS.ink3 },
  googleBtn: {
    marginHorizontal: 24, marginTop: 12, height: 52, borderRadius: 26,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  googleBtnIcon: { fontSize: 16, fontWeight: '700', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '500', color: COLORS.ink },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerHint: { fontSize: 15, color: COLORS.ink2 },
  footerLink: { fontSize: 15, color: COLORS.ink, fontWeight: '600' },
});
