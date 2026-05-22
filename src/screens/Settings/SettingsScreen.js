// =============================================================================
// DreamDiary — SettingsScreen
// =============================================================================
// Full settings UI: profile, notifications, subscription, data, and account
// sections. All rendered with StyleSheet (no NativeWind / className).
// =============================================================================

import React, {
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useDreamStore } from '../../store';
import {
  signOut as supabaseSignOut,
  updateProfile,
  getProfile,
} from '../../services/supabase';

// =============================================================================
// Constants
// =============================================================================

const COLORS = {
  bg: '#0D0D1A',
  card: '#1A1A2E',
  primary: '#7B5EA7',
  accent: '#C084FC',
  gold: '#F59E0B',
  text: '#F1F0FF',
  muted: '#8B8BAE',
  success: '#10B981',
  danger: '#EF4444',
  border: 'rgba(123, 94, 167, 0.20)',
  cardBorder: 'rgba(241, 240, 255, 0.06)',
  inputBg: '#12122A',
  inputBorder: '#2A2A45',
};

const PREMIUM_FEATURES = [
  'Unlimited dream analysis',
  'Advanced symbol interpretation',
  'Dream pattern insights',
  'Monthly consciousness reports',
  'Lucid dreaming trainer',
  'Cross-device sync & backup',
];

// =============================================================================
// Helpers
// =============================================================================

function getInitials(name, email) {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'DD';
}

// =============================================================================
// Sub-components
// =============================================================================

// ---------------------------------------------------------------------------
// SectionCard wrapper
// ---------------------------------------------------------------------------
function SectionCard({ children, style }) {
  return (
    <View style={[styles.sectionCard, style]}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// SectionTitle
// ---------------------------------------------------------------------------
function SectionTitle({ title }) {
  return (
    <Text style={styles.sectionTitle}>{title}</Text>
  );
}

// ---------------------------------------------------------------------------
// SettingsRow
// ---------------------------------------------------------------------------
function SettingsRow({
  icon,
  iconColor,
  label,
  sublabel,
  value,
  onPress,
  rightElement,
  isLast = false,
  dangerous = false,
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? { onPress, activeOpacity: 0.7, accessibilityRole: 'button' }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={[styles.settingsRow, isLast && styles.settingsRowLast]}
    >
      {icon && (
        <View
          style={[
            styles.rowIconContainer,
            { backgroundColor: `${iconColor ?? COLORS.primary}20` },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={dangerous ? COLORS.danger : (iconColor ?? COLORS.primary)}
          />
        </View>
      )}
      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowLabel,
            dangerous && { color: COLORS.danger },
          ]}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text style={styles.rowSublabel}>{sublabel}</Text>
        ) : null}
      </View>
      {rightElement ?? (
        value ? (
          <Text style={styles.rowValue}>{value}</Text>
        ) : (
          onPress && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={COLORS.muted}
              style={{ opacity: 0.6 }}
            />
          )
        )
      )}
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// EditNameModal
// ---------------------------------------------------------------------------
function EditNameModal({ visible, currentName, onSave, onClose, saving }) {
  const [name, setName] = useState(currentName ?? '');

  useEffect(() => {
    if (visible) setName(currentName ?? '');
  }, [visible, currentName]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={styles.editNameModal}
        >
          <Text style={styles.editNameTitle}>Edit Name</Text>
          <TextInput
            style={styles.editNameInput}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={COLORS.muted}
            autoFocus
            selectionColor={COLORS.accent}
            returnKeyType="done"
            onSubmitEditing={() => onSave(name)}
          />
          <View style={styles.editNameActions}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.editNameCancel}
              disabled={saving}
            >
              <Text style={styles.editNameCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(name)}
              style={styles.editNameSaveWrapper}
              disabled={saving}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7B5EA7', '#C084FC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.editNameSave}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.editNameSaveText}>Save</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// TimePickerModal  (simple hour/minute picker via text inputs for RN compat)
// ---------------------------------------------------------------------------
function TimePickerModal({ visible, currentTime, onSave, onClose }) {
  const [timeStr, setTimeStr] = useState(currentTime ?? '07:00');

  useEffect(() => {
    if (visible) setTimeStr(currentTime ?? '07:00');
  }, [visible, currentTime]);

  const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, '0')
  );
  const minutes = ['00', '15', '30', '45'];

  const [selectedHour, setSelectedHour] = useState(() => {
    const parts = (currentTime ?? '07:00').split(':');
    return parts[0] ?? '07';
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    const parts = (currentTime ?? '07:00').split(':');
    const m = parts[1] ?? '00';
    // Snap to nearest quarter
    const mins = [0, 15, 30, 45];
    const closest = mins.reduce((prev, cur) =>
      Math.abs(cur - parseInt(m, 10)) < Math.abs(prev - parseInt(m, 10))
        ? cur
        : prev
    );
    return String(closest).padStart(2, '0');
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.timePickerSheet}>
            <View style={styles.timePickerHandle} />
            <Text style={styles.timePickerTitle}>Wake-up Time</Text>

            {/* Hour selector */}
            <Text style={styles.timePickerSubLabel}>Hour</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timePickerRow}
            >
              {hours.map((h) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => setSelectedHour(h)}
                  style={[
                    styles.timePickerItem,
                    selectedHour === h && styles.timePickerItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.timePickerItemText,
                      selectedHour === h && styles.timePickerItemTextActive,
                    ]}
                  >
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Minute selector */}
            <Text style={styles.timePickerSubLabel}>Minute</Text>
            <View style={styles.timePickerRow}>
              {minutes.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setSelectedMinute(m)}
                  style={[
                    styles.timePickerItem,
                    selectedMinute === m && styles.timePickerItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.timePickerItemText,
                      selectedMinute === m && styles.timePickerItemTextActive,
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.timePickerPreview}>
              {selectedHour}:{selectedMinute}
            </Text>

            <View style={styles.timePickerActions}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.timePickerCancel}
              >
                <Text style={styles.timePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  onSave(`${selectedHour}:${selectedMinute}`)
                }
                style={styles.timePickerSaveWrapper}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#7B5EA7', '#C084FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.timePickerSave}
                >
                  <Text style={styles.timePickerSaveText}>Set Time</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// =============================================================================
// SettingsScreen
// =============================================================================

export default function SettingsScreen() {
  const navigation = useNavigation();

  // Store
  const user = useDreamStore((s) => s.user);
  const isPremium = useDreamStore((s) => s.isPremium);
  const storeSignOut = useDreamStore((s) => s.signOut);
  const setIsPremium = useDreamStore((s) => s.setIsPremium);

  // Profile state
  const [profileName, setProfileName] = useState(
    user?.user_metadata?.full_name ?? user?.name ?? ''
  );
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Notification state
  const [wakeupEnabled, setWakeupEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('07:00');
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  // Data state
  const [icloudBackup, setIcloudBackup] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // ---------------------------------------------------------------------------
  // Load profile from supabase on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadProfileData() {
      if (!user?.id) return;
      try {
        const profile = await getProfile(user.id);
        if (profile) {
          if (profile.name) setProfileName(profile.name);
          if (profile.wake_time) setReminderTime(profile.wake_time);
        }
      } catch (err) {
        // Non-fatal
        console.warn('[Settings] loadProfileData error:', err.message);
      }
    }
    loadProfileData();
  }, [user?.id]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSaveName = useCallback(
    async (newName) => {
      if (!user?.id || !newName.trim()) {
        setEditNameVisible(false);
        return;
      }
      setSavingName(true);
      try {
        await updateProfile(user.id, { name: newName.trim() });
        setProfileName(newName.trim());
        setEditNameVisible(false);
      } catch (err) {
        Alert.alert('Error', err?.message ?? 'Could not save name.');
      } finally {
        setSavingName(false);
      }
    },
    [user?.id]
  );

  const handleSaveTime = useCallback(
    async (time) => {
      setReminderTime(time);
      setTimePickerVisible(false);
      if (!user?.id) return;
      try {
        await updateProfile(user.id, { wake_time: time });
      } catch (err) {
        console.warn('[Settings] save wake_time error:', err.message);
      }
    },
    [user?.id]
  );

  const handleWakeupToggle = useCallback(
    async (value) => {
      setWakeupEnabled(value);
      // In production, call scheduleWakeUpNotification or cancelAllNotifications
    },
    []
  );

  const handleExportPDF = useCallback(async () => {
    setExportingPDF(true);
    // In production, build a PDF via expo-print and share
    setTimeout(() => {
      setExportingPDF(false);
      Alert.alert(
        'Export Dreams',
        'PDF export will be available in the next update. Stay tuned!'
      );
    }, 800);
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabaseSignOut();
            storeSignOut();
          } catch (err) {
            Alert.alert('Error', err?.message ?? 'Could not sign out.');
          }
        },
      },
    ]);
  }, [storeSignOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Permanently delete your account and all dreams? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Not yet available',
              'Please contact support@dreamdiary.app to delete your account.'
            );
          },
        },
      ]
    );
  }, []);

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Paywall');
  }, [navigation]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const userEmail = user?.email ?? '';
  const initials = getInitials(profileName, userEmail);

  const formatTimeDisplay = (t) => {
    if (!t) return '7:00 AM';
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:${mStr ?? '00'} ${ampm}`;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile ── */}
          <SectionTitle title="Profile" />
          <SectionCard>
            {/* Avatar + info */}
            <View style={styles.profileRow}>
              <LinearGradient
                colors={['#7B5EA7', '#C084FC']}
                style={styles.avatar}
              >
                <Text style={styles.avatarInitials}>{initials}</Text>
              </LinearGradient>
              <View style={styles.profileInfo}>
                <TouchableOpacity
                  onPress={() => setEditNameVisible(true)}
                  style={styles.profileNameRow}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Edit your name"
                >
                  <Text style={styles.profileName}>
                    {profileName || 'Tap to set name'}
                  </Text>
                  <Ionicons
                    name="pencil"
                    size={13}
                    color={COLORS.muted}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {userEmail}
                </Text>
              </View>
            </View>
          </SectionCard>

          {/* ── Notifications ── */}
          <SectionTitle title="Notifications" />
          <SectionCard>
            <SettingsRow
              icon="alarm-outline"
              iconColor={COLORS.gold}
              label="Wake-up Reminder"
              sublabel="Prompt to record dreams each morning"
              rightElement={
                <Switch
                  value={wakeupEnabled}
                  onValueChange={handleWakeupToggle}
                  trackColor={{
                    false: 'rgba(139,139,174,0.3)',
                    true: COLORS.primary,
                  }}
                  thumbColor={wakeupEnabled ? COLORS.accent : '#8B8BAE'}
                  ios_backgroundColor="rgba(139,139,174,0.3)"
                />
              }
            />
            <SettingsRow
              icon="time-outline"
              iconColor={COLORS.accent}
              label="Reminder Time"
              sublabel={wakeupEnabled ? 'Tap to change' : 'Enable reminders first'}
              value={formatTimeDisplay(reminderTime)}
              onPress={wakeupEnabled ? () => setTimePickerVisible(true) : undefined}
              isLast
            />
          </SectionCard>

          {/* ── Subscription ── */}
          <SectionTitle title="Subscription" />
          <SectionCard>
            {/* Plan badge */}
            <View style={styles.planRow}>
              {isPremium ? (
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={14} color={COLORS.gold} />
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </View>
              ) : (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>Free Plan</Text>
                </View>
              )}
            </View>

            {!isPremium && (
              <>
                {/* Premium features list */}
                <View style={styles.featuresList}>
                  {PREMIUM_FEATURES.map((f) => (
                    <View key={f} style={styles.featureItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={COLORS.success}
                      />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                {/* Upgrade button */}
                <TouchableOpacity
                  onPress={handleUpgrade}
                  activeOpacity={0.85}
                  style={styles.upgradeWrapper}
                  accessibilityRole="button"
                  accessibilityLabel="Upgrade to Premium"
                >
                  <LinearGradient
                    colors={['#F59E0B', '#F97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.upgradeButton}
                  >
                    <Ionicons name="star" size={18} color="#FFF" />
                    <Text style={styles.upgradeButtonText}>
                      Upgrade to Premium
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {isPremium && (
              <Text style={styles.premiumThankYou}>
                Thank you for supporting DreamDiary! All features are unlocked.
              </Text>
            )}
          </SectionCard>

          {/* ── Data ── */}
          <SectionTitle title="Data & Storage" />
          <SectionCard>
            {Platform.OS === 'ios' && (
              <SettingsRow
                icon="cloud-outline"
                iconColor="#3B82F6"
                label="Backup to iCloud"
                sublabel="Sync dreams across your Apple devices"
                rightElement={
                  <Switch
                    value={icloudBackup}
                    onValueChange={setIcloudBackup}
                    trackColor={{
                      false: 'rgba(139,139,174,0.3)',
                      true: '#3B82F6',
                    }}
                    thumbColor={icloudBackup ? '#60A5FA' : '#8B8BAE'}
                    ios_backgroundColor="rgba(139,139,174,0.3)"
                  />
                }
              />
            )}
            <SettingsRow
              icon="document-text-outline"
              iconColor={COLORS.success}
              label="Export Dreams as PDF"
              sublabel={isPremium ? 'Download your full dream journal' : 'Premium feature'}
              onPress={isPremium ? handleExportPDF : handleUpgrade}
              isLast
              rightElement={
                exportingPDF ? (
                  <ActivityIndicator color={COLORS.muted} size="small" />
                ) : undefined
              }
            />
          </SectionCard>

          {/* ── Account ── */}
          <SectionTitle title="Account" />
          <SectionCard>
            <SettingsRow
              icon="shield-checkmark-outline"
              iconColor={COLORS.muted}
              label="Privacy Policy"
              onPress={() =>
                Linking.openURL('https://dreamdiary.app/privacy').catch(() => {})
              }
            />
            <SettingsRow
              icon="document-outline"
              iconColor={COLORS.muted}
              label="Terms of Service"
              onPress={() =>
                Linking.openURL('https://dreamdiary.app/terms').catch(() => {})
              }
            />
            <SettingsRow
              icon="trash-outline"
              iconColor={COLORS.danger}
              label="Delete Account"
              onPress={handleDeleteAccount}
              dangerous
            />
            <SettingsRow
              icon="log-out-outline"
              iconColor={COLORS.danger}
              label="Sign Out"
              onPress={handleSignOut}
              dangerous
              isLast
            />
          </SectionCard>

          {/* Version */}
          <Text style={styles.versionText}>DreamDiary v1.0.0</Text>

          <View style={{ height: 48 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── Modals ── */}
      <EditNameModal
        visible={editNameVisible}
        currentName={profileName}
        onSave={handleSaveName}
        onClose={() => setEditNameVisible(false)}
        saving={savingName}
      />

      <TimePickerModal
        visible={timePickerVisible}
        currentTime={reminderTime}
        onSave={handleSaveTime}
        onClose={() => setTimePickerVisible(false)}
      />
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

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.3,
  },

  // ── Scroll content ───────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // ── Section title ────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // ── Section card ─────────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },

  // ── Profile ──────────────────────────────────────────────────────────────────
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.muted,
    flexShrink: 1,
  },

  // ── Settings row ─────────────────────────────────────────────────────────────
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(241,240,255,0.05)',
    minHeight: 56,
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  rowIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  rowSublabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  rowValue: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '500',
  },

  // ── Subscription ─────────────────────────────────────────────────────────────
  planRow: {
    padding: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    gap: 6,
  },
  premiumBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gold,
  },
  freeBadge: {
    backgroundColor: 'rgba(139,139,174,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(139,139,174,0.3)',
  },
  freeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  featuresList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.85,
  },
  upgradeWrapper: {
    margin: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  premiumThankYou: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    padding: 16,
    lineHeight: 20,
  },

  // ── Version ───────────────────────────────────────────────────────────────────
  versionText: {
    fontSize: 12,
    color: 'rgba(139,139,174,0.5)',
    textAlign: 'center',
    marginBottom: 8,
  },

  // ── Modal overlay ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Edit name modal ──────────────────────────────────────────────────────────
  editNameModal: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editNameTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  editNameInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  editNameActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editNameCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,139,174,0.35)',
  },
  editNameCancelText: {
    fontSize: 15,
    color: COLORS.muted,
    fontWeight: '600',
  },
  editNameSaveWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  editNameSave: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editNameSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },

  // ── Time picker modal ────────────────────────────────────────────────────────
  timePickerSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
  },
  timePickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(139,139,174,0.4)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  timePickerSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  timePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  timePickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139,139,174,0.3)',
  },
  timePickerItemActive: {
    backgroundColor: `${COLORS.primary}30`,
    borderColor: COLORS.primary,
  },
  timePickerItemText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '500',
  },
  timePickerItemTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  timePickerPreview: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginVertical: 16,
    letterSpacing: 2,
  },
  timePickerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  timePickerCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,139,174,0.35)',
  },
  timePickerCancelText: {
    fontSize: 15,
    color: COLORS.muted,
    fontWeight: '600',
  },
  timePickerSaveWrapper: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  timePickerSave: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
