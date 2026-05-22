// =============================================================================
// DreamDiary — WakeTimePickerScreen
// =============================================================================
// Onboarding step 2: user picks their wake-up time so we can schedule the
// perfect morning dream-capture reminder.
// =============================================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDreamStore } from '../../store';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bg: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  text: '#F1F0FF',
  muted: '#8B8BAE',
  gold: '#F59E0B',
};

// Wheel item height
const ITEM_HEIGHT = 56;
// Number of phantom items above/below for centering illusion
const PADDING_ITEMS = 2;

// Hour list: 1–12 (12-hour clock)
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
// Minute list: 00–59
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
// AM / PM
const PERIODS = ['AM', 'PM'];

// ─── WheelPicker ──────────────────────────────────────────────────────────────
/**
 * A scrollable vertical wheel picker for a finite list of string items.
 *
 * Props:
 *   data       — string[]
 *   value      — currently selected string
 *   onChange   — (value: string) => void
 *   itemWidth  — optional number
 */
function WheelPicker({ data, value, onChange, itemWidth = 80 }) {
  const listRef = useRef(null);
  const currentIndex = data.indexOf(value);

  // Pad data so the selected item can always be centered
  const paddedData = [
    ...Array(PADDING_ITEMS).fill(''),
    ...data,
    ...Array(PADDING_ITEMS).fill(''),
  ];

  // Scroll to initial value on mount
  useEffect(() => {
    if (listRef.current && currentIndex >= 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: currentIndex + PADDING_ITEMS,
          animated: false,
          viewPosition: 0.5,
        });
      }, 50);
    }
  }, []);

  const handleMomentumEnd = useCallback(
    (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
      const dataIndex = rawIndex; // padded index maps directly to data index
      if (dataIndex >= 0 && dataIndex < data.length) {
        onChange(data[dataIndex]);
      }
    },
    [data, onChange]
  );

  const handleScrollEnd = useCallback(
    (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
      const snappedOffset = rawIndex * ITEM_HEIGHT;
      // Snap to nearest item
      listRef.current?.scrollToOffset({ offset: snappedOffset, animated: true });
      const dataIndex = rawIndex;
      if (dataIndex >= 0 && dataIndex < data.length) {
        onChange(data[dataIndex]);
      }
    },
    [data, onChange]
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      const dataIndex = index - PADDING_ITEMS;
      const isSelected = item !== '' && item === value;
      const isPadding = item === '';

      return (
        <View style={[styles.wheelItem, { width: itemWidth }]}>
          {!isPadding && (
            <Text
              style={[
                styles.wheelItemText,
                isSelected && styles.wheelItemTextSelected,
              ]}
            >
              {item}
            </Text>
          )}
        </View>
      );
    },
    [value, itemWidth]
  );

  const getItemLayout = useCallback(
    (_, index) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <View style={[styles.wheelContainer, { width: itemWidth }]}>
      {/* Selection highlight band */}
      <View style={[styles.wheelHighlight, { width: itemWidth }]} pointerEvents="none" />
      <FlatList
        ref={listRef}
        data={paddedData}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: 0 }}
        initialScrollIndex={currentIndex + PADDING_ITEMS}
        onScrollToIndexFailed={() => {}}
        bounces={false}
        style={{ height: ITEM_HEIGHT * (PADDING_ITEMS * 2 + 1) }}
      />
    </View>
  );
}

// ─── NotificationPreview ──────────────────────────────────────────────────────
function NotificationPreview({ hour, minute, period }) {
  return (
    <Animated.View
      entering={FadeIn.delay(400).duration(500)}
      style={styles.notifPreview}
    >
      <View style={styles.notifHeader}>
        <Text style={styles.notifApp}>DreamDiary</Text>
        <Text style={styles.notifTime}>
          {hour}:{minute} {period}
        </Text>
      </View>
      <Text style={styles.notifTitle}>🌙 Good morning! What did you dream?</Text>
      <Text style={styles.notifBody}>
        Capture your dream before it fades — tap to record
      </Text>
    </Animated.View>
  );
}

// ─── WakeTimePickerScreen ─────────────────────────────────────────────────────
export default function WakeTimePickerScreen({ navigation }) {
  const setUser = useDreamStore((s) => s.setUser);
  const user = useDreamStore((s) => s.user);

  const [selectedHour, setSelectedHour] = useState('07');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

  const continueScale = useSharedValue(1);

  const handleContinue = useCallback(() => {
    // Animate button press
    continueScale.value = withSpring(0.96, { damping: 15 }, () => {
      continueScale.value = withSpring(1, { damping: 15 });
    });

    // Build wake time string in 24h format for storage
    let hour24 = parseInt(selectedHour, 10);
    if (selectedPeriod === 'AM' && hour24 === 12) hour24 = 0;
    if (selectedPeriod === 'PM' && hour24 !== 12) hour24 += 12;
    const wakeTime = `${String(hour24).padStart(2, '0')}:${selectedMinute}`;

    // Persist to store pending profile (will be saved to Supabase after sign-up)
    if (user) {
      setUser({ ...user, wake_time: wakeTime });
    }

    // Navigate to notification permission screen
    navigation.navigate('NotificationPermission', { wakeTime });
  }, [selectedHour, selectedMinute, selectedPeriod, user, navigation, setUser]);

  const continueStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueScale.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <SafeAreaView style={styles.safeArea}>
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
          <View style={styles.headerProgress}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>
        </Animated.View>

        {/* ── Title ── */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(500)}
          style={styles.titleSection}
        >
          <Text style={styles.emoji}>⏰</Text>
          <Text style={styles.title}>When do you wake up?</Text>
          <Text style={styles.subtitle}>
            This helps us send you the perfect morning reminder to capture your
            dream before it fades
          </Text>
        </Animated.View>

        {/* ── Picker ── */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={styles.pickerSection}
        >
          <LinearGradient
            colors={['rgba(123,94,167,0.12)', 'rgba(26,26,46,0.95)']}
            style={styles.pickerCard}
          >
            <View style={styles.pickerRow}>
              <WheelPicker
                data={HOURS}
                value={selectedHour}
                onChange={setSelectedHour}
                itemWidth={72}
              />
              <Text style={styles.pickerColon}>:</Text>
              <WheelPicker
                data={MINUTES}
                value={selectedMinute}
                onChange={setSelectedMinute}
                itemWidth={72}
              />
              <View style={styles.pickerSpacer} />
              <WheelPicker
                data={PERIODS}
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                itemWidth={64}
              />
            </View>
          </LinearGradient>

          <Text style={styles.pickerHint}>Scroll to set your wake time</Text>
        </Animated.View>

        {/* ── Notification preview ── */}
        <Animated.View
          entering={FadeInDown.delay(450).duration(500)}
          style={styles.previewSection}
        >
          <Text style={styles.previewLabel}>Preview</Text>
          <NotificationPreview
            hour={selectedHour}
            minute={selectedMinute}
            period={selectedPeriod}
          />
        </Animated.View>

        {/* ── Continue button ── */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(500)}
          style={[styles.bottomSection, continueStyle]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContinue}
            style={styles.continueWrapper}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <LinearGradient
              colors={['#7B5EA7', '#C084FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueGradient}
            >
              <Text style={styles.continueText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(139,139,174,0.35)',
  },
  progressDotActive: {
    backgroundColor: COLORS.accent,
    width: 20,
    borderRadius: 4,
  },

  // Title section
  titleSection: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },

  // Picker section
  pickerSection: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  pickerCard: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.30)',
    alignItems: 'center',
    width: '100%',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerColon: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.accent,
    marginHorizontal: 4,
    marginBottom: 4,
  },
  pickerSpacer: {
    width: 16,
  },
  pickerHint: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },

  // Wheel
  wheelContainer: {
    position: 'relative',
    overflow: 'hidden',
    height: ITEM_HEIGHT * (PADDING_ITEMS * 2 + 1),
  },
  wheelHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * PADDING_ITEMS,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(123,94,167,0.18)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.35)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.muted,
    letterSpacing: 1,
  },
  wheelItemTextSelected: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '700',
  },

  // Preview section
  previewSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingLeft: 4,
  },
  notifPreview: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.20)',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  notifApp: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.3,
  },
  notifTime: {
    fontSize: 12,
    color: COLORS.muted,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  notifBody: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },

  // Bottom / continue button
  bottomSection: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 8 : 24,
    marginTop: 'auto',
    paddingTop: 16,
  },
  continueWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 14,
    elevation: 10,
  },
  continueGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
