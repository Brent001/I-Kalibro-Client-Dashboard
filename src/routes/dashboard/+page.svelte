<script lang="ts">
  import { page } from "$app/stores";

  type BorrowedBook = {
    status: string;
    daysLeft: number;
    title: string;
    author: string;
    dueDate: string;
  };

  type Penalty = {
    status: string;
    fine?: number;
    amount?: number;
    title: string;
    dueDate: string;
  };

  type Reservation = {
    id: number;
    title: string;
    author: string;
    reservedDate: string;
    status: string;
  };

  type Activity = {
    id: number;
    type: string;
    details: string;
    timestamp: string;
  };

  $: user = $page.data?.user;
  $: myBooks = ($page.data?.borrowedBooks ?? []) as BorrowedBook[];
  $: myReservations = ($page.data?.reservations ?? []) as Reservation[];
  $: recentActivity = ($page.data?.activities ?? []) as Activity[];
  $: penalties = ($page.data?.penalties ?? []) as Penalty[];

  $: currentBooksCount = myBooks.filter((b) => b.status === 'borrowed' || b.status === 'active').length;
  $: overdueCount = myBooks.filter((b) => b.status === 'overdue').length;
  $: reservationsCount = myReservations.length;
  $: unpaidPenalties = penalties.filter((p) => p.status === 'unpaid' || p.status === 'overdue');
  $: totalUnpaidAmount = unpaidPenalties.reduce((sum, p) => sum + (p.fine || p.amount || 0), 0);
  $: dueSoonBooks = myBooks.filter((b) => b.daysLeft >= 0 && b.daysLeft <= 3);

  function getDaysLeftStatus(daysLeft: number) {
    if (daysLeft < 0) return 'overdue';
    if (daysLeft <= 3) return 'due-soon';
    return 'active';
  }

  function formatCurrency(amount: number) {
    return `₱${amount.toFixed(2)}`;
  }

  function getAmountValue(p: Penalty): number {
    return p.fine ?? p.amount ?? 0;
  }

  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  const quickActions = [
    { label: 'Browse Catalog', icon: 'search',   href: '/catalog',       color: '#0D5C29', bg: '#E8F5E9' },
    { label: 'Reserve Book',   icon: 'bookmark',  href: '/catalog',       color: '#4A7C59', bg: '#F1F8E9' },
    { label: 'Return Request', icon: 'return',    href: '/my-books',      color: '#1565C0', bg: '#E3F2FD' },
    { label: 'Pay Fines',      icon: 'pay',       href: '/penalties',     color: '#B8860B', bg: '#FFF8E6' },
    { label: 'My History',     icon: 'history',   href: '/history',       color: '#6A1B9A', bg: '#F3E5F5' },
    { label: 'Notifications',  icon: 'bell',      href: '/notifications', color: '#C62828', bg: '#FFEBEE' },
  ];
</script>

<svelte:head>
  <title>Dashboard | E-Kalibro Client Portal</title>
</svelte:head>

<!-- outer gap: tighter mobile, roomier desktop -->
<div class="flex flex-col gap-2.5 sm:gap-1.5 text-sm text-slate-800">

  <!-- ── Header ─────────────────────────────────────── -->
  <div class="relative overflow-hidden bg-white border border-slate-100 rounded-xl shadow-sm px-3 py-3 sm:px-5 sm:py-3">
    <div class="absolute inset-0 bg-gradient-to-br from-[#0D5C29]/5 via-transparent to-[#E8B923]/10 pointer-events-none rounded-xl"></div>
    <div class="flex items-center gap-2 sm:gap-2 relative z-10">
      <!-- avatar -->
      <div class="w-10 h-10 sm:w-7 sm:h-7 rounded-md bg-gradient-to-br from-[#0D5C29] to-[#4A7C59] flex items-center justify-center text-white font-extrabold text-base sm:text-lg shrink-0">
        {getInitials(user?.name || 'U')}
      </div>
      <div>
        <h1 class="text-base sm:text-base font-bold text-slate-900 leading-tight">
          Hello, {user?.name?.split(' ')[0] || 'Student'}!
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          {user?.userType === 'faculty' ? 'Faculty' : 'Student'} · {user?.department || user?.course || 'General'}
          {#if user?.enrollmentNo || user?.facultyNumber}
            · <span class="font-semibold text-slate-600">{user?.enrollmentNo || user?.facultyNumber}</span>
          {/if}
        </p>
      </div>
    </div>
  </div>

  <!-- ── Alerts ────────────────────────────────────── -->
  {#if overdueCount > 0 || totalUnpaidAmount > 0}
    <div class="flex flex-col gap-1.5 sm:gap-1.5">
      {#if overdueCount > 0}
        <div class="flex items-start gap-2 px-3 py-2.5 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm leading-snug bg-red-50 text-red-800 border border-red-200">
          <svg class="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>
          <span><strong>{overdueCount} overdue</strong> item{overdueCount > 1 ? 's' : ''} — return immediately to avoid higher fines.</span>
        </div>
      {/if}
      {#if totalUnpaidAmount > 0}
        <div class="flex items-start gap-2 px-3 py-2.5 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm leading-snug bg-amber-50 text-amber-800 border border-amber-200">
          <span class="shrink-0 mt-0.5 w-3.5 h-3.5 flex items-center justify-center font-extrabold text-sm leading-none">₱</span>
          <span>Unpaid fines: <strong>{formatCurrency(totalUnpaidAmount)}</strong> — please settle at the library counter.</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ── Stats: mobile = 3 top + 2 bottom, desktop = 5 cols ── -->
  <div class="sm:hidden flex flex-col gap-1.5">
    <!-- Row 1: Borrowed, Reserved, Overdue -->
    <div class="grid grid-cols-3 gap-1.5">
      <!-- Borrowed -->
      <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-sm text-center">
        <div class="w-8 h-8 rounded-lg bg-[#0D5C29] flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z"/></svg>
        </div>
        <div class="text-lg font-extrabold text-slate-900 leading-none">{currentBooksCount}</div>
        <div class="text-xs text-slate-400 font-medium leading-tight">Borrowed</div>
      </div>
      <!-- Reserved -->
      <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-sm text-center">
        <div class="w-8 h-8 rounded-lg bg-[#4A7C59] flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clip-rule="evenodd"/></svg>
        </div>
        <div class="text-lg font-extrabold text-slate-900 leading-none">{reservationsCount}</div>
        <div class="text-xs text-slate-400 font-medium leading-tight">Reserved</div>
      </div>
      <!-- Overdue -->
      <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-sm text-center">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-red-500">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>
        </div>
        <div class="text-lg font-extrabold leading-none {overdueCount > 0 ? 'text-red-600' : 'text-slate-900'}">{overdueCount}</div>
        <div class="text-xs text-slate-400 font-medium leading-tight">Overdue</div>
      </div>
    </div>
    <!-- Row 2: Due Soon, Fines -->
    <div class="grid grid-cols-2 gap-1.5">
      <!-- Due Soon -->
      <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-sm text-center">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-orange-500">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd"/></svg>
        </div>
        <div class="text-lg font-extrabold leading-none {dueSoonBooks.length > 0 ? 'text-orange-600' : 'text-slate-900'}">{dueSoonBooks.length}</div>
        <div class="text-xs text-slate-400 font-medium leading-tight">Due Soon</div>
      </div>
      <!-- Fines - peso icon -->
      <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-sm text-center">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#E8B923]">
          <span class="text-white font-extrabold text-base leading-none">₱</span>
        </div>
        <div class="text-sm font-extrabold leading-none {totalUnpaidAmount > 0 ? 'text-[#B8860B]' : 'text-slate-900'}">{formatCurrency(totalUnpaidAmount)}</div>
        <div class="text-xs text-slate-400 font-medium leading-tight">Fines</div>
      </div>
    </div>
  </div>

  <!-- Desktop: 5 cols -->
  <div class="hidden sm:grid grid-cols-5 gap-2">
    <!-- Borrowed -->
    <div class="bg-white border border-slate-100 rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-9 h-9 rounded-lg bg-[#0D5C29] flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z"/></svg>
      </div>
      <div class="text-2xl font-extrabold text-slate-900 leading-none">{currentBooksCount}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Borrowed</div>
    </div>
    <!-- Reserved -->
    <div class="bg-white border border-slate-100 rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-9 h-9 rounded-lg bg-[#4A7C59] flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clip-rule="evenodd"/></svg>
      </div>
      <div class="text-2xl font-extrabold text-slate-900 leading-none">{reservationsCount}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Reserved</div>
    </div>
    <!-- Overdue -->
    <div class="bg-white border border-slate-100 rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-red-500">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>
      </div>
      <div class="text-2xl font-extrabold leading-none {overdueCount > 0 ? 'text-red-600' : 'text-slate-900'}">{overdueCount}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Overdue</div>
    </div>
    <!-- Due Soon -->
    <div class="bg-white border border-slate-100 rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-orange-500">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd"/></svg>
      </div>
      <div class="text-2xl font-extrabold leading-none {dueSoonBooks.length > 0 ? 'text-orange-600' : 'text-slate-900'}">{dueSoonBooks.length}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Due Soon</div>
    </div>
    <!-- Fines - peso icon -->
    <div class="bg-white border border-slate-100 rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#E8B923]">
        <span class="text-white font-extrabold text-lg leading-none">₱</span>
      </div>
      <div class="text-base font-extrabold leading-none {totalUnpaidAmount > 0 ? 'text-[#B8860B]' : 'text-slate-900'}">{formatCurrency(totalUnpaidAmount)}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Fines</div>
    </div>
  </div>

  <!-- ── Quick Actions ──────────────────────────────── -->
  <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
    <div class="flex items-center gap-2 mb-2 sm:mb-2.5">
      <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-400 shrink-0"></span>
      <span class="text-xs sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions</span>
    </div>
    <!-- 3 cols mobile, 6 cols desktop -->
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
      {#each quickActions as qa}
        <a href={qa.href}
          class="flex flex-col items-center gap-1.5 sm:gap-1.5 py-2.5 sm:py-4 px-1.5 sm:px-3 rounded-xl border border-slate-100 bg-white no-underline transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
          style="--qa-color:{qa.color}; --qa-bg:{qa.bg}"
        >
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center" style="background:{qa.color}">
            {#if qa.icon === 'search'}
              <svg class="w-5 h-5 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clip-rule="evenodd"/></svg>
            {:else if qa.icon === 'bookmark'}
              <svg class="w-5 h-5 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clip-rule="evenodd"/></svg>
            {:else if qa.icon === 'return'}
              <svg class="w-5 h-5 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9.53 2.47a.75.75 0 0 1 0 1.06L4.81 8.25H15a6.75 6.75 0 0 1 0 13.5h-3a.75.75 0 0 1 0-1.5h3a5.25 5.25 0 1 0 0-10.5H4.81l4.72 4.72a.75.75 0 1 1-1.06 1.06l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>
            {:else if qa.icon === 'pay'}
              <svg class="w-5 h-5 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M4.5 3.75a3 3 0 0 0-3 3v.75h21v-.75a3 3 0 0 0-3-3h-15Z"/><path fill-rule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3v-7.5Zm-18 3.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clip-rule="evenodd"/></svg>
            {:else if qa.icon === 'history'}
              <svg class="w-5 h-5 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd"/></svg>
            {:else}
              <svg class="w-5 h-5 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z"/><path fill-rule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25Zm0 18a2.25 2.25 0 0 1-2.248-2.354 24.183 24.183 0 0 0 4.496 0A2.25 2.25 0 0 1 12 20.25Z" clip-rule="evenodd"/></svg>
            {/if}
          </div>
          <span class="text-xs sm:text-xs font-semibold text-slate-700 leading-tight text-center">{qa.label}</span>
        </a>
      {/each}
    </div>
  </div>

  <!-- ── Needs Attention ────────────────────────────── -->
  {#if dueSoonBooks.length > 0 || overdueCount > 0}
    <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
      <div class="flex items-center gap-1.5 sm:gap-1.5 mb-2 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-400 shrink-0"></span>
        <span class="text-xs sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Needs Attention</span>
      </div>
      <div class="flex flex-col gap-1.5 sm:gap-1.5">
        {#each myBooks.filter(b => b.status === 'overdue' || b.daysLeft <= 3) as book}
          <div class="flex items-center gap-2 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-slate-50 border border-slate-100">
            <div class="flex-1 min-w-0">
              <p class="text-xs sm:text-sm font-semibold text-slate-800 truncate">{book.title}</p>
              <p class="text-[10px] sm:text-sm text-slate-400">{book.author} · Due {book.dueDate}</p>
            </div>
            {#if book.status === 'overdue'}
              <span class="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[10px] sm:text-sm font-bold bg-red-50 text-red-600 border border-red-200 whitespace-nowrap">{Math.abs(book.daysLeft)}d overdue</span>
            {:else}
              <span class="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[10px] sm:text-sm font-bold bg-orange-50 text-orange-600 border border-orange-200 whitespace-nowrap">{book.daysLeft}d left</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ── Main Grid ───────────────────────────────────── -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2">

    <!-- Current Books -->
    <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
      <div class="flex items-center gap-1.5 sm:gap-1.5 mb-1.5 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0D5C29] shrink-0"></span>
        <span class="text-xs sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Current Books</span>
        <span class="text-[10px] sm:text-sm font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{currentBooksCount}</span>
      </div>
      <div class="flex flex-col max-h-52 sm:max-h-64 overflow-y-auto">
        {#each myBooks as book}
          <div class="flex items-start gap-2 px-1.5 py-1 sm:gap-2 sm:px-3 sm:py-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div class="flex-1 min-w-0">
              <p class="text-sm sm:text-sm font-bold text-slate-800 leading-tight line-clamp-1">{book.title}</p>
              <p class="text-xs sm:text-xs text-slate-400 truncate">{book.author}</p>
              <p class="text-xs sm:text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                <svg class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Due {book.dueDate}
              </p>
            </div>
            <div class="text-right shrink-0">
              {#if getDaysLeftStatus(book.daysLeft) === 'overdue'}
                <span class="inline-flex items-center px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-red-50 text-red-600 border border-red-200">Overdue</span>
                <p class="text-[10px] sm:text-xs text-red-500 font-semibold mt-0.5">{Math.abs(book.daysLeft)}d</p>
              {:else if getDaysLeftStatus(book.daysLeft) === 'due-soon'}
                <span class="inline-flex items-center px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-orange-50 text-orange-600 border border-orange-200">Soon</span>
                <p class="text-[10px] sm:text-xs text-orange-500 font-semibold mt-0.5">{book.daysLeft}d</p>
              {:else}
                <span class="inline-flex items-center px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">Active</span>
                <p class="text-[10px] sm:text-xs text-slate-400 mt-0.5">{book.daysLeft}d</p>
              {/if}
            </div>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center py-6 sm:py-7 text-slate-400">
            <svg class="w-7 h-7 sm:w-10 sm:h-10 mb-1.5 sm:mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            <span class="text-xs sm:text-sm">No books borrowed</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Reservations -->
    <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
      <div class="flex items-center gap-1.5 sm:gap-1.5 mb-1.5 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#4A7C59] shrink-0"></span>
        <span class="text-xs sm:text-xs font-bold text-slate-500 uppercase tracking-wider">My Reservations</span>
        <span class="text-[10px] sm:text-sm font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{reservationsCount}</span>
      </div>
      <div class="flex flex-col max-h-52 sm:max-h-64 overflow-y-auto">
        {#each myReservations as res}
          <div class="flex items-start gap-2 px-1.5 py-1 sm:gap-2 sm:px-3 sm:py-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div class="flex-1 min-w-0">
              <p class="text-sm sm:text-sm font-bold text-slate-800 leading-tight line-clamp-1">{res.title}</p>
              <p class="text-xs sm:text-xs text-slate-400 truncate">{res.author}</p>
              <p class="text-xs sm:text-xs text-slate-300">{res.reservedDate}</p>
            </div>
            <div class="shrink-0">
              <span class="inline-flex items-center px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">{res.status}</span>
            </div>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center py-6 sm:py-7 text-slate-400">
            <svg class="w-7 h-7 sm:w-10 sm:h-10 mb-1.5 sm:mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span class="text-xs sm:text-sm">No reservations</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
      <div class="flex items-center gap-1.5 sm:gap-1.5 mb-1.5 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-400 shrink-0"></span>
        <span class="text-xs sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Activity</span>
      </div>
      <div class="flex flex-col max-h-52 sm:max-h-64 overflow-y-auto divide-y divide-slate-50">
        {#each recentActivity as act}
          <div class="flex items-start gap-2 py-1 px-1 sm:gap-2 sm:py-3 hover:bg-slate-50 rounded-lg transition-colors">
            <div class="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-xl flex items-center justify-center shrink-0 mt-0.5
              {act.type === 'borrow'      ? 'bg-[#0D5C29]' :
               act.type === 'return'      ? 'bg-blue-500'    :
               act.type === 'penalty'     ? 'bg-red-500'      :
               act.type === 'reservation' ? 'bg-[#4A7C59]': 'bg-slate-400'}">
              {#if act.type === 'borrow'}
                <svg class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd"/></svg>
              {:else if act.type === 'return'}
                <svg class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd"/></svg>
              {:else if act.type === 'penalty'}
                <svg class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>
              {:else if act.type === 'reservation'}
                <svg class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clip-rule="evenodd"/></svg>
              {:else}
                <svg class="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd"/></svg>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm sm:text-sm font-medium text-slate-700 line-clamp-1">{act.details}</p>
              <p class="text-xs sm:text-xs text-slate-400">{act.timestamp}</p>
            </div>
          </div>
        {:else}
          <div class="flex items-center justify-center py-6 sm:py-7">
            <span class="text-xs sm:text-base text-slate-400">No recent activity</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Penalties -->
    <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
      <div class="flex items-center gap-1.5 sm:gap-1.5 mb-1.5 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#E8B923] shrink-0"></span>
        <span class="text-xs sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Penalties & Fines</span>
        <span class="ml-auto text-[10px] sm:text-sm font-bold text-[#B8860B] bg-[#FFF8E6] border border-[#E8B923]/30 px-1.5 sm:px-3 py-0.5 rounded-full">
          {formatCurrency(totalUnpaidAmount)}
        </span>
      </div>
      <div class="flex flex-col max-h-52 sm:max-h-64 overflow-y-auto divide-y divide-slate-50">
        {#each penalties as penalty}
          <div class="flex items-center gap-2 py-1 px-1 sm:gap-2 sm:py-3 hover:bg-slate-50 rounded-lg transition-colors">
            <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 {penalty.status === 'unpaid' || penalty.status === 'overdue' ? 'bg-red-500' : 'bg-emerald-500'}"></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm sm:text-sm font-medium text-slate-800 truncate">{penalty.title}</p>
              <p class="text-xs sm:text-xs text-slate-400">Due: {penalty.dueDate}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm sm:text-sm font-bold text-slate-800">{formatCurrency(getAmountValue(penalty))}</p>
              <p class="text-[10px] sm:text-xs font-bold uppercase tracking-wide {penalty.status === 'unpaid' || penalty.status === 'overdue' ? 'text-red-500' : 'text-emerald-500'}">
                {penalty.status === 'unpaid' || penalty.status === 'overdue' ? 'Unpaid' : 'Paid'}
              </p>
            </div>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center py-6 sm:py-7 text-emerald-600">
            <svg class="w-7 h-7 sm:w-10 sm:h-10 mb-1.5 sm:mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
            <span class="text-xs sm:text-sm font-medium">No penalties — great standing!</span>
          </div>
        {/each}
      </div>
    </div>

  </div>
</div>