// =============================================================================
// DreamDiary — Expo Notifications Service
// =============================================================================
// Handles permission requests, scheduling of daily wake-up dream reminders,
// and cancellation of all pending notifications.
// =============================================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Notification appearance (foreground)
// ---------------------------------------------------------------------------

// Configure how notifications look and behave when the app is in the
// foreground.  This should be called once early in the app lifecycle (e.g.
// in App.js) *before* any notifications are scheduled.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ---------------------------------------------------------------------------
// Reminder messages — rotated daily
// ---------------------------------------------------------------------------

const WAKE_UP_MESSAGES = [
  {
    title: "Your dreams are waiting ✨",
    body: "Good morning! Capture your dream before it fades — open DreamDiary now.",
  },
  {
    title: "Rise and record 🌙",
    body: "Before you reach for your phone — what did you dream? Tap to journal it.",
  },
  {
    title: "The subconscious speaks",
    body: "Last night's dream has a story to tell. Open DreamDiary and let it speak.",
  },
  {
    title: "Dream journal time 🔮",
    body: "While the images are still fresh, record your dream and unlock its meaning.",
  },
  {
    title: "Capture the night 🌌",
    body: "Your dream from last night could reveal something profound. Record it now.",
  },
];

// Notification channel ID for Android
const CHANNEL_ID = 'dreamreminders';

// Identifier used to cancel / replace the existing recurring notification
const WAKE_UP_TRIGGER_ID = 'daily-wake-up-reminder';

// =============================================================================
// Public API
// =============================================================================

/**
 * Request notification permissions from the user.
 *
 * On iOS this shows the native permission dialog on first call.
 * On Android 13+ (API 33) POST_NOTIFICATIONS permission is also requested.
 *
 * @returns {Promise<boolean>} — true if permission was granted
 */
export async function requestPermissions() {
  // Create the Android notification channel (safe to call repeatedly)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Dream Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7B5EA7',
      sound: null,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
        allowAnnouncements: false,
      },
    });
    finalStatus = status;
  }

  const granted = finalStatus === 'granted';

  if (!granted) {
    console.warn(
      '[Notifications] Permission not granted. ' +
        'Users will need to enable notifications manually in Settings.'
    );
  }

  return granted;
}

/**
 * Schedule a daily wake-up notification at the user's preferred wake time.
 *
 * Any previously scheduled wake-up notification is cancelled first so only
 * one is ever active at a time.
 *
 * The message is chosen by rotating through WAKE_UP_MESSAGES using the
 * current day-of-year as a deterministic index, so the user sees a different
 * message each morning.
 *
 * @param {string} wakeTime — time string in "HH:MM:SS" or "HH:MM" format
 *                            (e.g. "07:30:00")
 * @returns {Promise<string | null>} — the notification identifier, or null on
 *                                     failure
 */
export async function scheduleWakeUpNotification(wakeTime) {
  // Parse the wake time string
  const parsed = parseWakeTime(wakeTime);
  if (!parsed) {
    console.error(
      `[Notifications.scheduleWakeUpNotification] Invalid wakeTime: "${wakeTime}". ` +
        'Expected "HH:MM" or "HH:MM:SS".'
    );
    return null;
  }

  const { hour, minute } = parsed;

  // Cancel any existing wake-up notification before scheduling a new one
  await cancelWakeUpNotification();

  // Deterministic message rotation based on day-of-year
  const dayOfYear = getDayOfYear(new Date());
  const messageIndex = dayOfYear % WAKE_UP_MESSAGES.length;
  const { title, body } = WAKE_UP_MESSAGES[messageIndex];

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      identifier: WAKE_UP_TRIGGER_ID,
      content: {
        title,
        body,
        sound: true,
        data: {
          type: 'wake_up_reminder',
          openScreen: 'RecordDream',
        },
        ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    console.log(
      `[Notifications] Wake-up reminder scheduled at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (id: ${identifier})`
    );

    return identifier;
  } catch (error) {
    console.error('[Notifications.scheduleWakeUpNotification] Error:', error);
    return null;
  }
}

/**
 * Cancel only the daily wake-up notification.
 */
export async function cancelWakeUpNotification() {
  try {
    await Notifications.cancelScheduledNotificationAsync(WAKE_UP_TRIGGER_ID);
  } catch {
    // If the notification doesn't exist yet, Expo throws — swallow the error.
  }
}

/**
 * Cancel every scheduled notification for this app.
 * Use this on sign-out or when the user disables reminders entirely.
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[Notifications] All scheduled notifications cancelled.');
}

/**
 * Return all currently scheduled notifications.
 * Useful for debugging or presenting to the user.
 * @returns {Promise<Notifications.NotificationRequest[]>}
 */
export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Add a listener for notification interactions (taps).
 * Returns an unsubscribe function.
 *
 * @param {function(Notifications.NotificationResponse): void} handler
 * @returns {function(): void} — call to remove the listener
 */
export function addNotificationResponseListener(handler) {
  const subscription = Notifications.addNotificationResponseReceivedListener(handler);
  return () => subscription.remove();
}

/**
 * Add a listener that fires when a notification is received while the app
 * is in the foreground.
 * Returns an unsubscribe function.
 *
 * @param {function(Notifications.Notification): void} handler
 * @returns {function(): void}
 */
export function addNotificationReceivedListener(handler) {
  const subscription = Notifications.addNotificationReceivedListener(handler);
  return () => subscription.remove();
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Parse a "HH:MM" or "HH:MM:SS" string into { hour, minute }.
 * Returns null if the string is invalid or out of range.
 *
 * @param {string} timeString
 * @returns {{ hour: number, minute: number } | null}
 */
function parseWakeTime(timeString) {
  if (!timeString || typeof timeString !== 'string') return null;

  const parts = timeString.trim().split(':');
  if (parts.length < 2) return null;

  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);

  if (
    isNaN(hour) || isNaN(minute) ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59
  ) {
    return null;
  }

  return { hour, minute };
}

/**
 * Return the 1-based day of the year (1–366).
 * Used to rotate through the message array without storing state.
 *
 * @param {Date} date
 * @returns {number}
 */
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}
