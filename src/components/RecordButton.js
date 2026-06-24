// =============================================================================
// DreamDiary — RecordButton component
// =============================================================================
// Large circular gradient button with animated pulse rings.
//
// Props:
//   onPress     {function}  — tap handler
//   isRecording {boolean}   — shows stop icon when true, mic otherwise
//   size        {number}    — diameter of the button (default 100)
// =============================================================================

import React, { useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons }       from '@expo/vector-icons';
import * as Haptics       from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

// =============================================================================
// Color constants
// =============================================================================

const COLORS = {
  primary: '#7B5EA7',
  accent:  '#C084FC',
  lavender:'#A78BFA',
  danger:  '#EF4444',
};

// =============================================================================
// PulseRing — one animated ring that expands and fades
// =============================================================================

function PulseRing({ delay, buttonSize, color, active }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value   = 1;
      opacity.value = 0;
      return;
    }

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1,   { duration: 0 }),
          withTiming(2.2, { duration: 1800, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.45, { duration: 0 }),
          withTiming(0,    { duration: 1800, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false
      )
    );
  }, [active]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        styles.ringBase,
        {
          width:        buttonSize,
          height:       buttonSize,
          borderRadius: buttonSize / 2,
          borderColor:  color,
          marginLeft:   -(buttonSize / 2),  // centering within the container
          marginTop:    -(buttonSize / 2),
          left:         '50%',
          top:          '50%',
        },
        style,
      ]}
    />
  );
}

// =============================================================================
// RecordButton
// =============================================================================

export default function RecordButton({ onPress, isRecording = false, size = 100 }) {
  const tapScale    = useSharedValue(1);
  const breathScale = useSharedValue(1);

  // Idle breathing animation (only when not recording)
  useEffect(() => {
    if (isRecording) {
      cancelAnimation(breathScale);
      breathScale.value = withSpring(1, { damping: 10 });
      return;
    }

    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.00, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false
    );
  }, [isRecording]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value * tapScale.value }],
  }));

  const handlePress = useCallback(() => {
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        isRecording
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Heavy
      ).catch(() => {});
    }

    // Spring tap animation
    tapScale.value = withSpring(0.90, { damping: 12 }, () => {
      tapScale.value = withSpring(1, { damping: 12 });
    });

    onPress?.();
  }, [isRecording, onPress]);

  // Dynamic colors based on recording state
  const gradientColors = isRecording
    ? ['#EF4444', '#DC2626']
    : ['#7B5EA7', '#C084FC'];

  const ringColor = isRecording ? '#EF4444' : COLORS.accent;

  return (
    <View
      style={[
        styles.container,
        { width: size * 2.6, height: size * 2.6 },
      ]}
    >
      {/* Three staggered pulse rings */}
      <PulseRing delay={0}    buttonSize={size} color={ringColor} active={!isRecording} />
      <PulseRing delay={600}  buttonSize={size} color={ringColor} active={!isRecording} />
      <PulseRing delay={1200} buttonSize={size} color={ringColor} active={!isRecording} />

      {/* Single slow pulse when recording */}
      <PulseRing delay={0}    buttonSize={size} color={COLORS.danger} active={isRecording} />
      <PulseRing delay={700}  buttonSize={size} color={COLORS.danger} active={isRecording} />

      {/* Button */}
      <Animated.View style={[styles.buttonWrapper, { width: size, height: size }, buttonStyle]}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop recording' : 'Record dream'}
          style={[styles.touchable, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradient,
              {
                width:        size,
                height:       size,
                borderRadius: size / 2,
              },
            ]}
          >
            {isRecording ? (
              // Stop square
              <View
                style={[
                  styles.stopSquare,
                  {
                    width:        size * 0.32,
                    height:       size * 0.32,
                    borderRadius: size * 0.06,
                  },
                ]}
              />
            ) : (
              // Mic icon
              <Ionicons
                name="mic"
                size={size * 0.42}
                color="#FFFFFF"
              />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },

  ringBase: {
    position:    'absolute',
    borderWidth: 2,
  },

  buttonWrapper: {
    // Shadow
    shadowColor:   COLORS.accent,
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius:  20,
    elevation:     14,
  },

  touchable: {
    overflow: 'hidden',
  },

  gradient: {
    alignItems:     'center',
    justifyContent: 'center',
  },

  stopSquare: {
    backgroundColor: '#FFFFFF',
  },
});
