import { writable } from 'svelte/store';

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