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

  // User session state with persistent store
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
  
  // Subscribe to stores for reactivity
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

  // Navigation configuration for user dashboard (student/faculty)
  const navigation = [
    {
      name: "Home",
      href: "/dashboard",
      icon: `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 22V12h6v10"/>
      </svg>`
    },
    {
      name: "Books",
      href: "/dashboard/books",
      icon: `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>`
    },
    {
      name: "My Books",
      href: "/dashboard/issued",
      icon: `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
      </svg>`
    },
    {
      name: "QR Scan",
      href: "/dashboard/qr_scanner",
      icon: `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"/>
      </svg>`
    },
    {
      name: "Profile",
      href: "/dashboard/profile",
      icon: `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
      </svg>`
    }
  ];

  let currentPath = "";
  $: currentPath = $page.url.pathname;

  // Reactive computed active navigation item
  $: activeNavHref = (() => {
    const matching = navigation
      .filter(nav => currentPath === nav.href || currentPath.startsWith(nav.href + "/"))
      .sort((a, b) => b.href.length - a.href.length);
    return matching.length > 0 ? matching[0].href : "";
  })();

  // Fetch user session data
  async function fetchUserSession() {
    if (!browser) return;
    
    // If we already have user data, don't refetch
    if (get(userStore) !== null) {
      isLoadingStore.set(false);
      return;
    }
    
    try {
      isLoadingStore.set(true);
      sessionErrorStore.set(false);
      
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.user) {
          userStore.set(result.data.user);
        } else {
          console.warn('Invalid session response:', result);
          sessionErrorStore.set(true);
        }
      } else if (response.status === 401) {
        // Not authenticated, redirect to login
        userStore.set(null);
        if (browser) {
          await goto('/', { replaceState: true, noScroll: true });
        }
      } else {
        console.error('Session fetch failed:', response.status);
        sessionErrorStore.set(true);
      }
    } catch (error) {
      console.error('Error fetching user session:', error);
      sessionErrorStore.set(true);
    } finally {
      isLoadingStore.set(false);
    }
  }

  // Advanced logout function
  async function handleLogout(logoutAllDevicesFlag: boolean = false) {
    if (isLoggingOut) return;
    
    isLoggingOut = true;
    showLogoutOptions = false;
    showLogoutConfirm = false;

    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          logoutAllDevices: logoutAllDevicesFlag,
          reason: 'user_logout'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Clear user data immediately
        userStore.set(null);
        
        // Call the parent logout handler
        onLogout();
        
        // Show success message and redirect immediately
        if (logoutAllDevicesFlag) {
          notifications.show('Logged out from all devices successfully', 'success');
        } else {
          notifications.show('Logged out successfully', 'success');
        }
        
        // Use goto for faster redirect
        if (browser) {
          await goto('/', { replaceState: true, noScroll: true });
        }
      } else {
        // Handle partial success or errors
        console.error('Logout error:', result.message);
        notifications.show(result.message || 'Logout completed with some issues', 'warning');
        
        // Still redirect even if there were issues
        if (browser) {
          await goto('/', { replaceState: true, noScroll: true });
        }
      }
    } catch (error) {
      console.error('Logout request failed:', error);
      notifications.show('Network error during logout. Redirecting...', 'error');
      
      // Force redirect even on network error
      if (browser) {
        await goto('/', { replaceState: true, noScroll: true });
      }
    } finally {
      isLoggingOut = false;
    }
  }

  // Close logout options when clicking outside
  function handleClickOutside(event: Event) {
    if (showLogoutOptions) {
      const target = event.target as Element;
      if (!target.closest('.logout-menu')) {
        showLogoutOptions = false;
      }
    }
    // Close notification panel when clicking outside
    if (showNotificationPanel) {
      const target = event.target as Element;
      if (!target.closest('.notification-panel') && !target.closest('.notification-bell')) {
        showNotificationPanel = false;
      }
    }
  }

  // Notification helper functions
  function getNotificationIconColor(type: string) {
    switch (type) {
      case 'success': return 'text-emerald-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-amber-600';
      case 'info': default: return 'text-blue-600';
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'success':
        return `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>`;
      case 'error':
        return `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>`;
      case 'warning':
        return `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>`;
      case 'info':
      default:
        return `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
        </svg>`;
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

  function handleNotificationAction(notification: any) {
    if (notification.actionUrl) {
      showNotificationPanel = false; // Close panel before navigation
      window.location.href = notification.actionUrl;
    }
  }

  onMount(() => {
    if (browser) {
      // Fetch user session on component mount
      fetchUserSession();
      
      // Set up periodic session validation (every 60 seconds for performance)
      let isCheckPending = false;
      
      const sessionCheckInterval = setInterval(async () => {
        // Skip if check already in progress
        if (isCheckPending || !$userStore) {
          return;
        }
        
        try {
          isCheckPending = true;
          const response = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (response.status === 401) {
            // Session has been revoked
            console.warn('Session revoked - redirecting to login');
            userStore.set(null);
            notifications.show('Your session has been revoked. Please log in again.', 'error');
            if (browser) {
              await goto('/', { replaceState: true, noScroll: true });
            }
          } else if (!response.ok) {
            // Session is invalid
            console.warn('Session invalid - redirecting to login');
            userStore.set(null);
            if (browser) {
              await goto('/', { replaceState: true, noScroll: true });
            }
          }
        } catch (error) {
          console.error('Session check failed:', error);
        } finally {
          isCheckPending = false;
        }
      }, 60000);
      
      // Set up click outside handler
      document.addEventListener('click', handleClickOutside);
      
      return () => {
        document.removeEventListener('click', handleClickOutside);
        clearInterval(sessionCheckInterval);
      };
    }
  });

  // Add a helper to capitalize the role/userType (convert snake_case to Title Case)
  function capitalize(str: string | undefined) {
    if (!str) return "";
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getUserInitials(): string {
    if (!user) return 'G';
    const name = user.name || user.username || 'Guest';
    return name.charAt(0).toUpperCase();
  }

  function getPageTitle(): string {
    const item = navigation.find(nav => nav.href === activeNavHref);
    return item ? item.name : "Dashboard";
  }
</script>

<!-- Main Container -->
<div class="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F5F5DC]">
  <!-- Top Navbar - Fixed -->
  <nav class="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#4A7C59]/20 shadow-md transition-shadow duration-300
    {isScrolled ? 'shadow-lg' : ''}">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Left: Logo and Menu Toggle -->
        <div class="flex items-center space-x-4">
          <!-- Mobile Menu Toggle -->
          <button
            on:click={() => sidebarOpen.set(!$sidebarOpen)}
            class="lg:hidden p-2 rounded-lg text-[#0D5C29] hover:bg-[#0D5C29]/10 transition-colors"
            aria-label="Toggle menu"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <!-- Logo -->
          <button
            on:click={() => goto('/dashboard')}
            class="flex items-center space-x-2 group"
          >
            <div class="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#0D5C29] to-[#4A7C59] shadow-md group-hover:shadow-lg transition-shadow">
              <img src="/assets/logo.png" alt="e-Kalibro" class="w-7 h-7 object-contain" />
            </div>
            <div class="hidden sm:block">
              <h1 class="text-lg font-bold text-[#0D5C29] group-hover:text-[#4A7C59] transition-colors">e-Kalibro</h1>
              <p class="text-xs text-[#E8B923] -mt-1">Library System</p>
            </div>
          </button>
        </div>

        <!-- Center: Page Title (Mobile) -->
        <div class="lg:hidden">
          <h2 class="text-base font-semibold text-[#0D5C29]">{getPageTitle()}</h2>
        </div>

        <!-- Right: User Menu -->
        <div class="relative user-menu-container">
          <button
            on:click={() => showUserMenu = !showUserMenu}
            class="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 rounded-lg hover:bg-[#0D5C29]/5 transition-all duration-200 group"
            aria-expanded={showUserMenu}
          >
            <!-- User Avatar -->
            <div class="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#0D5C29] to-[#4A7C59] rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow border-2 border-white">
              {#if isLoadingUser}
                <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              {:else}
                <span class="text-sm font-bold text-white">{getUserInitials()}</span>
              {/if}
            </div>

            <!-- User Info (Desktop) -->
            <div class="hidden lg:block text-left">
              {#if isLoadingUser}
                <div class="space-y-1">
                  <div class="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div class="h-2 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              {:else if user}
                <p class="text-sm font-medium text-[#0D5C29]">{user.username || user.name}</p>
                <p class="text-xs text-[#E8B923]">{capitalize(user.role || 'Member')}</p>
              {:else}
                <p class="text-sm font-medium text-[#0D5C29]">Guest</p>
              {/if}
            </div>

            <!-- Dropdown Icon -->
            <svg
              class="hidden sm:block h-4 w-4 text-[#4A7C59] transition-transform duration-200 {showUserMenu ? 'rotate-180' : ''}"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          <!-- User Dropdown Menu -->
          {#if showUserMenu}
            <div class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-[#4A7C59]/20 py-2 z-50 animate-dropdown">
              {#if user}
                <div class="px-4 py-3 border-b border-gray-100">
                  <p class="text-sm font-medium text-[#0D5C29]">{user.username || user.name}</p>
                  <p class="text-xs text-gray-500 mt-1">{user.email}</p>
                  <span class="inline-block mt-2 px-2 py-1 text-xs font-medium bg-[#E8B923]/20 text-[#0D5C29] rounded-md">
                    {capitalize(user.role || 'Member')}
                  </span>
                </div>
              {/if}

              <!-- Logout Options -->
              <div class="py-1">
                <button
                  on:click={() => {
                    logoutAllDevices = false;
                    showLogoutConfirm = true;
                    showUserMenu = false;
                  }}
                  class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-[#0D5C29]/5 transition-colors"
                >
                  <svg class="w-4 h-4 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  Logout this device
                </button>
                <button
                  on:click={() => {
                    logoutAllDevices = true;
                    showLogoutConfirm = true;
                    showUserMenu = false;
                  }}
                  class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  Logout all devices
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Layout Container -->
  <div class="flex pt-16">
    <!-- Sidebar - Hidden on mobile by default -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#4A7C59]/20 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block mt-16"
      class:translate-x-0={$sidebarOpen}
      class:-translate-x-full={!$sidebarOpen}
    >
      <nav class="h-full overflow-y-auto py-6 px-4">
        <ul class="space-y-1">
          {#each navigation as item}
            <li>
              <a
                href={item.href}
                on:click|preventDefault={async () => {
                  sidebarOpen.set(false);
                  await goto(item.href);
                }}
                class="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                  {isActive(item.href)
                    ? 'bg-gradient-to-r from-[#0D5C29] to-[#4A7C59] text-white shadow-md'
                    : 'text-gray-700 hover:bg-[#0D5C29]/5 hover:text-[#0D5C29]'}"
              >
                <span class="transition-transform duration-200 group-hover:scale-110">
                  {@html item.icon}
                </span>
                <span>{item.name}</span>
                {#if isActive(item.href)}
                  <span class="ml-auto w-1.5 h-1.5 rounded-full bg-[#E8B923]"></span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </aside>

    <!-- Mobile Sidebar Overlay -->
    {#if $sidebarOpen}
      <div
        class="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden mt-16"
        on:click={() => sidebarOpen.set(false)}
        on:keydown={(e) => e.key === 'Enter' && sidebarOpen.set(false)}
        role="button"
        tabindex="0"
        aria-label="Close sidebar"
      ></div>
    {/if}

    <!-- Main Content Area -->
    <main class="flex-1 min-h-[calc(100vh-4rem)]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <slot />
      </div>
    </main>
  </div>

  <!-- Logout Confirmation Modal -->
  {#if showLogoutConfirm}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        <!-- Icon -->
        <div class="mx-auto w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mb-4">
          <svg class="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </div>

        <!-- Title -->
        <h3 class="text-xl font-bold text-gray-900 text-center mb-2">
          {logoutAllDevices ? 'Logout from All Devices?' : 'Confirm Logout'}
        </h3>

        <!-- Message -->
        <p class="text-gray-600 text-center text-sm mb-6">
          {logoutAllDevices 
            ? 'You will be logged out from all devices and sessions. This action cannot be undone.' 
            : 'Are you sure you want to logout from this device?'}
        </p>

        <!-- Buttons -->
        <div class="flex gap-3">
          <button
            on:click={() => showLogoutConfirm = false}
            class="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            on:click={() => handleLogout(logoutAllDevices)}
            disabled={isLoggingOut}
            class="flex-1 px-4 py-2.5 text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              '<div class="flex items-center justify-center"><svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Logging out...</div>'
            ) : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Smooth scrolling */
  :global(html) {
    scroll-behavior: smooth;
  }

  /* Custom scrollbar for sidebar */
  aside::-webkit-scrollbar {
    width: 6px;
  }

  aside::-webkit-scrollbar-track {
    background: transparent;
  }

  aside::-webkit-scrollbar-thumb {
    background: #4A7C59;
    border-radius: 3px;
  }

  aside::-webkit-scrollbar-thumb:hover {
    background: #0D5C29;
  }

  /* Animations */
  @keyframes dropdown {
    from {
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-dropdown {
    animation: dropdown 0.2s ease-out;
  }

  .animate-scale-in {
    animation: scale-in 0.2s ease-out;
  }

  /* Focus styles */
  :global(*:focus-visible) {
    outline: 2px solid #E8B923;
    outline-offset: 2px;
    border-radius: 4px;
  }
</style>