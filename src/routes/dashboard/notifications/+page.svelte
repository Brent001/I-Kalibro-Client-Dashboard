<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Bell, RefreshCw } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { getNotificationDestination } from '$lib/utils/notificationNavigation.js';
  import {
    defaultNotificationPreferences,
    isNotificationEnabled,
    loadNotificationPreferences,
    notificationPreferences,
    saveNotificationPreferences,
    type NotificationPreferenceKey
  } from '$lib/stores/notificationStore.js';

  interface Notification {
    id: number;
    title: string;
    message: string;
    type: string;
    relatedItemType: string | null;
    relatedItemId: number | null;
    isRead: boolean | null;
    sentAt: string | null;
  }

  let notifications: Notification[] = [];
  let loading = true;
  let saving = false;
  let errorMessage = '';
  let showPreferences = false;
  $: visibleNotifications = notifications.filter((item) => isNotificationEnabled(item.type, $notificationPreferences));
  $: unreadCount = visibleNotifications.filter((item) => !item.isRead).length;

  const preferenceOptions: { key: NotificationPreferenceKey; label: string; description: string }[] = [
    { key: 'due_reminder', label: 'Due reminders', description: 'Upcoming return dates' },
    { key: 'overdue', label: 'Overdue alerts', description: 'Items past their due date' },
    { key: 'reservation_ready', label: 'Reservation updates', description: 'Approved reservation notices' },
    { key: 'return_confirmation', label: 'Return confirmations', description: 'Completed return notices' }
  ];

  function updatePreference(key: NotificationPreferenceKey, enabled: boolean) {
    const userId = $page.data?.user?.id;
    if (userId == null) return;
    saveNotificationPreferences(userId, { ...$notificationPreferences, [key]: enabled });
  }

  function resetPreferences() {
    const userId = $page.data?.user?.id;
    if (userId == null) return;
    saveNotificationPreferences(userId, { ...defaultNotificationPreferences });
  }

  async function loadNotifications(background = false) {
    if (!background) loading = true;
    errorMessage = '';
    try {
      const response = await fetch('/api/notifications?limit=100', { credentials: 'include' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load notifications');
      notifications = result.data.notifications;
    } catch (cause) {
      errorMessage = cause instanceof Error ? cause.message : 'Unable to load notifications';
      if (!background) notifications = [];
    } finally {
      if (!background) loading = false;
    }
  }

  async function markRead(notificationId?: number) {
    if (saving) return;
    saving = true;
    errorMessage = '';
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationId ? { notificationId } : { markAll: true })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update notifications');
      notifications = notifications.map((item) =>
        notificationId === undefined || item.id === notificationId ? { ...item, isRead: true } : item
      );
    } catch (cause) {
      errorMessage = cause instanceof Error ? cause.message : 'Unable to update notifications';
    } finally {
      saving = false;
    }
  }

  async function openNotification(notification: Notification) {
    if (!notification.isRead) await markRead(notification.id);
    await goto(getNotificationDestination(notification));
  }

  function formatTimestamp(value: string | null) {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
  }

  onMount(() => {
    const userId = $page.data?.user?.id;
    if (userId != null) loadNotificationPreferences(userId);
    void loadNotifications();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadNotifications(true);
    };
    const interval = window.setInterval(refreshWhenVisible, 60_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  });
</script>

<svelte:head>
  <title>Notifications | I-Kalibro</title>
</svelte:head>

<main class="w-full space-y-2 text-sm" style="color:#2C1A0E;">
  <header class="relative overflow-hidden rounded-xl border px-3 py-3 shadow-sm sm:px-5 sm:py-3.5" style="background:linear-gradient(135deg,#3A6B3A 0%,#0D5C29 50%,#1A4D1A 100%);border-color:#1A4D1A;">
    <div class="pointer-events-none absolute inset-0 opacity-10" style="background-image:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,.05) 10px,rgba(255,255,255,.05) 11px);"></div>
    <div class="relative z-10 flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-3"><div class="flex h-11 w-11 items-center justify-center rounded-lg border-2" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);"><Bell class="h-5 w-5 text-white" strokeWidth={1.5} aria-hidden="true" /></div><div><h1 class="text-lg font-bold leading-tight text-[#F5F0E8] sm:text-xl">Notifications</h1><p class="mt-0.5 hidden text-xs text-white/70 sm:block sm:text-sm">{unreadCount} unread account updates</p></div></div><div class="flex items-center gap-2"><button type="button" class="flex h-9 w-9 items-center justify-center rounded-lg border text-[#F5F0E8] transition-colors hover:bg-white/10 disabled:opacity-50" style="border-color:rgba(255,255,255,.35);" aria-label="Refresh notifications" title="Refresh notifications" disabled={loading} onclick={() => loadNotifications()}><RefreshCw class="h-4 w-4" aria-hidden="true" /></button><button class="rounded-lg border px-3 py-2 text-xs font-bold text-[#F5F0E8] disabled:opacity-50" style="border-color:rgba(255,255,255,.35);" disabled={saving || unreadCount === 0} onclick={() => markRead()}>Mark all read</button></div></div>
  </header>

  <section class="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-sm font-semibold text-slate-800">Notification preferences</h2>
        <p class="text-xs text-slate-500">Saved on this device for your account.</p>
      </div>
      <button type="button" class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50" onclick={() => showPreferences = !showPreferences}>
        {showPreferences ? 'Hide preferences' : 'Manage preferences'}
      </button>
    </div>
    {#if showPreferences}
      <div class="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
        {#each preferenceOptions as option}
          <label class="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2">
            <span>
              <span class="block text-xs font-semibold text-slate-700">{option.label}</span>
              <span class="block text-[11px] text-slate-500">{option.description}</span>
            </span>
            <input
              type="checkbox"
              checked={$notificationPreferences[option.key]}
              onchange={(event) => updatePreference(option.key, event.currentTarget.checked)}
              class="h-4 w-4 rounded border-slate-300 text-[#0D5C29] focus:ring-[#0D5C29]"
              aria-label={`Show ${option.label.toLowerCase()}`}
            />
          </label>
        {/each}
        <button type="button" class="justify-self-start px-1 py-1 text-xs font-semibold text-[#0D5C29] hover:underline" onclick={resetPreferences}>Restore defaults</button>
      </div>
    {/if}
  </section>

    {#if errorMessage}
      <div class="mb-1 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm" style="background:#F5E6E6;border-color:#D4A0A0;color:#7A1A1A;" role="alert">
        <span>{errorMessage}</span>
        <button class="font-semibold underline" onclick={() => loadNotifications()}>Retry</button>
      </div>
    {/if}

    {#if loading}
      <div class="rounded-xl border px-4 py-12 text-center text-sm" style="background:#F5F0E8;border-color:#D4C4A8;color:#7A5A2A;" role="status">Loading notifications...</div>
    {:else if visibleNotifications.length === 0}
      <div class="rounded-xl border px-4 py-12 text-center" style="background:#F5F0E8;border-color:#D4C4A8;">
        <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg border-2" style="background:#EFF5EF;border-color:#B8D4B8;color:#0D5C29;"><svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5.85 3.5a.75.75 0 0 0-1.117-1A9.719 9.719 0 0 0 2.385 7.376m16.882-3.876a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25Z"/></svg></div>
        <h2 class="text-base font-bold" style="color:#2C1A0E;">You’re all caught up</h2>
        <p class="mt-1 text-sm" style="color:#9A7A5A;">New account updates will appear here.</p>
      </div>
    {:else}
      <ul class="overflow-hidden rounded-xl border shadow-sm" style="border-color:#D4C4A8;">
        {#each visibleNotifications as notification (notification.id)}
          <li class="flex gap-3 border-b px-3 py-4 last:border-0 sm:px-5 {notification.isRead ? 'opacity-70' : ''}" style="background:{notification.isRead ? '#F5F0E8' : '#FDF8F0'};border-color:#EDE4D4;">
            <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style="background:{notification.isRead ? '#C4B8A8' : '#B06A00'};" aria-label={notification.isRead ? 'Read' : 'Unread'}></span>
            <button type="button" class="min-w-0 flex-1 text-left" onclick={() => openNotification(notification)}>
              <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 class="font-bold" style="color:#1A3A1A;">{notification.title}</h2>
                <time class="text-xs" style="color:#9A7A5A;">{formatTimestamp(notification.sentAt)}</time>
              </div>
              <p class="mt-1 whitespace-pre-line text-sm leading-6" style="color:#5A4A3A;">{notification.message}</p>
              {#if notification.relatedItemType}
                <p class="mt-2 text-xs font-bold uppercase tracking-wide" style="color:#9A7A5A;">{notification.relatedItemType}{#if notification.relatedItemId} · #{notification.relatedItemId}{/if}</p>
              {/if}
              <span class="mt-2 block text-xs font-bold underline underline-offset-2" style="color:#0D5C29;">{notification.type === 'return_confirmation' ? 'View borrowing history' : notification.type === 'overdue' ? 'View overdue item' : notification.type === 'due_reminder' ? 'View borrowed item' : 'View in My Library'}</span>
            </button>
            {#if !notification.isRead}
              <button class="shrink-0 self-start text-xs font-bold underline underline-offset-4 disabled:opacity-50" style="color:#0D5C29;" disabled={saving} onclick={() => markRead(notification.id)}>Mark read</button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
</main>
