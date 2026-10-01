import { writable } from 'svelte/store';

export type NotificationPreferenceKey = 'due_reminder' | 'overdue' | 'reservation_ready' | 'return_confirmation';
export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const defaultNotificationPreferences: NotificationPreferences = {
  due_reminder: true,
  overdue: true,
  reservation_ready: true,
  return_confirmation: true
};

export const notificationPreferences = writable<NotificationPreferences>({ ...defaultNotificationPreferences });

function preferencesStorageKey(userId: number | string) {
  return `client-notification-preferences:${userId}`;
}

export function loadNotificationPreferences(userId: number | string): NotificationPreferences {
  let preferences = { ...defaultNotificationPreferences };
  try {
    const stored = localStorage.getItem(preferencesStorageKey(userId));
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      for (const key of Object.keys(defaultNotificationPreferences) as NotificationPreferenceKey[]) {
        if (typeof parsed[key] === 'boolean') preferences[key] = parsed[key] as boolean;
      }
    }
  } catch {
    // Keep defaults when storage is unavailable or contains invalid data.
  }
  notificationPreferences.set(preferences);
  return preferences;
}

export function saveNotificationPreferences(userId: number | string, preferences: NotificationPreferences): void {
  const normalized = { ...defaultNotificationPreferences, ...preferences };
  notificationPreferences.set(normalized);
  try {
    localStorage.setItem(preferencesStorageKey(userId), JSON.stringify(normalized));
  } catch {
    // Keep the active session preference even if browser storage is unavailable.
  }
}

export function isNotificationEnabled(type: string, preferences: NotificationPreferences): boolean {
  return type in preferences ? preferences[type as NotificationPreferenceKey] : true;
}

export interface PersistedNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  relatedItemType: string | null;
  relatedItemId: number | null;
  isRead: boolean | null;
  sentAt: string | null;
}

export const persistedNotifications = writable<PersistedNotification[]>([]);

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  timestamp?: Date;
  title?: string;
  actionUrl?: string;
  actionText?: string;
}

function createNotificationStore() {
  const { subscribe, update } = writable<Notification[]>([]);

  return {
    subscribe,
    show: (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000, options?: { title?: string; actionUrl?: string; actionText?: string }) => {
      const id = Date.now().toString();
      const notification: Notification = {
        id,
        message,
        type,
        duration,
        timestamp: new Date(),
        ...options
      };

      update(notifications => [...notifications, notification]);

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          update(notifications => notifications.filter(n => n.id !== id));
        }, duration);
      }
    },
    remove: (id: string) => {
      update(notifications => notifications.filter(n => n.id !== id));
    },
    clear: () => {
      update(() => []);
    }
  };
}

export const notifications = createNotificationStore();