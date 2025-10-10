<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";

  export let onLogout: () => void = () => {};

  let isLoggingOut = false;
  let showUserMenu = false;
  let isScrolled = false;

  // User session state
  let user: {
    id?: string;
    name?: string;
    username?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
  } | null = null;
  let isLoadingUser = true;
  let sessionError = false;

  // Navigation configuration
  const navigation = [
    {
      name: "Home",
      href: "/dashboard",
      icon: `<svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 22V12h6v10"/>
      </svg>`,
      activeIcon: `<svg class="h-6 w-6" fill="currentColor" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <path d="M9 22V12h6v10"/>
      </svg>`
    },
    {
      name: "Books",
      href: "/dashboard/books",
      icon: `<svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>`,
      activeIcon: `<svg class="h-6 w-6" fill="currentColor" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>`
    },
    {
      name: "My Books",
      href: "/dashboard/issued",
      icon: `<svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
      </svg>`,
      activeIcon: `<svg class="h-6 w-6" fill="currentColor" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
      </svg>`
    },
    {
      name: "QR Scan",
      href: "/dashboard/qr_scanner",
      icon: `<svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"/>
      </svg>`,
      activeIcon: `<svg class="h-6 w-6" fill="currentColor" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"/>
        <path d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"/>
      </svg>`
    },
    {
      name: "Profile",
      href: "/dashboard/profile",
      icon: `<svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
      </svg>`,
      activeIcon: `<svg class="h-6 w-6" fill="currentColor" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
      </svg>`
    }
  ];

  let currentPath = "";
  $: currentPath = $page.url.pathname;

  // Fetch user session with retry logic
  async function fetchUserSession() {
    if (!browser) return;
    
    try {
      isLoadingUser = true;
      sessionError = false;
      
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.user) {
          user = result.data.user;
          sessionError = false;
        } else {
          sessionError = true;
        }
      } else if (response.status === 401) {
        user = null;
        if (browser) window.location.href = '/';
      } else {
        sessionError = true;
      }
    } catch (error) {
      console.error('Session fetch error:', error);
      sessionError = true;
    } finally {
      isLoadingUser = false;
    }
  }

  async function handleLogout() {
    if (isLoggingOut) return;
    
    isLoggingOut = true;
    showUserMenu = false;
    
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'user_logout' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showNotification('Logged out successfully', 'success');
        user = null;
        onLogout();
        setTimeout(() => { 
          if (browser) window.location.href = '/'; 
        }, 800);
      } else {
        showNotification(result.message || 'Logout error', 'warning');
        setTimeout(() => { 
          if (browser) window.location.href = '/'; 
        }, 1500);
      }
    } catch (error) {
      console.error('Logout error:', error);
      showNotification('Network error during logout. Redirecting...', 'error');
      setTimeout(() => { 
        if (browser) window.location.href = '/'; 
      }, 1500);
    } finally {
      isLoggingOut = false;
    }
  }

  // Enhanced notification system with auto-dismiss
  type NotificationType = 'success' | 'error' | 'warning';
  type Notification = {
    id: number;
    message: string;
    type: NotificationType;
  };
  
  let notifications: Notification[] = [];
  let notificationId = 0;
  
  function showNotification(message: string, type: NotificationType = 'success') {
    const id = ++notificationId;
    notifications = [...notifications, { id, message, type }];
    
    setTimeout(() => {
      notifications = notifications.filter(n => n.id !== id);
    }, 5000);
  }
  
  function removeNotification(id: number) {
    notifications = notifications.filter(n => n.id !== id);
  }

  // Close user menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (showUserMenu) {
      const target = event.target as Element;
      if (!target.closest('.user-menu')) {
        showUserMenu = false;
      }
    }
  }

  // Handle scroll for header shadow
  function handleScroll() {
    isScrolled = window.scrollY > 10;
  }

  // Keyboard navigation
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && showUserMenu) {
      showUserMenu = false;
    }
  }

  onMount(() => {
    if (browser) {
      fetchUserSession();
      document.addEventListener('click', handleClickOutside);
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('keydown', handleKeyDown);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    }
  });

  function getPageTitle(path: string): string {
    const nav = navigation.find(n => n.href === path);
    return nav ? nav.name : "Dashboard";
  }

  function getUserInitials(): string {
    if (!user) return 'G';
    const name = user.name || user.username || 'Guest';
    return name.charAt(0).toUpperCase();
  }
</script>

<!-- Notifications Container -->
{#if notifications.length > 0}
  <div class="fixed top-4 right-4 z-[100] space-y-2 max-w-sm" role="alert" aria-live="polite">
    {#each notifications as notification (notification.id)}
      <div 
        class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm 
          transform transition-all duration-300 ease-out animate-slide-in
          {notification.type === 'success' ? 'bg-emerald-500/90 text-white' : 
           notification.type === 'error' ? 'bg-red-500/90 text-white' : 
           'bg-amber-500/90 text-white'}"
      >
        <div class="flex-shrink-0">
          {#if notification.type === 'success'}
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          {:else if notification.type === 'error'}
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          {:else}
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
            </svg>
          {/if}
        </div>
        <span class="text-sm font-medium flex-1">{notification.message}</span>
        <button 
          on:click={() => removeNotification(notification.id)}
          class="flex-shrink-0 text-white/80 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10"
          aria-label="Close notification"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    {/each}
  </div>
{/if}

<div class="min-h-screen bg-white pb-20 lg:pb-0">
  <!-- Desktop Header -->
  <header 
    class="hidden lg:block bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 transition-shadow duration-200
      {isScrolled ? 'shadow-lg' : 'shadow-sm'}"
  >
    <div class="max-w-7xl mx-auto px-4 py-2"> <!-- px-6 py-4 -> px-4 py-2 -->
      <div class="flex items-center justify-between">
        <!-- Logo and Title -->
        <div class="flex items-center gap-4"> <!-- gap-6 -> gap-4 -->
          <button 
            on:click={() => goto('/dashboard')}
            class="flex items-center gap-2 group"
          >
            <div class="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-lg 
              group-hover:shadow-xl group-hover:scale-105 transition-all duration-200"> <!-- w-10 h-10 -> w-8 h-8 -->
              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"> <!-- h-6 w-6 -> h-5 w-5 -->
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div>
              <h1 class="text-lg font-bold text-white group-hover:text-slate-100 transition-colors">i-Kalibro</h1> <!-- text-xl -> text-lg -->
              <p class="text-xs text-slate-300">Library System</p> <!-- text-sm -> text-xs -->
            </div>
          </button>
          
          <!-- Desktop Navigation -->
          <nav class="flex items-center gap-0.5" role="navigation" aria-label="Main navigation"> <!-- gap-1 -> gap-0.5 -->
            {#each navigation as item}
              <a
                href={item.href}
                class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl 
                  transition-all duration-200 relative group
                  {currentPath === item.href
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'}"
                on:click|preventDefault={() => goto(item.href)}
                aria-current={currentPath === item.href ? 'page' : undefined}
              >
                <span class="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                  {@html currentPath === item.href ? item.activeIcon : item.icon}
                </span>
                <span>{item.name}</span>
                {#if currentPath === item.href}
                  <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                {/if}
              </a>
            {/each}
          </nav>
        </div>

        <!-- User Menu -->
        <div class="relative user-menu">
          <button
            on:click|stopPropagation={() => showUserMenu = !showUserMenu}
            class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 
              transition-all duration-200 group"
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            <div class="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full 
              flex items-center justify-center shadow-md group-hover:shadow-lg 
              transition-all duration-200 group-hover:scale-105">
              {#if isLoadingUser}
                <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              {:else}
                <span class="text-sm font-semibold text-white">{getUserInitials()}</span>
              {/if}
            </div>
            <div class="hidden lg:block text-left">
              {#if isLoadingUser}
                <div class="space-y-1.5">
                  <div class="h-3 bg-slate-800 rounded w-20 animate-pulse"></div>
                  <div class="h-2 bg-slate-800 rounded w-24 animate-pulse"></div>
                </div>
              {:else if user}
                <p class="text-sm font-medium text-white truncate max-w-[150px]">
                  {user.name || user.username}
                </p>
                <p class="text-xs text-slate-300 truncate max-w-[150px]">{user.email}</p>
              {:else}
                <p class="text-sm font-medium text-white">Guest</p>
                <p class="text-xs text-slate-300">Not logged in</p>
              {/if}
            </div>
            <svg 
              class="h-4 w-4 text-slate-400 transition-transform duration-200 
                {showUserMenu ? 'rotate-180' : ''}" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          <!-- User Dropdown -->
          {#if showUserMenu}
            <div 
              class="absolute right-0 top-full mt-2 w-64 bg-slate-900 rounded-xl 
                shadow-xl border border-slate-800 py-2 z-50 
                animate-dropdown-fade-in"
              role="menu"
            >
              {#if user}
                <div class="px-4 py-3 border-b border-slate-800">
                  <p class="text-sm font-medium text-white truncate">
                    {user.name || user.username}
                  </p>
                  <p class="text-xs text-slate-300 truncate">{user.email}</p>
                  {#if user.role}
                    <span class="inline-block mt-1.5 px-2 py-0.5 text-xs font-medium 
                      bg-slate-800 text-slate-300 rounded-md capitalize">
                      {user.role}
                    </span>
                  {/if}
                </div>
              {/if}
              
              <div class="py-1">
                <button
                  on:click={handleLogout}
                  class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 
                    hover:bg-slate-800 transition-colors duration-200
                    {isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}"
                  disabled={isLoggingOut}
                  role="menuitem"
                >
                  {#if isLoggingOut}
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing out...</span>
                  {:else}
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
                    </svg>
                    <span>Sign out</span>
                  {/if}
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </header>

  <!-- Mobile Header -->
  <header class="lg:hidden bg-slate-900/95 backdrop-blur-md shadow-sm border-b border-slate-800 sticky top-0 z-40">
    <div class="flex items-center justify-between px-6 py-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
          <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        </div>
        <h1 class="text-lg font-bold text-white">{getPageTitle(currentPath)}</h1>
      </div>

      <div class="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center">
        {#if isLoadingUser}
          <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
        {:else}
          <span class="text-xs font-semibold text-white">{getUserInitials()}</span>
        {/if}
      </div>
    </div>
  </header>

  <!-- Page Content -->
  <main class="max-w-7xl mx-auto px-4 lg:px-6 py-6">
    <slot />
  </main>

  <!-- Mobile Bottom Navigation -->
  <nav 
    class="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md 
      border-t border-slate-800 z-50 safe-area-bottom"
    role="navigation" 
    aria-label="Mobile navigation"
  >
    <div class="flex items-center justify-around px-1 py-2">
      {#each navigation as item}
        <a
          href={item.href}
          class="flex flex-col items-center justify-center px-2 py-2 min-w-0 flex-1 
            transition-all duration-200 rounded-lg
            {currentPath === item.href
              ? 'text-white'
              : 'text-slate-300 active:bg-slate-800'}"
          on:click|preventDefault={() => goto(item.href)}
          aria-current={currentPath === item.href ? 'page' : undefined}
        >
          <div class="mb-1 transition-transform duration-200 
            {currentPath === item.href ? 'scale-110' : 'scale-100'}">
            {@html currentPath === item.href ? item.activeIcon : item.icon}
          </div>
          <span class="text-xs font-medium truncate w-full text-center">
            {item.name}
          </span>
          {#if currentPath === item.href}
            <div class="w-1 h-1 bg-white rounded-full mt-1"></div>
          {/if}
        </a>
      {/each}
      
      <!-- Mobile Logout Button -->
      <button
        on:click={handleLogout}
        class="flex flex-col items-center justify-center px-2 py-2 min-w-0 flex-1 
          text-red-400 hover:text-red-300 active:bg-slate-800 transition-all duration-200 rounded-lg
          {isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}"
        disabled={isLoggingOut}
        aria-label="Logout"
      >
        <div class="mb-1">
          {#if isLoggingOut}
            <svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          {:else}
            <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
            </svg>
          {/if}
        </div>
        <span class="text-xs font-medium">
          {isLoggingOut ? 'Out' : 'Logout'}
        </span>
      </button>
    </div>
  </nav>
</div>

<style>
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes dropdown-fade-in {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }

  .animate-dropdown-fade-in {
    animation: dropdown-fade-in 0.2s ease-out;
  }

  /* Safe area for mobile devices with notches */
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Smooth scrolling */
  :global(html) {
    scroll-behavior: smooth;
  }

  /* Focus visible styles for accessibility */
  :global(*:focus-visible) {
    outline: 2px solid rgb(148 163 184);
    outline-offset: 2px;
  }
</style>