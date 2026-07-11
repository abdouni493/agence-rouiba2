/**
 * Notification Service
 * Handles browser notifications and scheduled alerts for reservations expiring tomorrow
 */

export interface ScheduledNotification {
  id: string;
  reservationId: string;
  type: 'reservation_expiry';
  scheduledTime: string; // ISO string for 9:00 AM on expiry day
  message: string;
  triggered: boolean;
}

const STORAGE_KEY = 'scheduled_notifications';

/**
 * Request permission for browser notifications (if needed)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Send a browser notification
 */
export function sendNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!('Notification' in window)) {
    console.log('Browser notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return null;
  }

  return new Notification(title, {
    icon: '🚗',
    ...options
  });
}

/**
 * Schedule a notification for 9:00 AM on a specific date
 */
export function scheduleNotification(
  reservationId: string,
  expiryDate: Date,
  message: string
): ScheduledNotification {
  // Create a date for 9:00 AM on the expiry date
  const scheduledTime = new Date(expiryDate);
  scheduledTime.setHours(9, 0, 0, 0);

  const notification: ScheduledNotification = {
    id: `${reservationId}-expiry-9am`,
    reservationId,
    type: 'reservation_expiry',
    scheduledTime: scheduledTime.toISOString(),
    message,
    triggered: false
  };

  // Save to localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  const notifications: ScheduledNotification[] = stored ? JSON.parse(stored) : [];

  // Remove duplicates
  const filtered = notifications.filter(n => n.id !== notification.id);
  filtered.push(notification);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  console.log('[Notification] Scheduled notification:', notification);

  return notification;
}

/**
 * Check and trigger scheduled notifications
 * Call this periodically (e.g., every minute)
 */
export function checkAndTriggerScheduledNotifications(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  const notifications: ScheduledNotification[] = JSON.parse(stored);
  const now = new Date();
  let updated = false;

  notifications.forEach(notif => {
    if (!notif.triggered) {
      const scheduledTime = new Date(notif.scheduledTime);
      // Trigger if we're within 5 minutes of scheduled time or past it
      const timeDiff = Math.abs(now.getTime() - scheduledTime.getTime());
      const minutesDiff = timeDiff / (1000 * 60);

      if (minutesDiff <= 5) {
        sendNotification('🔔 ' + notif.message, {
          badge: '🚗',
          tag: notif.id
        });
        notif.triggered = true;
        updated = true;
        console.log('[Notification] Triggered scheduled notification:', notif.id);
      }
    }
  });

  if (updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }
}

/**
 * Remove a scheduled notification
 */
export function removeScheduledNotification(notificationId: string): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  const notifications: ScheduledNotification[] = JSON.parse(stored);
  const filtered = notifications.filter(n => n.id !== notificationId);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  console.log('[Notification] Removed scheduled notification:', notificationId);
}

/**
 * Get all scheduled notifications
 */
export function getScheduledNotifications(): ScheduledNotification[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Clear all triggered notifications (cleanup)
 */
export function clearTriggeredNotifications(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  const notifications: ScheduledNotification[] = JSON.parse(stored);
  const active = notifications.filter(n => !n.triggered);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
  console.log('[Notification] Cleared triggered notifications');
}
