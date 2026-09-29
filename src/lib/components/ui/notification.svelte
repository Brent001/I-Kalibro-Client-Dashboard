<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { Check, CircleAlert, Info, TriangleAlert, X } from '@lucide/svelte';

  export let message: string = '';
  export let type: 'success' | 'error' | 'warning' | 'info' = 'info';
  export let duration: number = 5000;
  export let show: boolean = true;
  export let title: string = '';
  export let actionUrl: string = '';
  export let actionText: string = '';
  export let timestamp: Date | undefined = undefined;
  export let loading: boolean = false;

  const dispatch = createEventDispatcher();

  let timeoutId: NodeJS.Timeout;
  let progressBarWidth = 100;
  let progressInterval: NodeJS.Timeout;

  $: if (show && duration > 0 && !loading) {
    startProgressBar();
    timeoutId = setTimeout(() => {
      close();
    }, duration);
  }

  $: if (!show) {
    clearTimeouts();
  }

  function startProgressBar() {
    const startTime = Date.now();
    const totalDuration = duration;

    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalDuration - elapsed);
      progressBarWidth = (remaining / totalDuration) * 100;

      if (remaining <= 0) {
        clearInterval(progressInterval);
      }
    }, 50);
  }

  function clearTimeouts() {
    if (timeoutId) clearTimeout(timeoutId);
    if (progressInterval) clearInterval(progressInterval);
  }

  function close() {
    show = false;
    clearTimeouts();
    dispatch('close');
  }

  function handleAction() {
    if (actionUrl) {
      window.location.href = actionUrl;
    }
    dispatch('action');
  }

  function getTypeClasses() {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-emerald-50 to-green-50',
          border: 'border-emerald-200',
          text: 'text-emerald-800',
          icon: 'text-emerald-600',
          progress: 'bg-emerald-500'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-rose-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          progress: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          icon: 'text-amber-600',
          progress: 'bg-amber-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          progress: 'bg-blue-500'
        };
    }
  }

  function getIcon() {
    switch (type) {
      case 'success':
        return Check;
      case 'error':
        return CircleAlert;
      case 'warning':
        return TriangleAlert;
      case 'info':
      default:
        return Info;
    }
  }

  function formatTimestamp(date: Date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
</script>

{#if show}
  <div
    class="fixed top-4 right-4 z-50 max-w-sm w-full {getTypeClasses().bg} {getTypeClasses().border} border rounded-xl p-4 shadow-xl transition-all duration-500 ease-out transform translate-x-full animate-slide-in"
    role="alert"
    style="animation: slideIn 0.5s ease-out forwards;"
  >
    <!-- Skeleton Loading State -->
    {#if loading}
      <div class="animate-pulse">
        <div class="flex items-start space-x-3">
          <div class="w-5 h-5 bg-gray-300 rounded"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-300 rounded w-3/4"></div>
            <div class="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
          <div class="w-4 h-4 bg-gray-300 rounded"></div>
        </div>
      </div>
    {:else}
      <!-- Notification Content -->
      <div class="flex items-start space-x-3">
        <!-- Icon -->
        <div class="flex-shrink-0 mt-0.5">
          <div class="w-8 h-8 {getTypeClasses().icon} bg-white bg-opacity-50 rounded-full flex items-center justify-center shadow-sm">
            <svelte:component this={getIcon()} size={20} strokeWidth={2} aria-hidden="true" />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          {#if title}
            <h4 class="text-sm font-semibold {getTypeClasses().text} mb-1">{title}</h4>
          {/if}
          <p class="text-sm {getTypeClasses().text} leading-relaxed">{message}</p>

          <!-- Timestamp and Action -->
          <div class="flex items-center justify-between mt-2">
            {#if timestamp}
              <span class="text-xs text-gray-500">{formatTimestamp(timestamp)}</span>
            {:else}
              <span></span>
            {/if}

            {#if actionText && actionUrl}
              <button
                on:click={handleAction}
                class="text-xs font-medium {getTypeClasses().icon} hover:underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current rounded px-2 py-1"
              >
                {actionText}
              </button>
            {/if}
          </div>
        </div>

        <!-- Close Button -->
        <div class="flex-shrink-0">
          <button
            on:click={close}
            class="w-6 h-6 {getTypeClasses().text} hover:bg-black hover:bg-opacity-5 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current transition-colors duration-200"
            aria-label="Close notification"
          >
            <X size={12} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Progress Bar -->
      {#if duration > 0}
        <div class="mt-3 bg-gray-200 bg-opacity-50 rounded-full h-1 overflow-hidden">
          <div
            class="h-full {getTypeClasses().progress} transition-all duration-50 ease-linear rounded-full"
            style="width: {progressBarWidth}%"
          ></div>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in {
    animation: slideIn 0.5s ease-out forwards;
  }
</style>