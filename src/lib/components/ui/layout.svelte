<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { writable, get } from "svelte/store";
  import NotificationContainer from "./notificationContainer.svelte";
  import { notifications } from "$lib/stores/notificationStore.js";

  export let onLogout: () => void = () => {};
  
  const sidebarOpen = writable(false);
  let isLoggingOut = false;
  let showLogoutOptions = false;
  let showNotificationPanel = false;
  let showLogoutConfirm = false;
  let logoutAllDevices = false;
  
  const userStore = writable<{
    id?: string;
    name?: string;
    username?: string;
    email?: string;
    userType?: string;
    isActive?: boolean;
  } | null>(null);
  
  const isLoadingStore = writable(true);
  const sessionErrorStore = writable(false);
  
  type UserType = {
    id?: string;
    name?: string;
    username?: string;
    email?: string;
    userType?: string;
    isActive?: boolean;
  } | null;

  let user: UserType = null;
  let isLoadingUser = true;
  let sessionError = false;
  
  $: user = $userStore;
  $: isLoadingUser = $isLoadingStore;
  $: sessionError = $sessionErrorStore;

  const navigation = [
    {
      name: "Home",
      href: "/dashboard",
      roles: ["student", "faculty", "client", "guest"],
      icon: `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 22V12h6v10"/></svg>`,
      description: "Dashboard overview"
    },
    {
      name: "Books",
      href: "/dashboard/books",
      roles: ["student", "faculty", "client", "guest"],
      icon: `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`,
      description: "Browse catalog"
    },
    {
      name: "Magazines",
      href: "/dashboard/magazines",
      roles: ["student", "faculty", "client", "guest"],
      icon: `<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="14" height="16" rx="2" ry="2"/><path d="M7 8h6"/></svg>`,
      description: "Browse periodicals"
    },
    {
      name: "Research Docs",
      href: "/dashboard/research",
      roles: ["student", "faculty", "client", "guest"],
      icon: `<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6"/><path d="M5 22h14"/><path d="M8 8h8v12H8z"/></svg>`,
      description: "Papers & documents"
    },
    {
      name: "Journal",
      href: "/dashboard/journal",
      roles: ["student", "faculty", "client", "guest"],
      icon: `<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h4"/></svg>`,
      description: "Scholarly journals"
    },
    {
      name: "New Arrivals",
      href: "/dashboard/new",
      roles: ["student", "faculty", "client", "guest"],
      icon: `<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>`,
      description: "Recently added titles"
    },
    {
      name: "My Books",
      href: "/dashboard/issued",
      roles: ["student", "faculty"],
      icon: `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/></svg>`,
      description: "Issued books"
    },
    {
      name: "QR View",
      href: "/dashboard/qr_view",
      roles: ["student", "faculty"],
      icon: `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"/></svg>`,
      description: "Show QR for time in/out"
    },
    {
      name: "Profile",
      href: "/dashboard/profile",
      roles: ["student", "faculty", "client"],
      icon: `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>`,
      description: "Account settings"
    }
  ];

  $: visibleNavigation = (() => {
    const userType = (user && user.userType) ? String(user.userType).toLowerCase() : 'guest';
    return navigation.filter(nav => {
      if (!nav.roles) return true;
      return nav.roles.map(r => String(r).toLowerCase()).includes(userType);
    });
  })();

  let currentPath = "";
  $: currentPath = $page.url.pathname;

  $: activeNavHref = (() => {
    const matching = visibleNavigation
      .filter(nav => currentPath === nav.href || currentPath.startsWith(nav.href + "/"))
      .sort((a, b) => b.href.length - a.href.length);
    return matching.length > 0 ? matching[0].href : "";
  })();

  // The icon for the currently active page (used in the header)
  $: activePageIcon = (() => {
    const item = visibleNavigation.find(nav => nav.href === activeNavHref);
    return item?.icon ?? `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 22V12h6v10"/></svg>`;
  })();

  async function fetchUserSession() {
    if (!browser) return;
    if (get(userStore) !== null) { isLoadingStore.set(false); return; }
    try {
      isLoadingStore.set(true);
      sessionErrorStore.set(false);
      const response = await fetch('/api/auth/session', { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.user) userStore.set(result.data.user);
        else sessionErrorStore.set(true);
      } else if (response.status === 401) {
        userStore.set(null);
        if (browser) await goto('/', { replaceState: true, noScroll: true });
      } else { sessionErrorStore.set(true); }
    } catch { sessionErrorStore.set(true); }
    finally { isLoadingStore.set(false); }
  }

  async function handleLogout(logoutAllDevicesFlag: boolean = false) {
    if (isLoggingOut) return;
    isLoggingOut = true; showLogoutOptions = false; showLogoutConfirm = false;
    try {
      const response = await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ logoutAllDevices: logoutAllDevicesFlag, reason: 'user_logout' }) });
      const result = await response.json();
      if (result.success) {
        userStore.set(null); onLogout();
        notifications.show(logoutAllDevicesFlag ? 'Logged out from all devices successfully' : 'Logged out successfully', 'success');
        if (browser) await goto('/', { replaceState: true, noScroll: true });
      } else {
        notifications.show(result.message || 'Logout completed with some issues', 'warning');
        if (browser) await goto('/', { replaceState: true, noScroll: true });
      }
    } catch {
      notifications.show('Network error during logout. Redirecting...', 'error');
      if (browser) await goto('/', { replaceState: true, noScroll: true });
    } finally { isLoggingOut = false; }
  }

  function handleClickOutside(event: Event) {
    if (showLogoutOptions) { const t = event.target as Element; if (!t.closest('.logout-menu')) showLogoutOptions = false; }
    if (showNotificationPanel) { const t = event.target as Element; if (!t.closest('.notification-panel') && !t.closest('.notification-bell')) showNotificationPanel = false; }
  }

  function getNotificationIconColor(type: string) {
    switch (type) { case 'success': return 'text-emerald-600'; case 'error': return 'text-red-600'; case 'warning': return 'text-amber-600'; default: return 'text-blue-600'; }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'success': return `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`;
      case 'error': return `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`;
      case 'warning': return `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`;
      default: return `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`;
    }
  }

  function formatTimestamp(date: Date) {
    const now = new Date(); const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000); const hours = Math.floor(diff / 3600000); const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now'; if (minutes < 60) return `${minutes}m ago`; if (hours < 24) return `${hours}h ago`; return `${days}d ago`;
  }

  function handleNotificationAction(notification: any) {
    if (notification.actionUrl) { showNotificationPanel = false; window.location.href = notification.actionUrl; }
  }

  onMount(() => {
    if (browser) {
      fetchUserSession();
      let isCheckPending = false;
      const sessionCheckInterval = setInterval(async () => {
        if (isCheckPending || !$userStore) return;
        try {
          isCheckPending = true;
          const response = await fetch('/api/auth/session', { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
          if (response.status === 401) { userStore.set(null); notifications.show('Your session has been revoked. Please log in again.', 'error'); if (browser) await goto('/', { replaceState: true, noScroll: true }); }
          else if (!response.ok) { userStore.set(null); if (browser) await goto('/', { replaceState: true, noScroll: true }); }
        } catch { console.error('Session check failed'); }
        finally { isCheckPending = false; }
      }, 60000);
      document.addEventListener('click', handleClickOutside);
      return () => { document.removeEventListener('click', handleClickOutside); clearInterval(sessionCheckInterval); };
    }
  });

  function capitalize(str: string | undefined) {
    if (!str) return "";
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  function getUserInitials(): string {
    if (!user) return 'G';
    const name = user.name || user.username || 'Guest';
    return name.charAt(0).toUpperCase();
  }

  function getPageTitle(): string {
    const item = visibleNavigation.find(nav => nav.href === activeNavHref);
    return item ? item.name : "Dashboard";
  }
</script>

<div class="flex h-screen bg-gradient-to-br from-[#E8F5E9] via-[#F5F5DC] to-[#FFF8E1]">

  <!-- ═══════════════════════════════════════
       SIDEBAR
  ════════════════════════════════════════ -->
  <aside
    class="fixed inset-y-0 left-0 z-50 w-[264px] flex flex-col
           bg-white border-r border-slate-200/80
           shadow-[4px_0_24px_-4px_rgba(0,0,0,0.08)]
           transform transition-transform duration-300 ease-in-out
           lg:translate-x-0 lg:static lg:inset-0"
    class:translate-x-0={$sidebarOpen}
    class:-translate-x-full={!$sidebarOpen}
  >

    <!-- Logo bar -->
    <div class="h-[60px] px-4 flex items-center justify-between
                bg-gradient-to-r from-[#0D5C29] to-[#1a7a3a]
                border-b border-[#0a4a21] flex-shrink-0">
      <div class="flex items-center gap-3">
        <img src="/assets/logo.png" alt="e-Kalibro Logo" class="w-10 h-10 object-contain flex-shrink-0 drop-shadow-md" />
        <div>
          <h1 class="text-[16px] font-bold text-white leading-none tracking-tight">e-Kalibro</h1>
          <p class="text-[9px] text-[#E8B923] font-semibold uppercase tracking-[0.12em] mt-0.5">Library System</p>
        </div>
      </div>
      <button
        class="lg:hidden w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/15 transition-colors"
        on:click={() => sidebarOpen.set(false)} aria-label="Close sidebar"
      >
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Nav section label -->
    <div class="px-4 pt-4 pb-1.5 flex-shrink-0">
      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em]">Navigation</span>
    </div>

    <!-- Nav items -->
    <nav class="flex-1 overflow-y-auto px-2.5 pb-2 space-y-0.5 sidebar-nav">
      {#each visibleNavigation as item}
        <a
          href={item.href}
          class="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150
            {activeNavHref === item.href
              ? 'bg-[#0D5C29] text-white shadow-sm'
              : 'text-slate-600 hover:bg-[#F0FAF3] hover:text-[#0D5C29]'}"
          on:click|preventDefault={async () => { sidebarOpen.set(false); await goto(item.href, { noScroll: true }); }}
        >
          {#if activeNavHref === item.href}
            <span class="absolute left-0 inset-y-2 w-[3px] bg-[#E8B923] rounded-r-full"></span>
          {/if}
          <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
            {activeNavHref === item.href
              ? 'bg-white/15 text-[#E8B923]'
              : 'bg-slate-100 text-slate-500 group-hover:bg-[#D9F0E1] group-hover:text-[#0D5C29]'}">
            {@html item.icon}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-[14px] leading-none truncate">{item.name}</p>
            <p class="text-[11.5px] mt-1 truncate leading-none
              {activeNavHref === item.href ? 'text-white/60' : 'text-slate-400 group-hover:text-[#4A7C59]'}">
              {item.description}
            </p>
          </div>
          {#if activeNavHref === item.href}
            <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#E8B923]"></span>
          {/if}
        </a>
      {/each}
    </nav>

    <!-- Divider -->
    <div class="mx-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0"></div>

    <!-- User card -->
    <div class="p-3 flex-shrink-0">
      <div class="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-lg bg-gradient-to-r from-[#F0FAF3] to-[#FAFFF6] border border-[#C8E6C9]">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#0D5C29] to-[#4A7C59] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm ring-2 ring-[#C8E6C9]">
          {getUserInitials()}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-semibold text-slate-800 truncate leading-none">{user?.username || 'User'}</p>
          <div class="flex items-center gap-1 mt-0.5">
            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0"></span>
            <p class="text-[10px] text-slate-500 truncate">{capitalize(user?.userType || 'guest')}</p>
          </div>
        </div>
      </div>

      <div class="relative logout-menu">
        <button
          on:click|stopPropagation={() => showLogoutOptions = !showLogoutOptions}
          disabled={isLoggingOut}
          class="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-[12px] font-medium rounded-lg transition-all duration-150
                 text-slate-600 bg-slate-50 border border-slate-200
                 hover:bg-[#FFF3E0] hover:text-[#B8560B] hover:border-[#E8B923]/50
                 {isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          <span>{isLoggingOut ? 'Signing out…' : 'Sign out'}</span>
        </button>

        {#if showLogoutOptions && !isLoggingOut}
          <div class="absolute bottom-full left-0 right-0 mb-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-slideUp">
            <button
              on:click={() => { logoutAllDevices = false; showLogoutConfirm = true; }}
              class="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] text-slate-700 hover:bg-[#F0FAF3] hover:text-[#0D5C29] transition-colors"
            >
              <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <span class="font-medium">Sign out this device</span>
            </button>
            <div class="h-px bg-slate-100 mx-3"></div>
            <button
              on:click={() => { logoutAllDevices = true; showLogoutConfirm = true; }}
              class="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <span class="font-medium">Sign out all devices</span>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </aside>

  <!-- ═══════════════════════════════════════
       MAIN CONTENT
  ════════════════════════════════════════ -->
  <div class="flex-1 flex flex-col overflow-hidden min-w-0">

    <!-- Top header -->
    <header class="h-16 sm:h-[4.25rem] bg-gradient-to-r from-white via-[#FFFBF0] to-[#FFF8E6] shadow-md border-b-2 border-[#E8B923]/30 flex items-center justify-between px-3 sm:px-6 z-10 flex-shrink-0">
      <div class="flex items-center gap-2 sm:gap-4 min-w-0">
        <button class="lg:hidden p-2 hover:bg-[#E8B923]/10 rounded-lg transition-colors shrink-0" on:click={() => sidebarOpen.set(true)} aria-label="Open menu">
          <svg class="h-5 w-5 text-slate-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <!-- Dynamic icon: matches the active page's sidebar icon -->
          <div class="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#0D5C29] to-[#4A7C59] rounded-lg flex items-center justify-center border-2 border-[#E8B923]/40 shadow-sm shrink-0
                      [&_svg]:w-4 [&_svg]:h-4 [&_svg]:text-[#E8B923] [&_svg]:stroke-[#E8B923]">
            {@html activePageIcon}
          </div>
          <div class="min-w-0">
            <h1 class="text-base sm:text-lg font-bold text-slate-900 leading-none truncate">{getPageTitle()}</h1>
            <p class="text-[11px] sm:text-sm text-slate-500 mt-0.5 truncate">Welcome back, {user?.username || 'User'}</p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <!-- Notifications bell -->
        <div class="relative notification-bell">
          <button
            class="relative p-2 text-slate-500 hover:text-[#0D5C29] hover:bg-[#E8B923]/10 rounded-lg transition-all duration-150 border border-transparent hover:border-[#E8B923]/30"
            aria-label="Notifications"
            on:click={() => showNotificationPanel = !showNotificationPanel}
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7C18 6.279 15.464 4 12.25 4s-5.75 2.279-5.75 5.05v.7a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
            </svg>
            {#if $notifications.length > 0}
              <span class="absolute -top-0.5 -right-0.5 h-4 w-4 bg-gradient-to-br from-[#E8B923] to-[#B8860B] text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow ring-2 ring-white">
                {$notifications.length > 9 ? '9+' : $notifications.length}
              </span>
            {:else}
              <span class="absolute top-1.5 right-1.5 h-2 w-2 bg-[#E8B923] rounded-full ring-2 ring-white"></span>
            {/if}
          </button>

          {#if showNotificationPanel}
            <div class="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-auto sm:mt-2 w-auto sm:w-96 bg-white rounded-xl shadow-2xl border-2 border-[#E8B923]/40 z-50 overflow-hidden notification-panel animate-slideDown">
              <div class="bg-gradient-to-r from-[#0D5C29] to-[#4A7C59] px-4 py-3 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-[#E8B923]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                  <h3 class="text-sm font-bold text-white">Notifications</h3>
                </div>
                <div class="flex items-center gap-2">
                  {#if $notifications.length > 0}
                    <button on:click={() => notifications.clear()} class="text-xs text-white/70 hover:text-white underline">Clear all</button>
                  {/if}
                  <button on:click={() => showNotificationPanel = false} class="text-white/70 hover:text-white hover:bg-white/20 rounded p-1 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
              <div class="max-h-96 overflow-y-auto">
                {#if $notifications.length === 0}
                  <div class="p-8 text-center">
                    <div class="w-14 h-14 bg-[#F0FAF3] border-2 border-[#C8E6C9] rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg class="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                      </svg>
                    </div>
                    <p class="text-sm font-semibold text-slate-800 mb-1">All caught up!</p>
                    <p class="text-xs text-slate-400">No new notifications</p>
                  </div>
                {:else}
                  <div class="divide-y divide-slate-100">
                    {#each $notifications as notification (notification.id)}
                      <div class="p-4 hover:bg-[#F0FAF3] transition-colors cursor-pointer group">
                        <div class="flex gap-3">
                          <div class="flex-shrink-0 mt-0.5">
                            <div class="w-8 h-8 {getNotificationIconColor(notification.type)} bg-opacity-10 rounded-lg flex items-center justify-center border border-current border-opacity-20">
                              {@html getNotificationIcon(notification.type)}
                            </div>
                          </div>
                          <div class="flex-1 min-w-0">
                            {#if notification.title}<h4 class="text-sm font-semibold text-slate-900 mb-0.5">{notification.title}</h4>{/if}
                            <p class="text-sm text-slate-600 leading-relaxed">{notification.message}</p>
                            <div class="flex items-center justify-between mt-1.5">
                              {#if notification.timestamp}<span class="text-xs text-slate-400">{formatTimestamp(notification.timestamp)}</span>{:else}<span></span>{/if}
                              {#if notification.actionText && notification.actionUrl}
                                <button on:click={() => handleNotificationAction(notification)} class="text-xs font-semibold text-[#0D5C29] hover:underline">{notification.actionText} →</button>
                              {/if}
                            </div>
                          </div>
                          <button on:click={() => notifications.remove(notification.id)} class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 rounded p-1 transition-all flex-shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>

        <!-- User avatar chip -->
        <div class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-sm">
          <div class="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#0D5C29] to-[#4A7C59] text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">
            {getUserInitials()}
          </div>
          <span class="text-xs sm:text-sm font-semibold text-slate-700 hidden sm:block">{user?.username || 'User'}</span>
        </div>
      </div>
    </header>

    <!-- Page content -->
    <main class="flex-1 overflow-y-auto bg-gradient-to-br from-[#F5F5DC] via-[#FDFBF3] to-[#FFF9E6] p-2 sm:p-3">
      <div class="max-w-7xl mx-auto w-full">
        <slot />
      </div>
    </main>
  </div>

  <!-- Mobile overlay -->
  {#if $sidebarOpen}
    <div
      class="fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-sm lg:hidden"
      on:click={() => sidebarOpen.set(false)}
      on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { sidebarOpen.set(false); e.preventDefault(); } }}
      role="button" tabindex="0" aria-label="Close sidebar"
    ></div>
  {/if}

  <!-- Logout confirm modal -->
  {#if showLogoutConfirm}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 animate-scaleIn">
        <div class="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 border-2 border-red-100">
          <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-900 text-center mb-1.5">
          {logoutAllDevices ? 'Sign out everywhere?' : 'Sign out?'}
        </h3>
        <p class="text-slate-500 text-center text-xs sm:text-sm mb-5 leading-relaxed">
          {logoutAllDevices
            ? 'You will be signed out from all devices and active sessions.'
            : 'Are you sure you want to sign out from this device?'}
        </p>
        <div class="flex gap-2.5">
          <button
            on:click={() => showLogoutConfirm = false}
            class="flex-1 px-4 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >Cancel</button>
          <button
            on:click={() => handleLogout(logoutAllDevices)}
            disabled={isLoggingOut}
            class="flex-1 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors disabled:opacity-50"
          >{isLoggingOut ? 'Signing out…' : 'Sign out'}</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<NotificationContainer />

<style>
  @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp   { from { opacity: 0; transform: translateY(8px);  } to { opacity: 1; transform: translateY(0); } }
  @keyframes scaleIn   { from { opacity: 0; transform: scale(0.96);      } to { opacity: 1; transform: scale(1);    } }

  .animate-slideDown { animation: slideDown 0.18s ease-out; }
  .animate-slideUp   { animation: slideUp   0.18s ease-out; }
  .animate-scaleIn   { animation: scaleIn   0.18s ease-out; }

  .sidebar-nav { scrollbar-width: none; -ms-overflow-style: none; }
  .sidebar-nav::-webkit-scrollbar { display: none; }

  :global(html) { scroll-behavior: smooth; }

  main::-webkit-scrollbar { width: 6px; }
  main::-webkit-scrollbar-track { background: transparent; }
  main::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #E8B923, #B8860B); border-radius: 99px; }
  main::-webkit-scrollbar-thumb:hover { background: #B8860B; }

  :global(*:focus-visible) { outline: 2px solid #E8B923; outline-offset: 2px; border-radius: 6px; }
</style>