// =============================================================================
// DreamDiary — useNotifications hook
// =============================================================================
// Wraps the notifications service and exposes a React-friendly interface for:
//   • checking / requesting notification permissions
//   • scheduling the daily wake-up dream reminder
//   • cancelling notifications
//
// Returns:
//   hasPermission        — boolean | null  (null while the initial check is
//                          pending; true/false once resolved)
//   requestPermissions   — () => Promise<boolean>
//   scheduleNotification — (wakeTime: string) => Promise<string | null>
//                          wakeTime format: "HH:MM" or "HH:MM:SS"
//   cancelNotifications  — () => Promise<void>  cancels ALL scheduled notifs
//   cancelWakeUp         — () => Promise<void>  cancels only the wake-up notif
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import * as ExpoNotifications from 'expo-notifications';
import {
  requestPermissions as _requestPermissions,
  scheduleWakeUpNotification,
  cancelWakeUpNotification,
  cancelAllNotifications,
} from '../services/notifications';

export function useNotifications() {
  // null = not yet checked; true/false = resolved
  const [hasPermission, setHasPermission] = useState(null);

  // ─── Check existing permission status on mount ────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function checkPermissions() {
      try {
        const { status } = await ExpoNotifications.getPermissionsAsync();
        if (!cancelled) {
          setHasPermission(status === 'granted');
        }
      } catch (err) {
        console.warn('[useNotifications] getPermissionsAsync failed:', err);
        if (!cancelled) {
          setHasPermission(false);
        }
      }
    }

    checkPermissions();

    return () => {
      cancelled = true;
    };
  }, []);

  // ─── requestPermissions ───────────────────────────────────────────────────
  /**
   * Request notification permissions from the user.
   * Also creates the Android notification channel.
   *
   * @returns {Promise<boolean>} — true if permission was granted
   */
  const requestPermissions = useCallback(async () => {
    try {
      const granted = await _requestPermissions();
      setHasPermission(granted);
      return granted;
    } catch (err) {
      console.error('[useNotifications] requestPermissions failed:', err);
      setHasPermission(false);
      return false;
    }
  }, []);

  // ─── scheduleNotification ─────────────────────────────────────────────────
  /**
   * Schedule (or re-schedule) the daily wake-up dream reminder.
   * If no permission has been granted yet, this will request it first.
   *
   * @param {string} wakeTime — "HH:MM" or "HH:MM:SS" (e.g. "07:30")
   * @returns {Promise<string | null>} — notification identifier or null on failure
   */
  const scheduleNotification = useCallback(
    async (wakeTime) => {
      // Ensure we have permission before scheduling
      let permission = hasPermission;
      if (!permission) {
        permission = await requestPermissions();
      }

      if (!permission) {
        console.warn(
          '[useNotifications] scheduleNotification: permission not granted.'
        );
        return null;
      }

      return scheduleWakeUpNotification(wakeTime);
    },
    [hasPermission, requestPermissions]
  );

  // ─── cancelNotifications ──────────────────────────────────────────────────
  /**
   * Cancel every scheduled notification for this app.
   * Useful on sign-out or when the user disables reminders entirely.
   *
   * @returns {Promise<void>}
   */
  const cancelNotifications = useCallback(async () => {
    try {
      await cancelAllNotifications();
    } catch (err) {
      console.error('[useNotifications] cancelNotifications failed:', err);
    }
  }, []);

  // ─── cancelWakeUp ─────────────────────────────────────────────────────────
  /**
   * Cancel only the daily wake-up dream reminder notification.
   *
   * @returns {Promise<void>}
   */
  const cancelWakeUp = useCallback(async () => {
    try {
      await cancelWakeUpNotification();
    } catch (err) {
      console.error('[useNotifications] cancelWakeUp failed:', err);
    }
  }, []);

  return {
    hasPermission,
    requestPermissions,
    scheduleNotification,
    cancelNotifications,
    cancelWakeUp,
  };
}

export default useNotifications;
