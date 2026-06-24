import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { resetPasswordForEmail } from '../../services/supabase';
import { COLORS } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) { setError('Enter your email address.'); return; }
    if (!trimmed.includes('@')) { setError('Enter a valid email address.'); return; }
    setLoading(true);
    try {
      await resetPasswordForEmail(trimmed);
      setSent(true);
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(err?.message || 'Something went wrong. Please try again.');
      }
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
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>

          <View style={styles.titleSection}>
            <Text style={styles.glyph}>☽</Text>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>
              Enter the email you signed up with and we'll send you a reset link.
            </Text>
          </View>

          {sent ? (
            <View style={styles.successCard}>
              <Text style={styles.successGlyph}>✓</Text>
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successBody}>
                A reset link has been sent to{' '}
                <Text style={{ fontWeight: '600' }}>{email.trim()}</Text>.
                {'\n'}It may take a minute to arrive.
              </Text>
              <TouchableOpacity
                style={styles.backToSignIn}
                onPress={() => navigation.navigate('SignIn')}
              >
                <Text style={styles.backToSignInText}>Back to sign in →</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
                returnKeyType="send"
                onSubmitEditing={handleSend}
                autoFocus
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={styles.ctaBtn}
                onPress={handleSend}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={COLORS.bg2} />
                  : <Text style={styles.ctaBtnText}>Send reset link</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerHint}>Remember your password? </Text>
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

  titleSection: {
    alignItems: 'center', paddingHorizontal: 28,
    paddingTop: 32, paddingBottom: 32,
  },
  glyph: {
    fontFamily: 'Lora_400Regular', fontSize: 60,
    color: COLORS.ink, marginBottom: 16,
  },
  title: {
    fontFamily: 'Lora_500Medium', fontSize: 30, fontWeight: '500',
    color: COLORS.ink, marginBottom: 8,
  },
  subtitle: {
    fontSize: 15, color: COLORS.ink2,
    textAlign: 'center', lineHeight: 22,
  },

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
  successBody: {
    fontSize: 15, color: COLORS.ink2,
    textAlign: 'center', lineHeight: 22,
  },
  backToSignIn: { marginTop: 24 },
  backToSignInText: { fontSize: 15, fontWeight: '600', color: COLORS.ink },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerHint: { fontSize: 15, color: COLORS.ink2 },
  footerLink: { fontSize: 15, color: COLORS.ink, fontWeight: '600' },
});
