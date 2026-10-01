<script lang="ts">
  import { onMount } from 'svelte';
  import { isNotificationEnabled, notificationPreferences, notifications, persistedNotifications, type PersistedNotification } from '$lib/stores/notificationStore.js';
  import Notification from './notification.svelte';

  let serverNotifications: PersistedNotification[] = [];
  const dismissedIds = new Set<number>();
  $: visibleServerNotifications = serverNotifications.filter((item) => isNotificationEnabled(item.type, $notificationPreferences));

  async function loadServerNotifications() {
    try {
      const response = await fetch('/api/notifications?limit=50', { credentials: 'include' });
      if (!response.ok) return;
      const result = await response.json();
      const received: PersistedNotification[] = result.data?.notifications ?? [];
      persistedNotifications.set(received);
      const unread = received.filter((item) => !item.isRead && !dismissedIds.has(item.id));
      serverNotifications = unread;
    } catch {
      // Retain the last successful server state while offline.
    }
  }

  async function dismissServerNotification(id: number) {
    dismissedIds.add(id);
    serverNotifications = serverNotifications.filter((item) => item.id !== id);
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
      if (!response.ok) throw new Error('Unable to mark notification as read');
      persistedNotifications.update((items) => items.map((item) => item.id === id ? { ...item, isRead: true } : item));
    } catch {
      dismissedIds.delete(id);
      await loadServerNotifications();
    }
  }

  function toastType(type: string): 'success' | 'error' | 'warning' | 'info' {
    if (type === 'overdue') return 'error';
    if (type === 'due_reminder') return 'warning';
    if (type === 'reservation_ready' || type === 'return_confirmation') return 'success';
    return 'info';
  }

  onMount(() => {
    void loadServerNotifications();
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void loadServerNotifications();
    };
    const interval = window.setInterval(refreshIfVisible, 60_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  });
</script>

<div class="fixed top-4 right-4 z-50 space-y-3 max-h-screen overflow-y-auto">
  {#each $notifications as notification (notification.id)}
    <Notification
      message={notification.message}
      type={notification.type}
      duration={notification.duration || 5000}
      title={notification.title || ''}
      actionUrl={notification.actionUrl || ''}
      actionText={notification.actionText || ''}
      timestamp={notification.timestamp}
      on:close={() => notifications.remove(notification.id)}
      on:action={() => {
        // Handle action click if needed
        console.log('Action clicked for notification:', notification.id);
      }}
    />
  {/each}
  {#each visibleServerNotifications.slice(0, 3) as notification (notification.id)}
    <Notification
      message={notification.message}
      type={toastType(notification.type)}
      duration={0}
      title={notification.title}
      timestamp={notification.sentAt ? new Date(notification.sentAt) : undefined}
      on:close={() => { void dismissServerNotification(notification.id); }}
    />
  {/each}
</div>