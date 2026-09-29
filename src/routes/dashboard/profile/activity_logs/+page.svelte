<script lang="ts">
	import { invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    ArrowLeft,
    Bookmark,
    Check,
    CircleAlert,
    Clock3,
    CreditCard,
    History,
    Info,
    LogIn,
    Plus,
    RefreshCw,
    Search,
    Undo2,
    X
  } from '@lucide/svelte';

  type ActivityLog = {
    id: number;
    activityType: string;
    itemType: string | null;
    itemId: number | null;
    details: string | null;
    timestamp: string;
  };

  $: logs = ($page.data?.logs ?? []) as ActivityLog[];
  $: loadError = ($page.data?.loadError ?? '') as string;

  // ── Tab & filter state ────────────────────────
  let searchQuery      = '';
  let activeTab        = 'all';
  let activeItemFilter = 'all';
  let refreshing = false;

  const tabs = [
    { key: 'all',         label: 'All'          },
    { key: 'borrow',      label: 'Borrows'      },
    { key: 'return',      label: 'Returns'      },
    { key: 'reservation', label: 'Reservations' },
    { key: 'fine',        label: 'Fines'        },
    { key: 'payment',     label: 'Payments'     },
    { key: 'account',     label: 'Account'      },
    { key: 'library_visit', label: 'Library visits' },
    { key: 'notification', label: 'Notifications' },
  ];

  const itemFilters = [
    { key: 'all',      label: 'All Types' },
    { key: 'book',     label: 'Book'      },
    { key: 'magazine', label: 'Magazine'  },
    { key: 'thesis',   label: 'Thesis'    },
    { key: 'journal',  label: 'Journal'   },
  ];

  $: totalCount = logs.length;

  function tabCount(key: string): number {
    if (key === 'all') return totalCount;
    return logs.filter(log => matchesActivityTab(log.activityType, key)).length;
  }

  function matchesActivityTab(activityType: string, key: string): boolean {
    const type = (activityType ?? '').toLowerCase();
    if (key === 'all') return true;
    if (key === 'account') {
      return ['login', 'logout', 'account_created', 'password_reset', 'profile_update'].includes(type);
    }
    return type.includes(key);
  }

  async function refreshLogs() {
    refreshing = true;
    try {
      await invalidateAll();
    } finally {
      refreshing = false;
    }
  }

  $: borrowCount = tabCount('borrow');
  $: returnCount = tabCount('return');

  $: filtered = logs.filter(l => {
    const q           = searchQuery.toLowerCase();
    const matchSearch = !q
      || (l.details ?? '').toLowerCase().includes(q)
      || (l.activityType ?? '').toLowerCase().includes(q);
    const matchTab  = matchesActivityTab(l.activityType, activeTab);
    const matchItem = activeItemFilter === 'all' || l.itemType === activeItemFilter;
    return matchSearch && matchTab && matchItem;
  });

  $: grouped = (() => {
    const map = new Map<string, ActivityLog[]>();
    for (const log of filtered) {
      const key = formatDateGroup(log.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return map;
  })();

  function formatDateGroup(ts: string): string {
    if (!ts) return 'Unknown';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return 'Unknown';
    const today     = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (sameDay(d, today))     return 'Today';
    if (sameDay(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function sameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
  }

  function formatTime(ts: string): string {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  type ActivityMeta = {
    label: string; iconBg: string;
    badgeBg: string; badgeText: string; badgeBorder: string;
    icon: string;
  };

  function getActivityMeta(type: string): ActivityMeta {
    const t = (type ?? '').toLowerCase();
    if (t.includes('borrow') && !t.includes('return'))
      return { label: 'Borrowed',      iconBg: 'bg-[#0D5C29]', badgeBg: 'bg-green-50',   badgeText: 'text-green-700',   badgeBorder: 'border-green-200',   icon: 'borrow'     };
    if (t.includes('return_request'))
      return { label: 'Return Req.',   iconBg: 'bg-sky-600',   badgeBg: 'bg-sky-50',     badgeText: 'text-sky-700',     badgeBorder: 'border-sky-200',     icon: 'return_req' };
    if (t.includes('return'))
      return { label: 'Returned',      iconBg: 'bg-blue-500',  badgeBg: 'bg-blue-50',    badgeText: 'text-blue-700',    badgeBorder: 'border-blue-200',    icon: 'return'     };
    if (t.includes('reservation_approved') || t.includes('reserve_approved'))
      return { label: 'Res. Approved', iconBg: 'bg-[#4A7C59]', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', badgeBorder: 'border-emerald-200', icon: 'reserve'    };
    if (t.includes('reservation_rejected') || t.includes('reserve_rejected'))
      return { label: 'Res. Rejected', iconBg: 'bg-red-400',   badgeBg: 'bg-red-50',     badgeText: 'text-red-600',     badgeBorder: 'border-red-200',     icon: 'cancel'     };
    if (t.includes('reservation_cancelled') || t.includes('reserve_cancel'))
      return { label: 'Cancelled',     iconBg: 'bg-slate-400', badgeBg: 'bg-slate-50',   badgeText: 'text-slate-600',   badgeBorder: 'border-slate-200',   icon: 'cancel'     };
    if (t.includes('reservation') || t.includes('reserve'))
      return { label: 'Reserved',      iconBg: 'bg-[#4A7C59]', badgeBg: 'bg-teal-50',    badgeText: 'text-teal-700',    badgeBorder: 'border-teal-200',    icon: 'reserve'    };
    if (t.includes('payment'))
      return { label: 'Payment',       iconBg: 'bg-amber-500', badgeBg: 'bg-amber-50',   badgeText: 'text-amber-700',   badgeBorder: 'border-amber-200',   icon: 'payment'    };
    if (t.includes('fine'))
      return { label: 'Fine Issued',   iconBg: 'bg-red-500',   badgeBg: 'bg-red-50',     badgeText: 'text-red-700',     badgeBorder: 'border-red-200',     icon: 'fine'       };
    if (t.includes('login'))
      return { label: 'Login',         iconBg: 'bg-indigo-500',badgeBg: 'bg-indigo-50',  badgeText: 'text-indigo-700',  badgeBorder: 'border-indigo-200',  icon: 'login'      };
    if (t.includes('logout'))
      return { label: 'Logout',        iconBg: 'bg-slate-500', badgeBg: 'bg-slate-50',   badgeText: 'text-slate-600',   badgeBorder: 'border-slate-200',   icon: 'account'    };
    if (t.includes('notification'))
      return { label: 'Notification',  iconBg: 'bg-amber-500', badgeBg: 'bg-amber-50',   badgeText: 'text-amber-700',   badgeBorder: 'border-amber-200',   icon: 'notification' };
    if (t.includes('library_visit'))
      return { label: t.includes('_out') ? 'Library Exit' : 'Library Visit', iconBg: 'bg-cyan-600', badgeBg: 'bg-cyan-50', badgeText: 'text-cyan-700', badgeBorder: 'border-cyan-200', icon: 'visit' };
    if (t.includes('profile') || t.includes('account') || t.includes('password'))
      return { label: 'Account Update', iconBg: 'bg-indigo-500', badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-700', badgeBorder: 'border-indigo-200', icon: 'account' };
    return   { label: type ?? 'Event', iconBg: 'bg-slate-400', badgeBg: 'bg-slate-50',   badgeText: 'text-slate-600',   badgeBorder: 'border-slate-200',   icon: 'default'    };
  }

  function getItemTypePill(itemType: string | null) {
    if (!itemType) return null;
    const map: Record<string, { bg: string; text: string; border: string }> = {
      book:     { bg: 'bg-[#E8F5E9]', text: 'text-[#0D5C29]',  border: 'border-green-200'  },
      magazine: { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
      thesis:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'  },
      journal:  { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200'   },
    };
    return map[itemType.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
  }

  function activityIcon(icon: string) {
    const icons = { borrow: Plus, return: Check, return_req: Undo2, reserve: Bookmark, cancel: X, fine: CircleAlert, payment: CreditCard, login: LogIn, notification: Check, visit: Clock3, account: LogIn, default: Info };
    return icons[icon as keyof typeof icons] ?? Info;
  }
</script>

<svelte:head>
  <title>Activity Logs | E-Kalibro Client Portal</title>
</svelte:head>

<style>
  /* hide scrollbar on the chip strip */
  .chip-strip::-webkit-scrollbar { display: none; }
  .chip-strip { scrollbar-width: none; }
</style>

<div class="flex flex-col gap-2.5 sm:gap-2 text-sm text-slate-800">

  <!-- ── HEADER CARD ───────────────────────────────── -->
  <div class="relative overflow-hidden bg-white border border-slate-100 rounded-xl shadow-sm px-3 py-3 sm:px-5 sm:py-3.5">
    <div class="absolute inset-0 bg-gradient-to-br from-[#0D5C29]/5 via-transparent to-[#E8B923]/10 pointer-events-none rounded-xl"></div>
    <div class="relative z-10 flex items-center gap-3">
      <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[#0D5C29] to-[#4A7C59] flex items-center justify-center shrink-0 shadow">
        <History class="w-6 h-6 sm:w-7 sm:h-7 text-white" aria-hidden="true" />
      </div>
      <div class="flex-1 min-w-0">
        <h1 class="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">Activity Logs</h1>
        <p class="text-xs text-slate-500 mt-0.5 truncate">Your complete library activity history</p>
      </div>
      <a href="/dashboard/profile"
        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 transition-all shrink-0">
        <ArrowLeft class="w-3 h-3" aria-hidden="true" />
        Profile
      </a>
      <button
        type="button"
        on:click={refreshLogs}
        disabled={refreshing}
        aria-label="Refresh activity logs"
        title="Refresh activity logs"
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        <RefreshCw class="h-3.5 w-3.5 {refreshing ? 'animate-spin' : ''}" aria-hidden="true" />
      </button>
    </div>
  </div>

  <!-- ── STATS ─────────────────────────────────────── -->
  <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
    <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 sm:py-2.5 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0D5C29] flex items-center justify-center shrink-0">
        <History class="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
      </div>
      <div class="text-lg sm:text-2xl font-extrabold text-slate-900 leading-none">{totalCount}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Total Records</div>
    </div>
    <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 sm:py-2.5 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#4A7C59] flex items-center justify-center shrink-0">
        <Plus class="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
      </div>
      <div class="text-lg sm:text-2xl font-extrabold text-slate-900 leading-none">{borrowCount}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Borrows</div>
    </div>
    <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 sm:py-2.5 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#E8B923] flex items-center justify-center shrink-0">
        <Check class="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
      </div>
      <div class="text-lg sm:text-2xl font-extrabold text-slate-900 leading-none">{returnCount}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Returns</div>
    </div>
  </div>

  {#if loadError}
    <div class="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
      <span>{loadError}</span>
      <button type="button" class="shrink-0 font-semibold underline" on:click={refreshLogs} disabled={refreshing}>
        Retry
      </button>
    </div>
  {/if}

  <!-- ── FILTERS ───────────────────────────────────── -->
  <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
    <div class="flex items-center gap-1.5 mb-2 sm:mb-2.5">
      <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0D5C29] shrink-0"></span>
      <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Filters</span>
      {#if filtered.length !== totalCount}
        <span class="ml-auto text-[10px] font-semibold text-slate-400">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      {/if}
    </div>

    <!-- Search -->
    <div class="relative mb-2">
      <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search activity details…"
        class="w-full pl-8 pr-8 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 placeholder-slate-400 focus:outline-none focus:border-[#0D5C29] focus:bg-white transition-all"
      />
      {#if searchQuery}
        <button
          on:click={() => searchQuery = ''}
          aria-label="Clear search"
          class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
        >
          <X class="h-2.5 w-2.5 text-slate-500" aria-hidden="true" />
        </button>
      {/if}
    </div>

    <!-- Activity type chips -->
    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Activity</p>
    <div class="chip-strip flex gap-1.5 overflow-x-auto mb-2">
      {#each tabs as tab}
        {@const cnt = tabCount(tab.key)}
        <button
          on:click={() => { activeTab = tab.key; }}
          class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all
            {activeTab === tab.key
              ? 'bg-[#0D5C29] text-white border-[#0D5C29]'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'}"
        >
          {tab.label}
          {#if cnt > 0}
            <span class="text-[10px] font-bold px-1 rounded-full leading-4
              {activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}">{cnt}</span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Item type chips -->
    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Item Type</p>
    <div class="chip-strip flex gap-1.5 overflow-x-auto">
      {#each itemFilters as f}
        <button
          on:click={() => activeItemFilter = f.key}
          class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all
            {activeItemFilter === f.key
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'}"
        >
          {f.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- ── TIMELINE ──────────────────────────────────── -->
  {#if grouped.size === 0}
    <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
      <div class="flex flex-col items-center justify-center py-8 text-slate-400">
        <Clock3 class="w-7 h-7 sm:w-10 sm:h-10 mb-1.5 sm:mb-3 opacity-30" strokeWidth={1.5} aria-hidden="true" />
        <p class="text-xs sm:text-sm font-semibold text-slate-500">No activity found</p>
        <p class="text-[10px] sm:text-xs mt-0.5">Try adjusting your filters or search query</p>
      </div>
    </div>
  {:else}
    {#each [...grouped.entries()] as [dateLabel, items]}
      <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
        <!-- Date group header -->
        <div class="flex items-center gap-1.5 mb-2 sm:mb-2.5">
          <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#4A7C59] shrink-0"></span>
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">{dateLabel}</span>
          <span class="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {items.length} event{items.length > 1 ? 's' : ''}
          </span>
        </div>

        <!-- Log rows -->
        <div class="flex flex-col gap-1.5">
          {#each items as log}
            {@const meta     = getActivityMeta(log.activityType)}
            {@const itemPill = getItemTypePill(log.itemType)}
            {@const Icon     = activityIcon(meta.icon)}
            <div class="flex items-start gap-2.5 px-2 py-2 sm:px-3 sm:py-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
              <!-- Icon -->
              <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg {meta.iconBg} flex items-center justify-center shrink-0">
                <svelte:component this={Icon} class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={2} aria-hidden="true" />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border {meta.badgeBg} {meta.badgeText} {meta.badgeBorder}">
                    {meta.label}
                  </span>
                  {#if log.itemType && itemPill}
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize {itemPill.bg} {itemPill.text} {itemPill.border}">
                      {log.itemType}
                    </span>
                  {/if}
                </div>
                <p class="text-xs sm:text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{log.details ?? '—'}</p>
                {#if log.itemId}
                  <p class="text-[10px] text-slate-400 mt-0.5 font-mono">ref #{log.itemId}</p>
                {/if}
              </div>

              <!-- Time -->
              <span class="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 whitespace-nowrap mt-0.5">
                <Clock3 class="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                {formatTime(log.timestamp)}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/each}

    <p class="text-center text-[10px] sm:text-xs text-slate-400 font-medium py-1">
      Showing <span class="text-slate-600 font-bold">{filtered.length}</span> of <span class="text-slate-600 font-bold">{totalCount}</span> records
    </p>
  {/if}

</div>