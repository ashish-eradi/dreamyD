// =============================================================================
// DreamDiary — SignInScreen
// =============================================================================
// Returning user sign-in: Google OAuth or email/password.
// Auth state change handled by App.js — navigation is automatic on success.
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
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmail, signInWithGoogle, supabase } from '../../services/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  text: '#F1F0FF',
  muted: '#8B8BAE',
  error: '#EF4444',
  inputBorder: '#2A2A45',
  focusBorder: '#7B5EA7',
};

// ─── DarkInput ────────────────────────────────────────────────────────────────
function DarkInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  textContentType,
  returnKeyType,
  onSubmitEditing,
  inputRef,
}) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useSharedValue(0);

  const handleFocus = useCallback(() => {
    setFocused(true);
    borderAnim.value = withSpring(1, { damping: 20 });
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    borderAnim.value = withSpring(0, { damping: 20 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: focused ? COLORS.focusBorder : COLORS.inputBorder,
    borderWidth: focused ? 1.5 : 1,
  }));

  return (
    <Animated.View style={[styles.inputContainer, containerStyle]}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={handleFocus}
        onBlur={handleBlur}
        selectionColor={COLORS.accent}
        autoCorrect={false}
        spellCheck={false}
      />
    </Animated.View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ─── GoogleButton ─────────────────────────────────────────────────────────────
function GoogleButton({ onPress, loading }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={loading}
      style={styles.googleButton}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      {loading ? (
        <ActivityIndicator color="#1A1A1A" size="small" style={{ marginRight: 12 }} />
      ) : (
        <View style={styles.googleIconCircle}>
          <Text style={styles.googleLetter}>G</Text>
        </View>
      )}
      <Text style={styles.googleButtonText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

// ─── SignInScreen ─────────────────────────────────────────────────────────────
export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordRef = useRef(null);
  const signInButtonScale = useSharedValue(1);

  const handleSignIn = useCallback(async () => {
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    signInButtonScale.value = withSpring(0.97, { damping: 15 }, () => {
      signInButtonScale.value = withSpring(1, { damping: 15 });
    });

    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // Auth state change in App.js handles navigation
    } catch (err) {
      const raw = err?.message ?? '';
      let friendly = 'Sign in failed. Please try again.';
      if (raw.toLowerCase().includes('invalid login')) {
        friendly = 'Incorrect email or password. Please try again.';
      } else if (raw.toLowerCase().includes('email not confirmed')) {
        friendly = 'Please verify your email before signing in.';
      } else if (raw.length > 0) {
        friendly = raw;
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const handleGoogle = useCallback(async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err?.message ?? 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  const handleForgotPassword = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert(
        'Enter your email',
        'Please enter your email address above, then tap "Forgot password?"'
      );
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: 'dreamdiary://auth/reset-password' }
      );
      if (resetError) throw resetError;
      Alert.alert(
        'Check your email',
        `We've sent a password reset link to ${email.trim()}`
      );
    } catch (err) {
      Alert.alert('Error', err?.message ?? 'Could not send reset email.');
    }
  }, [email]);

  const signInButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: signInButtonScale.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <SafeAreaView style={styles.safeArea}>
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
            {/* ── Header ── */}
            <Animated.View
              entering={FadeIn.duration(400)}
              style={styles.header}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Text style={styles.backArrow}>←</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ── Logo & Title ── */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.titleSection}
            >
              <Text style={styles.logoEmoji}>🌙</Text>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to your DreamDiary</Text>
            </Animated.View>

            {/* ── Card ── */}
            <Animated.View
              entering={FadeInDown.delay(250).duration(500)}
              style={styles.card}
            >
              {/* Google sign-in */}
              <GoogleButton onPress={handleGoogle} loading={googleLoading} />

              <Divider />

              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <DarkInput
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
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    accessibilityRole="button"
                    accessibilityLabel="Forgot password"
                  >
                    <Text style={styles.forgotLink}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>
                <DarkInput
                  inputRef={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  secureTextEntry
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                />
              </View>

              {/* Error */}
              {error ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={styles.errorContainer}
                >
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              {/* Sign in button */}
              <Animated.View style={[styles.signInButtonOuter, signInButtonStyle]}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSignIn}
                  disabled={loading}
                  style={styles.signInButtonTouchable}
                  accessibilityRole="button"
                  accessibilityLabel="Sign In"
                >
                  <LinearGradient
                    colors={loading ? ['#4A3D6A', '#6B4F8A'] : ['#7B5EA7', '#C084FC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.signInButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.signInButtonText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            {/* ── Sign up link ── */}
            <Animated.View
              entering={FadeInDown.delay(450).duration(400)}
              style={styles.signUpRow}
            >
              <Text style={styles.signUpHint}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp')}
                accessibilityRole="link"
                accessibilityLabel="Sign Up"
              >
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: COLORS.text,
  },

  // Title section
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 24,
  },
  logoEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
  },

  // Card
  card: {
    marginHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.20)',
  },

  // Google button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
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

  // Divider
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

  // Form
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotLink: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: '#12122A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  input: {
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontWeight: '400',
  },

  // Error
  errorContainer: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    lineHeight: 20,
  },

  // Sign-in button
  signInButtonOuter: {
    marginTop: 6,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 8,
  },
  signInButtonTouchable: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  signInButtonGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Sign-up row
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
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
