<script lang="ts">
  import { page } from '$app/stores';

  type ActivityLog = {
    id: number;
    activityType: string;
    itemType: string | null;
    itemId: number | null;
    details: string | null;
    timestamp: string;
  };

  $: logs = ($page.data?.logs ?? []) as ActivityLog[];

  // ── Tab & filter state ────────────────────────
  let searchQuery      = '';
  let activeTab        = 'all';
  let activeItemFilter = 'all';
  let mounted          = false;

  import { onMount } from 'svelte';
  onMount(() => { mounted = true; });

  const tabs = [
    { key: 'all',         label: 'All'         },
    { key: 'borrow',      label: 'Borrows'      },
    { key: 'return',      label: 'Returns'      },
    { key: 'reservation', label: 'Reservations' },
    { key: 'fine',        label: 'Fines'        },
    { key: 'payment',     label: 'Payments'     },
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
    return logs.filter(l => (l.activityType ?? '').includes(key)).length;
  }

  $: filtered = logs.filter(l => {
    const q           = searchQuery.toLowerCase();
    const matchSearch = !q
      || (l.details ?? '').toLowerCase().includes(q)
      || (l.activityType ?? '').toLowerCase().includes(q);
    const matchTab  = activeTab === 'all' || (l.activityType ?? '').includes(activeTab);
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
    label: string; iconBg: string; iconGlow: string;
    badgeBg: string; badgeText: string; badgeBorder: string;
    rowHover: string; icon: string;
  };

  function getActivityMeta(type: string): ActivityMeta {
    const t = (type ?? '').toLowerCase();
    if (t.includes('borrow') && !t.includes('return'))
      return { label: 'Borrowed',      iconBg: 'bg-[#0D5C29]',  iconGlow: 'shadow-green-200',  badgeBg: 'bg-green-50',   badgeText: 'text-green-700',   badgeBorder: 'border-green-200',   rowHover: 'hover:bg-green-50/40',   icon: 'borrow'     };
    if (t.includes('return_request'))
      return { label: 'Return Req.',   iconBg: 'bg-sky-600',     iconGlow: 'shadow-sky-200',    badgeBg: 'bg-sky-50',     badgeText: 'text-sky-700',     badgeBorder: 'border-sky-200',     rowHover: 'hover:bg-sky-50/40',     icon: 'return_req' };
    if (t.includes('return'))
      return { label: 'Returned',      iconBg: 'bg-blue-500',    iconGlow: 'shadow-blue-200',   badgeBg: 'bg-blue-50',    badgeText: 'text-blue-700',    badgeBorder: 'border-blue-200',    rowHover: 'hover:bg-blue-50/40',    icon: 'return'     };
    if (t.includes('reservation_approved') || t.includes('reserve_approved'))
      return { label: 'Res. Approved', iconBg: 'bg-[#4A7C59]',  iconGlow: 'shadow-emerald-200',badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', badgeBorder: 'border-emerald-200', rowHover: 'hover:bg-emerald-50/40', icon: 'reserve'    };
    if (t.includes('reservation_rejected') || t.includes('reserve_rejected'))
      return { label: 'Res. Rejected', iconBg: 'bg-red-400',     iconGlow: 'shadow-red-200',    badgeBg: 'bg-red-50',     badgeText: 'text-red-600',     badgeBorder: 'border-red-200',     rowHover: 'hover:bg-red-50/40',     icon: 'cancel'     };
    if (t.includes('reservation_cancelled') || t.includes('reserve_cancel'))
      return { label: 'Cancelled',     iconBg: 'bg-slate-400',   iconGlow: 'shadow-slate-200',  badgeBg: 'bg-slate-50',   badgeText: 'text-slate-600',   badgeBorder: 'border-slate-200',   rowHover: 'hover:bg-slate-50/60',   icon: 'cancel'     };
    if (t.includes('reservation') || t.includes('reserve'))
      return { label: 'Reserved',      iconBg: 'bg-[#4A7C59]',  iconGlow: 'shadow-teal-200',   badgeBg: 'bg-teal-50',    badgeText: 'text-teal-700',    badgeBorder: 'border-teal-200',    rowHover: 'hover:bg-teal-50/40',    icon: 'reserve'    };
    if (t.includes('payment'))
      return { label: 'Payment',       iconBg: 'bg-amber-500',   iconGlow: 'shadow-amber-200',  badgeBg: 'bg-amber-50',   badgeText: 'text-amber-700',   badgeBorder: 'border-amber-200',   rowHover: 'hover:bg-amber-50/40',   icon: 'payment'    };
    if (t.includes('fine'))
      return { label: 'Fine Issued',   iconBg: 'bg-red-500',     iconGlow: 'shadow-red-200',    badgeBg: 'bg-red-50',     badgeText: 'text-red-700',     badgeBorder: 'border-red-200',     rowHover: 'hover:bg-red-50/40',     icon: 'fine'       };
    if (t.includes('login'))
      return { label: 'Login',         iconBg: 'bg-indigo-500',  iconGlow: 'shadow-indigo-200', badgeBg: 'bg-indigo-50',  badgeText: 'text-indigo-700',  badgeBorder: 'border-indigo-200',  rowHover: 'hover:bg-indigo-50/40',  icon: 'login'      };
    return   { label: type ?? 'Event', iconBg: 'bg-slate-400',   iconGlow: 'shadow-slate-200',  badgeBg: 'bg-slate-50',   badgeText: 'text-slate-600',   badgeBorder: 'border-slate-200',   rowHover: 'hover:bg-slate-50/60',   icon: 'default'    };
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
</script>

<svelte:head>
  <title>Activity Logs | E-Kalibro</title>
</svelte:head>

<style>
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1);    }
  }
  @keyframes slideRight {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1;   transform: scale(1);    }
    50%       { opacity: 0.5; transform: scale(0.85); }
  }

  .anim-header   { animation: fadeSlideIn 0.45s ease both; }
  .anim-card     { animation: scaleIn     0.4s ease both;  }
  .anim-tab-line { animation: slideRight  0.25s ease both; transform-origin: left; }

  .log-row {
    animation: fadeSlideIn 0.3s ease both;
  }
  .log-row:nth-child(1)  { animation-delay: 0.02s; }
  .log-row:nth-child(2)  { animation-delay: 0.05s; }
  .log-row:nth-child(3)  { animation-delay: 0.08s; }
  .log-row:nth-child(4)  { animation-delay: 0.11s; }
  .log-row:nth-child(5)  { animation-delay: 0.14s; }
  .log-row:nth-child(6)  { animation-delay: 0.17s; }
  .log-row:nth-child(7)  { animation-delay: 0.20s; }
  .log-row:nth-child(8)  { animation-delay: 0.23s; }
  .log-row:nth-child(9)  { animation-delay: 0.26s; }
  .log-row:nth-child(10) { animation-delay: 0.28s; }

  .tab-btn { transition: color 0.2s, background 0.2s; }
  .icon-box { transition: transform 0.2s, box-shadow 0.2s; }
  .icon-box:hover { transform: scale(1.08); }

  .pill-filter { transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.15s; }
  .pill-filter:hover { transform: translateY(-1px); }
  .pill-filter:active { transform: scale(0.95); }

  .search-wrap input:focus + .search-shine { opacity: 1; }

  /* hide scrollbar on tab strip */
  .tab-strip::-webkit-scrollbar { display: none; }
  .tab-strip { scrollbar-width: none; }
</style>

<div class="flex flex-col gap-4 sm:gap-5 text-sm text-slate-800">

  <!-- ── Header ───────────────────────────────── -->
  <div class="anim-header relative overflow-hidden bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-4 sm:px-6 sm:py-5">
    <div class="absolute inset-0 bg-gradient-to-br from-[#0D5C29]/6 via-transparent to-[#E8B923]/12 pointer-events-none rounded-2xl"></div>
    <!-- Decorative blobs -->
    <div class="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-[#0D5C29]/5 blur-2xl pointer-events-none"></div>
    <div class="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-[#E8B923]/8 blur-2xl pointer-events-none"></div>

    <div class="relative z-10 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#0D5C29] to-[#4A7C59] flex items-center justify-center shrink-0 shadow-lg shadow-green-200">
          <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3.5 2"/>
          </svg>
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight tracking-tight">Activity Logs</h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-0.5">Your complete library activity history</p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <!-- Pulse dot for "live" feel -->
        <span class="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <span class="w-2 h-2 rounded-full bg-[#0D5C29]" style="animation: pulse-dot 2s ease-in-out infinite;"></span>
          {totalCount} records
        </span>
      </div>
    </div>
  </div>

  <!-- ── Main card with tabs ────────────────────── -->
  <div class="anim-card bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">

    <!-- Tab strip -->
    <div class="tab-strip flex overflow-x-auto border-b border-slate-100 bg-slate-50/50">
      {#each tabs as tab}
        {@const cnt = tabCount(tab.key)}
        <button
          on:click={() => { activeTab = tab.key; }}
          class="tab-btn relative flex items-center gap-2 px-4 sm:px-5 py-3.5 sm:py-4 text-sm sm:text-[14px] font-semibold whitespace-nowrap shrink-0
            {activeTab === tab.key ? 'text-[#0D5C29] bg-white' : 'text-slate-400 hover:text-slate-600 hover:bg-white/60'}"
        >
          {tab.label}
          {#if cnt > 0}
            <span class="text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none transition-all duration-200
              {activeTab === tab.key ? 'bg-[#0D5C29] text-white' : 'bg-slate-200 text-slate-500'}">
              {cnt}
            </span>
          {/if}
          {#if activeTab === tab.key}
            <span class="anim-tab-line absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0D5C29] rounded-t-full"></span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Search + sub-filters -->
    <div class="px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col gap-3 border-b border-slate-100 bg-white">
      <!-- Search -->
      <div class="relative search-wrap">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-colors duration-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/>
          <path stroke-linecap="round" d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search activity details…"
          class="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400
                 focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#4A7C59] focus:bg-white
                 transition-all duration-200"
        />
        {#if searchQuery}
          <button
            on:click={() => searchQuery = ''}
            class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors duration-150"
          >
            <svg class="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
          </button>
        {/if}
      </div>

      <!-- Item type pills -->
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Filter:</span>
        {#each itemFilters as f}
          <button
            on:click={() => activeItemFilter = f.key}
            class="pill-filter px-3 py-1 rounded-full text-xs font-semibold border
              {activeItemFilter === f.key
                ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'}"
          >
            {f.label}
          </button>
        {/each}
        {#if filtered.length !== totalCount}
          <span class="ml-auto text-xs text-slate-400 font-medium">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        {/if}
      </div>
    </div>

    <!-- ── Timeline ──────────────────────────────── -->
    <div class="flex flex-col divide-y divide-slate-50">

      {#if grouped.size === 0}
        <div class="flex flex-col items-center justify-center py-20 text-slate-400" style="animation: fadeIn 0.4s ease both;">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 opacity-30" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3.5 2"/>
            </svg>
          </div>
          <p class="text-base font-semibold text-slate-500">No activity found</p>
          <p class="text-sm mt-1 text-slate-400">Try adjusting your filters or search query</p>
        </div>

      {:else}
        {#each [...grouped.entries()] as [dateLabel, items]}

          <!-- Date group header -->
          <div class="flex items-center gap-3 px-4 sm:px-5 py-2.5 bg-slate-50/70">
            <div class="w-1.5 h-1.5 rounded-full bg-[#0D5C29]/40 shrink-0"></div>
            <span class="text-xs sm:text-[13px] font-bold text-slate-500 uppercase tracking-wider">{dateLabel}</span>
            <div class="flex-1 h-px bg-slate-200/70"></div>
            <span class="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium">
              {items.length} event{items.length > 1 ? 's' : ''}
            </span>
          </div>

          <!-- Log rows -->
          {#each items as log, i}
            {@const meta     = getActivityMeta(log.activityType)}
            {@const itemPill = getItemTypePill(log.itemType)}
            <div
              class="log-row group flex items-start gap-4 px-4 py-4 sm:px-5 sm:py-4 border-t border-slate-50 {meta.rowHover} transition-all duration-200 cursor-default"
            >
              <!-- Colored icon with glow -->
              <div class="icon-box shrink-0 mt-0.5 w-10 h-10 sm:w-11 sm:h-11 rounded-xl {meta.iconBg} flex items-center justify-center shadow-md {meta.iconGlow}">
                {#if meta.icon === 'borrow'}
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"/></svg>
                {:else if meta.icon === 'return'}
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd"/></svg>
                {:else if meta.icon === 'return_req'}
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"/></svg>
                {:else if meta.icon === 'reserve'}
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clip-rule="evenodd"/></svg>
                {:else if meta.icon === 'cancel'}
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
                {:else if meta.icon === 'fine'}
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>
                {:else if meta.icon === 'payment'}
                  <span class="text-white font-extrabold text-base leading-none">₱</span>
                {:else if meta.icon === 'login'}
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H9"/></svg>
                {:else}
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd"/></svg>
                {/if}
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold {meta.badgeBg} {meta.badgeText} border {meta.badgeBorder} transition-all duration-200 group-hover:shadow-sm">
                    {meta.label}
                  </span>
                  {#if log.itemType && itemPill}
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold {itemPill.bg} {itemPill.text} border {itemPill.border} capitalize">
                      {log.itemType}
                    </span>
                  {/if}
                </div>
                <p class="text-sm sm:text-[15px] font-medium text-slate-700 leading-snug line-clamp-2 group-hover:text-slate-900 transition-colors duration-150">
                  {log.details ?? '—'}
                </p>
                {#if log.itemId}
                  <p class="text-xs text-slate-400 mt-1 font-mono">ref #{log.itemId}</p>
                {/if}
              </div>

              <!-- Time chip -->
              <div class="shrink-0">
                <span class="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 group-hover:bg-white group-hover:border group-hover:border-slate-200 px-2.5 py-1 rounded-full font-medium transition-all duration-200 whitespace-nowrap">
                  <svg class="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9"/>
                    <path stroke-linecap="round" d="M12 7v5l3.5 2"/>
                  </svg>
                  {formatTime(log.timestamp)}
                </span>
              </div>
            </div>
          {/each}
        {/each}

        <!-- Footer -->
        <div class="px-5 py-4 text-center border-t border-slate-50 bg-slate-50/40">
          <p class="text-xs text-slate-400 font-medium">
            Showing <span class="text-slate-600 font-bold">{filtered.length}</span> of <span class="text-slate-600 font-bold">{totalCount}</span> records
          </p>
        </div>
      {/if}
    </div>

  </div><!-- /main card -->

</div>