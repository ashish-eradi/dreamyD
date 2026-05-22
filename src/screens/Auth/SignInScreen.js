// =============================================================================
// DreamDiary — SignInScreen
// =============================================================================
// Dark-themed sign-in: Google OAuth button + email/password form.
// On successful auth, App.js's onAuthStateChange listener handles navigation.
// =============================================================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { signInWithEmail, signInWithGoogle } from '../../services/supabase';

// =============================================================================
// Constants
// =============================================================================

const COLORS = {
  bg: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  text: '#F1F0FF',
  muted: '#8B8BAE',
  success: '#10B981',
  danger: '#EF4444',
  inputBg: '#12122A',
  inputBorder: '#2A2A45',
  focusBorder: '#7B5EA7',
};

// =============================================================================
// IconInput — dark card input with left icon and optional right toggle
// =============================================================================

function IconInput({
  iconName,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  rightElement,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.iconInputWrapper,
        focused && styles.iconInputWrapperFocused,
      ]}
    >
      <Ionicons
        name={iconName}
        size={18}
        color={focused ? COLORS.accent : COLORS.muted}
        style={styles.iconInputIcon}
      />
      <TextInput
        ref={inputRef}
        style={styles.iconInputField}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType ?? 'default'}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={COLORS.accent}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
      />
      {rightElement}
    </View>
  );
}

// =============================================================================
// GoogleButton
// =============================================================================

function GoogleButton({ onPress, loading }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={loading}
      style={styles.googleButton}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      {loading ? (
        <ActivityIndicator color="#1A1A1A" size="small" />
      ) : (
        <>
          <View style={styles.googleIconCircle}>
            <Text style={styles.googleLetter}>G</Text>
          </View>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// =============================================================================
// Divider
// =============================================================================

function OrDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// =============================================================================
// SignInScreen
// =============================================================================

export default function SignInScreen() {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);

  const passwordRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSignIn = useCallback(async () => {
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(trimmedEmail, password);
      // App.js auth listener will handle routing to the main app
    } catch (err) {
      const raw = err?.message ?? '';
      let friendly = 'Sign in failed. Please try again.';
      if (
        raw.toLowerCase().includes('invalid login') ||
        raw.toLowerCase().includes('invalid credentials') ||
        raw.toLowerCase().includes('email not confirmed')
      ) {
        friendly = 'Invalid email or password. Please check and try again.';
      } else if (raw.toLowerCase().includes('rate limit')) {
        friendly = 'Too many attempts. Please wait a moment and try again.';
      } else if (raw) {
        friendly = raw;
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const handleGoogleSignIn = useCallback(async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Redirect handled by deep link / OAuth callback → App.js
    } catch (err) {
      setError(err?.message ?? 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  const handleForgotPassword = useCallback(() => {
    // In production: navigate to a ForgotPassword screen or show inline flow
    // navigation.navigate('ForgotPassword')
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Back button ── */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>

            {/* ── Title section ── */}
            <View style={styles.titleSection}>
              <Text style={styles.moonEmoji}>🌙</Text>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>
                Sign in to continue your dream journey
              </Text>
            </View>

            {/* ── Card ── */}
            <View style={styles.card}>
              {/* Google */}
              <GoogleButton
                onPress={handleGoogleSignIn}
                loading={googleLoading}
              />

              <OrDivider />

              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <IconInput
                  iconName="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              {/* Password */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <IconInput
                  iconName="lock-closed-outline"
                  inputRef={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  secureTextEntry={!passwordVisible}
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setPasswordVisible((v) => !v)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={
                        passwordVisible ? 'Hide password' : 'Show password'
                      }
                    >
                      <Ionicons
                        name={
                          passwordVisible ? 'eye-off-outline' : 'eye-outline'
                        }
                        size={18}
                        color={COLORS.muted}
                      />
                    </TouchableOpacity>
                  }
                />
              </View>

              {/* Forgot password */}
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotRow}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Forgot password"
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Error */}
              {error ? (
                <View style={styles.errorCard}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color={COLORS.danger}
                    style={{ marginRight: 8, flexShrink: 0 }}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Sign In button */}
              <TouchableOpacity
                onPress={handleSignIn}
                disabled={loading}
                activeOpacity={0.85}
                style={styles.signInBtnWrapper}
                accessibilityRole="button"
                accessibilityLabel="Sign In"
              >
                <LinearGradient
                  colors={
                    loading
                      ? ['#4A3D6A', '#6B4F8A']
                      : ['#7B5EA7', '#C084FC']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signInBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.signInBtnText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ── Sign up link ── */}
            <View style={styles.signUpRow}>
              <Text style={styles.signUpHint}>
                Don&apos;t have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp')}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Sign Up"
              >
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },

  // ── Back button ──────────────────────────────────────────────────────────────
  backBtn: {
    marginTop: 8,
    marginLeft: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(241,240,255,0.06)',
  },

  // ── Title section ────────────────────────────────────────────────────────────
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
  },
  moonEmoji: {
    fontSize: 52,
    marginBottom: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    marginHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.20)',
  },

  // ── Google button ────────────────────────────────────────────────────────────
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 4,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  googleIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleLetter: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // ── Divider ──────────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(139,139,174,0.25)',
  },
  dividerText: {
    fontSize: 13,
    color: COLORS.muted,
    marginHorizontal: 12,
    fontWeight: '500',
  },

  // ── Form ─────────────────────────────────────────────────────────────────────
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  // ── Icon input ───────────────────────────────────────────────────────────────
  iconInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  iconInputWrapperFocused: {
    borderColor: COLORS.focusBorder,
    borderWidth: 1.5,
  },
  iconInputIcon: {
    marginRight: 10,
    flexShrink: 0,
  },
  iconInputField: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
  },

  // ── Forgot password ──────────────────────────────────────────────────────────
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -6,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
  },

  // ── Error card ───────────────────────────────────────────────────────────────
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    lineHeight: 20,
    flex: 1,
  },

  // ── Sign in button ───────────────────────────────────────────────────────────
  signInBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 8,
  },
  signInBtn: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  signInBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ── Sign up link ─────────────────────────────────────────────────────────────
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 20,
  },
  signUpHint: {
    fontSize: 15,
    color: COLORS.muted,
  },
  signUpLink: {
    fontSize: 15,
    color: COLORS.accent,
    fontWeight: '600',
  },
});
