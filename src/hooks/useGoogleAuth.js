import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { signInWithGoogle } from '../services/supabase';

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!loading) return;
    const sub = AppState.addEventListener('change', nextState => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // User returned from browser without completing OAuth (cancelled)
        setLoading(false);
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [loading]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const data = await signInWithGoogle();
      if (data?.url) {
        await Linking.openURL(data.url);
        // Stay loading — AppState listener clears on cancel; navigation unmounts on success
      } else {
        Alert.alert('Google sign in failed', 'Could not get sign-in URL. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      Alert.alert('Google sign in failed', err?.message || 'Please try again.');
      setLoading(false);
    }
  };

  return { handleGoogleSignIn, googleLoading: loading };
}
