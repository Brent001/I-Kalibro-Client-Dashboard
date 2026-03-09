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
      // Filled house icon
      icon: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z"/><path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a.75.75 0 0 0 .091-.086L12 5.432Z"/></svg>`,
      description: "Dashboard overview"
    },
    {
      name: "Books",
      href: "/dashboard/books",
      roles: ["student", "faculty", "client", "guest"],
      // Filled open book icon
      icon: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z"/></svg>`,
      description: "Browse catalog"
    },
    {
      name: "Magazines",
      href: "/dashboard/magazines",
      roles: ["student", "faculty", "client", "guest"],
      // Filled newspaper/magazine icon
      icon: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 0 0 3 3h15a3 3 0 0 1-3-3V4.875C17.25 3.839 16.41 3 15.375 3H4.125ZM12 9.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H12Zm-.75-2.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75ZM6 12.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5H6Zm-.75 3.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75ZM6 6.75a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3A.75.75 0 0 0 9 6.75H6Z" clip-rule="evenodd"/><path d="M18.75 6.75h1.875c.621 0 1.125.504 1.125 1.125V18a1.5 1.5 0 0 1-3 0V6.75Z"/></svg>`,
      description: "Browse periodicals"
    },
    {
      name: "Research Docs",
      href: "/dashboard/research",
      roles: ["student", "faculty", "client", "guest"],
      // Filled document-magnifying-glass icon
      icon: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.625 16.5a1.875 1.875 0 1 0 0-3.75 1.875 1.875 0 0 0 0 3.75Z"/><path fill-rule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875Zm6 16.5a3.375 3.375 0 1 0 0-6.75 3.375 3.375 0 0 0 0 6.75Zm2.424.12a.75.75 0 0 1 .531.22l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 .529-1.28Z" clip-rule="evenodd"/><path d="M14.25 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 16.5 7.5h-1.875a.375.375 0 0 1-.375-.375V5.25Z"/></svg>`,
      description: "Papers & documents"
    },
    {
      name: "Journal",
      href: "/dashboard/journal",
      roles: ["student", "faculty", "client", "guest"],
      // Filled clipboard/journal icon
      icon: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0 1 18 9.375v9.375a3 3 0 0 0 3-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 0 0-.673-.05A3 3 0 0 0 15 1.5h-1.5a3 3 0 0 0-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6ZM13.5 3A1.5 1.5 0 0 0 12 4.5h4.5A1.5 1.5 0 0 0 15 3h-1.5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V9.375Zm9.586 4.594a.75.75 0 0 0-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 0 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.116-.062l3-3.75Z" clip-rule="evenodd"/></svg>`,
      description: "Scholarly journals"
    },
    {
      name: "New Arrivals",
      href: "/dashboard/new",
      roles: ["student", "faculty", "client", "guest"],
      // Filled sparkles/star icon
      icon: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clip-rule="evenodd"/></svg>`,
      description: "Recently added titles"
    },
    {
      name: "My Books",
      href: "/dashboard/issued",
      roles: ["student", "faculty"],
      // Filled bookmark stack icon
      icon: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125V3.375Z"/><path d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 16.5 7.5h-1.875A.375.375 0 0 1 14.25 7.125v-.938a.375.375 0 0 0-.375-.375h-.563A.375.375 0 0 1 13.5 5.25H15ZM4.875 6H6a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H4.875a1.875 1.875 0 0 1-1.875-1.875V7.875C3 6.839 3.84 6 4.875 6Z"/></svg>`,
      description: "Issued books"
    },
    {
      name: "QR View",
      href: "/dashboard/qr_view",
      roles: ["student", "faculty"],
      // Filled QR code icon
      icon: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M3 4.875C3 3.839 3.84 3 4.875 3h4.5C10.41 3 11.25 3.84 11.25 4.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 0 1 3 9.375v-4.5ZM4.875 4.5a.375.375 0 0 0-.375.375v4.5c0 .207.168.375.375.375h4.5a.375.375 0 0 0 .375-.375v-4.5a.375.375 0 0 0-.375-.375h-4.5Zm7.875.375c0-1.036.84-1.875 1.875-1.875h4.5C20.16 3 21 3.84 21 4.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5a1.875 1.875 0 0 1-1.875-1.875v-4.5Zm1.875-.375a.375.375 0 0 0-.375.375v4.5c0 .207.168.375.375.375h4.5a.375.375 0 0 0 .375-.375v-4.5a.375.375 0 0 0-.375-.375h-4.5ZM6 6.75a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75H6.75A.75.75 0 0 1 6 7.5v-.75Zm9.75 0a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75ZM3 14.625c0-1.036.84-1.875 1.875-1.875h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.035-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 0 1 3 19.125v-4.5Zm1.875-.375a.375.375 0 0 0-.375.375v4.5c0 .207.168.375.375.375h4.5a.375.375 0 0 0 .375-.375v-4.5a.375.375 0 0 0-.375-.375h-4.5Zm7.875-.75a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75Zm6 0a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75ZM6 16.5a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75v-.75Zm9.75 0a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75Zm-3 3a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75Zm6 0a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75Z" clip-rule="evenodd"/></svg>`,
      description: "Show QR for time in/out"
    },
    {
      name: "Profile",
      href: "/dashboard/profile",
      roles: ["student", "faculty", "client"],
      // Filled user circle icon
      icon: `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clip-rule="evenodd"/></svg>`,
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

  // Reactive page title and icon — updates instantly when route changes
  $: activeNavItem = visibleNavigation.find(nav => nav.href === activeNavHref);
  $: pageTitle = activeNavItem?.name ?? "Dashboard";
  $: activePageIcon = activeNavItem?.icon ?? `<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z"/><path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a.75.75 0 0 0 .091-.086L12 5.432Z"/></svg>`;

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
      default: return `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`;
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
                      [&_svg]:w-4 [&_svg]:h-4 [&_svg]:text-[#E8B923] [&_svg]:fill-[#E8B923]">
            {@html activePageIcon}
          </div>
          <div class="min-w-0">
            <h1 class="text-base sm:text-lg font-bold text-slate-900 leading-none truncate">{pageTitle}</h1>
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