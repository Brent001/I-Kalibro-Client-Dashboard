<script lang="ts">
  import { page } from "$app/stores";
  import {
    Bell,
    BookOpen,
    Bookmark,
    Calendar,
    Check,
    CircleCheck,
    Clock,
    CreditCard,
    History,
    Plus,
    Search,
    TriangleAlert,
    Undo2
  } from '@lucide/svelte';

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
    daysOverdue?: number;
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
    { label: 'Browse Catalog', icon: 'search',   href: '/dashboard/books',         color: '#0D5C29', bg: '#C8DFC8' },
    { label: 'Reserve a Copy', icon: 'bookmark', href: '/dashboard/books',         color: '#2E6B45', bg: '#D4E6D4' },
    { label: 'My Items',       icon: 'return',   href: '/dashboard/issued',        color: '#1A4A7A', bg: '#C8D8EE' },
    { label: 'Fine Status',    icon: 'pay',      href: '/dashboard/fines',          color: '#7A5A00', bg: '#EEE0A8' },
    { label: 'My History',     icon: 'history',  href: '/dashboard/history',        color: '#5A1A7A', bg: '#E0C8EE' },
    { label: 'Notifications',  icon: 'bell',     href: '/dashboard/notifications',  color: '#8B1A1A', bg: '#EED0C8' },
  ];

  const quickActionIcons = { search: Search, bookmark: Bookmark, return: Undo2, pay: CreditCard, history: History, bell: Bell };
</script>

<svelte:head>
  <title>Dashboard | E-Kalibro Client Portal</title>
</svelte:head>

<!-- Warm parchment base background -->
<div class="flex flex-col gap-2.5 sm:gap-2 text-sm" style="color: #2C1A0E;">

  <!-- ── Header ─────────────────────────────────────── -->
  <div class="relative overflow-hidden rounded-xl shadow-sm px-3 py-3 sm:px-5 sm:py-3.5 border"
    style="background: linear-gradient(135deg, #3A6B3A 0%, #0D5C29 50%, #1A4D1A 100%); border-color: #1A4D1A;">
    <!-- Subtle texture overlay -->
    <div class="absolute inset-0 opacity-10 pointer-events-none"
      style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 11px);"></div>
    <div class="flex items-center gap-2 sm:gap-3 relative z-10">
      <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center text-white font-extrabold text-base shrink-0 border-2"
        style="background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); backdrop-filter: blur(4px);">
        {getInitials(user?.name || 'U')}
      </div>
      <div>
        <h1 class="text-base sm:text-lg font-bold leading-tight" style="color: #F5F0E8;">
          Hello, {user?.name?.split(' ')[0] || 'Student'}!
        </h1>
        <p class="text-xs sm:text-sm mt-0.5" style="color: rgba(245,240,232,0.7);">
          {user?.userType === 'faculty' ? 'Faculty' : 'Student'} · {user?.department || user?.course || 'General'}
          {#if user?.enrollmentNo || user?.facultyNumber}
            · <span class="font-semibold" style="color: #E8C84A;">{user?.enrollmentNo || user?.facultyNumber}</span>
          {/if}
        </p>
      </div>
    </div>
  </div>

  <!-- ── Alerts ────────────────────────────────────── -->
  {#if overdueCount > 0 || totalUnpaidAmount > 0}
    <div class="flex flex-col gap-1.5">
      {#if overdueCount > 0}
        <div class="flex items-start gap-2 px-3 py-2.5 sm:px-4 rounded-lg text-xs sm:text-sm leading-snug border"
          style="background: #F5E6E6; color: #7A1A1A; border-color: #D4A0A0;">
          <TriangleAlert class="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span><strong>{overdueCount} overdue</strong> item{overdueCount > 1 ? 's' : ''} — return immediately to avoid higher fines.</span>
        </div>
      {/if}
      {#if totalUnpaidAmount > 0}
        <div class="flex items-start gap-2 px-3 py-2.5 sm:px-4 rounded-lg text-xs sm:text-sm leading-snug border"
          style="background: #F5EDD0; color: #7A5500; border-color: #D4B86A;">
          <span class="shrink-0 mt-0.5 w-3.5 h-3.5 flex items-center justify-center font-extrabold text-sm leading-none">₱</span>
          <span>Unpaid fines: <strong>{formatCurrency(totalUnpaidAmount)}</strong> — please settle at the library counter.</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ── Stats: mobile = 3 top + 2 bottom, desktop = 5 cols ── -->
  <div class="sm:hidden flex flex-col gap-1.5">
    <div class="grid grid-cols-3 gap-1.5">
      <!-- Borrowed -->
      <div class="rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-sm text-center border"
        style="background: #EFF5EF; border-color: #B8D4B8;">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background: #0D5C29;">
          <BookOpen class="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <div class="text-lg font-extrabold leading-none" style="color: #0D5C29;">{currentBooksCount}</div>
        <div class="text-xs font-medium leading-tight" style="color: #5A7A5A;">Borrowed</div>
      </div>
      <!-- Reserved -->
      <div class="rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-sm text-center border"
        style="background: #EAF2EC; border-color: #B0CCB8;">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background: #2E6B45;">
          <Bookmark class="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <div class="text-lg font-extrabold leading-none" style="color: #2E6B45;">{reservationsCount}</div>
        <div class="text-xs font-medium leading-tight" style="color: #5A7A5A;">Reserved</div>
      </div>
      <!-- Overdue -->
      <div class="rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-sm text-center border"
        style="background: #F5EAEA; border-color: #D4A8A8;">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background: #A83232;">
          <TriangleAlert class="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <div class="text-lg font-extrabold leading-none" style="color: {overdueCount > 0 ? '#A83232' : '#3A2A1A'};">{overdueCount}</div>
        <div class="text-xs font-medium leading-tight" style="color: #7A5A5A;">Overdue</div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-1.5">
      <!-- Due Soon -->
      <div class="rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-sm text-center border"
        style="background: #F5EDD8; border-color: #D4B87A;">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background: #B06A00;">
          <Clock class="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <div class="text-lg font-extrabold leading-none" style="color: {dueSoonBooks.length > 0 ? '#B06A00' : '#3A2A1A'};">{dueSoonBooks.length}</div>
        <div class="text-xs font-medium leading-tight" style="color: #7A6A3A;">Due Soon</div>
      </div>
      <!-- Fines -->
      <div class="rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-sm text-center border"
        style="background: #F5F0D8; border-color: #D4C87A;">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background: #9A7A00;">
          <span class="text-white font-extrabold text-base leading-none">₱</span>
        </div>
        <div class="text-sm font-extrabold leading-none" style="color: {totalUnpaidAmount > 0 ? '#7A5A00' : '#3A2A1A'};">{formatCurrency(totalUnpaidAmount)}</div>
        <div class="text-xs font-medium leading-tight" style="color: #7A6A3A;">Fines</div>
      </div>
    </div>
  </div>

  <!-- Desktop: 5 cols -->
  <div class="hidden sm:grid grid-cols-5 gap-2">
    <div class="rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-2 shadow-sm text-center border transition-all hover:shadow-md hover:-translate-y-0.5"
      style="background: #EFF5EF; border-color: #B8D4B8;">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: #0D5C29;">
        <BookOpen class="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <div class="text-2xl font-extrabold leading-none" style="color: #0D5C29;">{currentBooksCount}</div>
      <div class="text-xs font-medium leading-tight" style="color: #5A7A5A;">Borrowed</div>
    </div>
    <div class="rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-2 shadow-sm text-center border transition-all hover:shadow-md hover:-translate-y-0.5"
      style="background: #EAF2EC; border-color: #B0CCB8;">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: #2E6B45;">
        <Bookmark class="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <div class="text-2xl font-extrabold leading-none" style="color: #2E6B45;">{reservationsCount}</div>
      <div class="text-xs font-medium leading-tight" style="color: #5A7A5A;">Reserved</div>
    </div>
    <div class="rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-2 shadow-sm text-center border transition-all hover:shadow-md hover:-translate-y-0.5"
      style="background: #F5EAEA; border-color: #D4A8A8;">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: #A83232;">
        <TriangleAlert class="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <div class="text-2xl font-extrabold leading-none" style="color: {overdueCount > 0 ? '#A83232' : '#3A2A1A'};">{overdueCount}</div>
      <div class="text-xs font-medium leading-tight" style="color: #7A5A5A;">Overdue</div>
    </div>
    <div class="rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-2 shadow-sm text-center border transition-all hover:shadow-md hover:-translate-y-0.5"
      style="background: #F5EDD8; border-color: #D4B87A;">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: #B06A00;">
        <Clock class="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <div class="text-2xl font-extrabold leading-none" style="color: {dueSoonBooks.length > 0 ? '#B06A00' : '#3A2A1A'};">{dueSoonBooks.length}</div>
      <div class="text-xs font-medium leading-tight" style="color: #7A6A3A;">Due Soon</div>
    </div>
    <div class="rounded-xl py-3 px-2 flex flex-col items-center justify-center gap-2 shadow-sm text-center border transition-all hover:shadow-md hover:-translate-y-0.5"
      style="background: #F5F0D8; border-color: #D4C87A;">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background: #9A7A00;">
        <span class="text-white font-extrabold text-lg leading-none">₱</span>
      </div>
      <div class="text-base font-extrabold leading-none" style="color: {totalUnpaidAmount > 0 ? '#7A5A00' : '#3A2A1A'};">{formatCurrency(totalUnpaidAmount)}</div>
      <div class="text-xs font-medium leading-tight" style="color: #7A6A3A;">Fines</div>
    </div>
  </div>

  <!-- ── Quick Actions ──────────────────────────────── -->
  <div class="rounded-xl shadow-sm p-3 sm:p-3.5 border" style="background: #F5F0E8; border-color: #D4C4A8;">
    <div class="flex items-center gap-2 mb-2 sm:mb-2.5">
      <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style="background: #9A7A4A;"></span>
      <span class="text-xs sm:text-xs font-bold uppercase tracking-wider" style="color: #7A5A2A;">Quick Actions</span>
    </div>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
      {#each quickActions as qa}
        <a href={qa.href}
          class="flex flex-col items-center gap-1.5 py-2.5 sm:py-4 px-1.5 sm:px-3 rounded-xl no-underline transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md border"
          style="background: {qa.bg}; border-color: {qa.color}22;"
        >
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center" style="background: {qa.color};">
            <svelte:component this={quickActionIcons[qa.icon as keyof typeof quickActionIcons] ?? Bell} class="h-5 w-5 text-white" strokeWidth={2} aria-hidden="true" />
          </div>
          <span class="text-xs font-semibold leading-tight text-center" style="color: {qa.color};">{qa.label}</span>
        </a>
      {/each}
    </div>
  </div>

  <!-- ── Needs Attention ────────────────────────────── -->
  {#if dueSoonBooks.length > 0 || overdueCount > 0}
    <div class="rounded-xl shadow-sm p-3 sm:p-3.5 border" style="background: #F8F0E0; border-color: #D4B87A;">
      <div class="flex items-center gap-1.5 mb-2 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style="background: #B06A00;"></span>
        <span class="text-xs font-bold uppercase tracking-wider" style="color: #7A5A2A;">Needs Attention</span>
      </div>
      <div class="flex flex-col gap-1.5">
        {#each myBooks.filter(b => b.status === 'overdue' || b.daysLeft <= 3) as book}
          <div class="flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg border"
            style="background: #FDF8F0; border-color: #D4C4A8;">
            <div class="flex-1 min-w-0">
              <p class="text-xs sm:text-sm font-semibold truncate" style="color: #2C1A0E;">{book.title}</p>
              <p class="text-[10px] sm:text-xs" style="color: #9A7A5A;">{book.author} · Due {book.dueDate}</p>
            </div>
            {#if book.status === 'overdue'}
              <span class="inline-flex items-center px-1.5 py-0.5 sm:px-2 rounded-full text-[10px] sm:text-xs font-bold border whitespace-nowrap"
                style="background: #F5EAEA; color: #A83232; border-color: #D4A8A8;">{Math.abs(book.daysLeft)}d overdue</span>
            {:else}
              <span class="inline-flex items-center px-1.5 py-0.5 sm:px-2 rounded-full text-[10px] sm:text-xs font-bold border whitespace-nowrap"
                style="background: #F5EDD8; color: #B06A00; border-color: #D4B87A;">{book.daysLeft}d left</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ── Main Grid ───────────────────────────────────── -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">

    <!-- Current Books -->
    <div class="rounded-xl shadow-sm p-3 sm:p-3.5 border" style="background: #EFF5EF; border-color: #B8D4B8;">
      <div class="flex items-center gap-1.5 mb-1.5 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style="background: #0D5C29;"></span>
        <span class="text-xs font-bold uppercase tracking-wider" style="color: #2E6B45;">Current Books</span>
        <span class="text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full" style="background: #C8DFC8; color: #2E6B45;">{currentBooksCount}</span>
      </div>
      <div class="flex flex-col gap-1.5 sm:gap-2 max-h-52 sm:max-h-64 overflow-y-auto pr-0.5">
        {#each myBooks as book}
          {@const status = getDaysLeftStatus(book.daysLeft)}
          <div class="flex items-center gap-2.5 sm:gap-3 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-px"
            style="background: #FAFDF8; border-color: #C8DFC8; border-left: 3px solid {status === 'overdue' ? '#A83232' : status === 'due-soon' ? '#B06A00' : '#0D5C29'};">
            <!-- Book icon -->
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
              style="background: {status === 'overdue' ? '#F5EAEA' : status === 'due-soon' ? '#F5EDD8' : '#E8F4E8'};">
              <BookOpen class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                style="color: {status === 'overdue' ? '#A83232' : status === 'due-soon' ? '#B06A00' : '#0D5C29'};" aria-hidden="true" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs sm:text-sm font-bold leading-tight line-clamp-1" style="color: #1A3A1A;">{book.title}</p>
              <p class="text-[10px] sm:text-xs mt-0.5 flex items-center gap-1" style="color: #7A9A7A;">
                <Calendar class="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                Due {book.dueDate}
              </p>
            </div>
            <div class="shrink-0 text-right">
              {#if status === 'overdue'}
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                  style="background: #A83232; color: #fff;">Overdue</span>
                <p class="text-[10px] font-semibold mt-0.5" style="color: #A83232;">{Math.abs(book.daysLeft)}d ago</p>
              {:else if status === 'due-soon'}
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                  style="background: #B06A00; color: #fff;">Due Soon</span>
                <p class="text-[10px] font-semibold mt-0.5" style="color: #B06A00;">{book.daysLeft}d left</p>
              {:else}
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                  style="background: #0D5C29; color: #fff;">Active</span>
                <p class="text-[10px] mt-0.5" style="color: #5A7A5A;">{book.daysLeft}d left</p>
              {/if}
            </div>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center py-6 sm:py-7" style="color: #7A9A7A;">
            <BookOpen class="w-7 h-7 sm:w-10 sm:h-10 mb-1.5 sm:mb-3 opacity-30" strokeWidth={1.5} aria-hidden="true" />
            <span class="text-xs sm:text-sm">No books borrowed</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Reservations -->
    <div class="rounded-xl shadow-sm p-3 sm:p-3.5 border" style="background: #EAF2EC; border-color: #B0CCB8;">
      <div class="flex items-center gap-1.5 mb-1.5 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style="background: #2E6B45;"></span>
        <span class="text-xs font-bold uppercase tracking-wider" style="color: #2E6B45;">My Reservations</span>
        <span class="text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full" style="background: #B8D8C0; color: #2E6B45;">{reservationsCount}</span>
      </div>
      <div class="flex flex-col gap-1.5 sm:gap-2 max-h-52 sm:max-h-64 overflow-y-auto pr-0.5">
        {#each myReservations as res}
          <div class="flex items-center gap-2.5 sm:gap-3 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-px"
            style="background: #FAFDFB; border-color: #B8D8C0; border-left: 3px solid #2E6B45;">
            <!-- Bookmark icon -->
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
              style="background: #D4ECD8;">
              <Bookmark class="w-3.5 h-3.5 sm:w-4 sm:h-4" style="color: #2E6B45;" aria-hidden="true" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs sm:text-sm font-bold leading-tight line-clamp-1" style="color: #1A3A1A;">{res.title}</p>
              <p class="text-[10px] sm:text-xs mt-0.5" style="color: #7A9A7A;">{res.author} · {res.reservedDate}</p>
            </div>
            <div class="shrink-0">
              <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold capitalize"
                style="background: #2E6B45; color: #fff;">{res.status}</span>
            </div>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center py-6 sm:py-7" style="color: #7A9A7A;">
            <Calendar class="w-7 h-7 sm:w-10 sm:h-10 mb-1.5 sm:mb-3 opacity-30" strokeWidth={1.5} aria-hidden="true" />
            <span class="text-xs sm:text-sm">No reservations</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="rounded-xl shadow-sm p-3 sm:p-3.5 border" style="background: #F5F0E8; border-color: #D4C4A8;">
      <div class="flex items-center gap-1.5 mb-1.5 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style="background: #9A7A4A;"></span>
        <span class="text-xs font-bold uppercase tracking-wider" style="color: #7A5A2A;">Recent Activity</span>
      </div>
      <div class="flex flex-col gap-1.5 sm:gap-2 max-h-52 sm:max-h-64 overflow-y-auto pr-0.5">
        {#each recentActivity as act}
          {@const actColor = act.type === 'borrow' ? '#0D5C29' : act.type === 'return' ? '#1A4A7A' : act.type === 'penalty' ? '#A83232' : act.type === 'reservation' ? '#2E6B45' : '#9A7A4A'}
          {@const actBg = act.type === 'borrow' ? '#E8F4E8' : act.type === 'return' ? '#E0EAF5' : act.type === 'penalty' ? '#F5EAEA' : act.type === 'reservation' ? '#EAF2EC' : '#F5F0E8'}
          <div class="flex items-center gap-2.5 sm:gap-3 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-px"
            style="background: #FDFAF5; border-color: #D4C4A8; border-left: 3px solid {actColor};">
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0" style="background: {actBg};">
              {#if act.type === 'borrow'}
                <Plus class="w-3.5 h-3.5 sm:w-4 sm:h-4" style="color:{actColor}" aria-hidden="true" />
              {:else if act.type === 'return'}
                <Check class="w-3.5 h-3.5 sm:w-4 sm:h-4" style="color:{actColor}" aria-hidden="true" />
              {:else if act.type === 'penalty'}
                <TriangleAlert class="w-3.5 h-3.5 sm:w-4 sm:h-4" style="color:{actColor}" aria-hidden="true" />
              {:else if act.type === 'reservation'}
                <Bookmark class="w-3.5 h-3.5 sm:w-4 sm:h-4" style="color:{actColor}" aria-hidden="true" />
              {:else}
                <Clock class="w-3.5 h-3.5 sm:w-4 sm:h-4" style="color:{actColor}" aria-hidden="true" />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs sm:text-sm font-semibold line-clamp-1" style="color: #3A2A1A;">{act.details}</p>
              <p class="text-[10px] sm:text-xs mt-0.5" style="color: #9A7A5A;">{act.timestamp}</p>
            </div>
            <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md shrink-0"
              style="background: {actBg}; color: {actColor};">{act.type}</span>
          </div>
        {:else}
          <div class="flex items-center justify-center py-6 sm:py-7">
            <span class="text-xs sm:text-sm" style="color: #9A7A5A;">No recent activity</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Penalties -->
    <div class="rounded-xl shadow-sm p-3 sm:p-3.5 border" style="background: #F5F0D8; border-color: #D4C87A;">
      <div class="flex items-center gap-1.5 mb-1.5 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style="background: #9A7A00;"></span>
        <span class="text-xs font-bold uppercase tracking-wider" style="color: #7A5A00;">Penalties & Fines</span>
        <span class="ml-auto text-[10px] sm:text-xs font-bold px-1.5 sm:px-3 py-0.5 rounded-full border"
          style="color: #7A5A00; background: #EEE0A8; border-color: #D4B840;">
          {formatCurrency(totalUnpaidAmount)}
        </span>
      </div>
      <div class="flex flex-col gap-1.5 sm:gap-2 max-h-52 sm:max-h-64 overflow-y-auto pr-0.5">
        {#each penalties as penalty}
          {@const unpaid = penalty.status === 'unpaid' || penalty.status === 'overdue'}
          <div class="flex items-center gap-2.5 sm:gap-3 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-px"
            style="background: {unpaid ? '#FDFAF5' : '#FAFDFB'}; border-color: {unpaid ? '#D4B87A' : '#B8D4B8'}; border-left: 3px solid {unpaid ? '#A83232' : '#0D5C29'};">
            <!-- Status icon -->
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
              style="background: {unpaid ? '#F5EDD8' : '#E8F4E8'};">
              {#if unpaid}
                <TriangleAlert class="w-3.5 h-3.5 sm:w-4 sm:h-4" style="color: #A83232;" aria-hidden="true" />
              {:else}
                <CircleCheck class="w-3.5 h-3.5 sm:w-4 sm:h-4" style="color: #0D5C29;" aria-hidden="true" />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs sm:text-sm font-bold leading-tight line-clamp-1" style="color: #2C1A0E;">{penalty.title}</p>
              <p class="text-[10px] sm:text-xs mt-0.5" style="color: #9A7A5A;">
                Due {penalty.dueDate}{penalty.daysOverdue ? ` · ${penalty.daysOverdue}d overdue` : ''}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-extrabold" style="color: {unpaid ? '#A83232' : '#0D5C29'};">{formatCurrency(getAmountValue(penalty))}</p>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold mt-0.5"
                style="background: {unpaid ? '#A83232' : '#0D5C29'}; color: #fff;">
                {unpaid ? 'Unpaid' : 'Paid'}
              </span>
            </div>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center py-6 sm:py-7" style="color: #2E6B45;">
            <CircleCheck class="w-7 h-7 sm:w-10 sm:h-10 mb-1.5 sm:mb-3 opacity-30" strokeWidth={1.5} aria-hidden="true" />
            <span class="text-xs sm:text-sm font-medium">No penalties — great standing!</span>
          </div>
        {/each}
      </div>
    </div>

  </div>
</div>