import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { signUpWithEmail } from '../../services/supabase';
import { COLORS } from '../../constants/theme';

export default function SignUpScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const handleSignUp = async () => {
    setError(null);
    if (!name.trim()) { setError('Enter your name.'); return; }
    if (!email.trim()) { setError('Enter your email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
    } catch (err) {
      setError(err?.message || 'Sign up failed. Please try again.');
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
            <TextInput
              ref={passwordRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={COLORS.ink3}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.ctaBtn} onPress={handleSignUp} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color={COLORS.bg2} />
                : <Text style={styles.ctaBtnText}>Create account</Text>
              }
            </TouchableOpacity>
          </View>

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
