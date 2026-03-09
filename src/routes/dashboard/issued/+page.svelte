<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  export let data;
  const currentUser = data.user;

  interface Transaction {
    id: number;
    bookId: number;
    bookTitle: string;
    bookAuthor: string;
    dueDate?: string;
    borrowDate?: string;
    reservedDate?: string;
    status?: string;
    itemType?: string;
  }

  type Tab = 'all' | 'borrowed' | 'reserved' | 'overdue';

  let activeTab: Tab = 'all';
  let searchTerm = "";
  let loading = false;
  let error = "";
  let isDesktop = false;

  let borrowedBooks: Transaction[] = [];
  let reservedBooks: Transaction[] = [];
  let overdueBooks: Transaction[] = [];

  $: allBooks = [
    ...overdueBooks.map(b => ({ ...b, _type: 'overdue' as const })),
    ...borrowedBooks.map(b => ({ ...b, _type: 'borrowed' as const })),
    ...reservedBooks.map(b => ({ ...b, _type: 'reserved' as const })),
  ];

  function matchSearch(item: Transaction) {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.bookTitle.toLowerCase().includes(q) ||
      item.bookAuthor.toLowerCase().includes(q) ||
      item.bookId.toString().includes(q)
    );
  }

  $: filteredAll      = allBooks.filter(matchSearch);
  $: filteredBorrowed = borrowedBooks.map(b => ({ ...b, _type: 'borrowed' as const })).filter(matchSearch);
  $: filteredReserved = reservedBooks.map(r => ({ ...r, _type: 'reserved' as const })).filter(matchSearch);
  $: filteredOverdue  = overdueBooks.map(o => ({ ...o, _type: 'overdue'  as const })).filter(matchSearch);

  $: currentList =
    activeTab === 'all'      ? filteredAll :
    activeTab === 'borrowed' ? filteredBorrowed :
    activeTab === 'reserved' ? filteredReserved :
                               filteredOverdue;

  function checkWidth() {
    isDesktop = window.innerWidth >= 768;
  }

  async function apiCall(endpoint: string, method = 'GET', body?: any) {
    const options: RequestInit = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(endpoint, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  async function fetchIssuedBooks() {
    loading = true;
    error = "";
    try {
      const res = await apiCall('/api/issued');

      const normalizeBorrow = (b: any): Transaction => ({
        id: b.id,
        bookId: b.bookId ?? b.itemId ?? b.book_id ?? b.item_id,
        bookTitle: b.bookTitle ?? b.title ?? b.name ?? '',
        bookAuthor: b.bookAuthor ?? b.author ?? b.publisher ?? '',
        dueDate: b.dueDate ?? b.due_date ?? null,
        borrowDate: b.borrowDate ?? b.borrow_date ?? null,
        status: b.status ?? null,
        itemType: b.itemType ?? null,
      });

      const normalizeReserve = (r: any): Transaction => ({
        id: r.id,
        bookId: r.bookId ?? r.itemId ?? r.book_id ?? r.item_id,
        bookTitle: r.bookTitle ?? r.title ?? r.name ?? '',
        bookAuthor: r.bookAuthor ?? r.author ?? r.publisher ?? '',
        reservedDate: r.reservedDate ?? r.requestedBorrowDate ?? r.requestDate ?? r.requested_borrow_date ?? null,
        status: r.status ?? null,
        itemType: r.itemType ?? null,
      });

      borrowedBooks = (res.borrowed || []).map(normalizeBorrow);
      reservedBooks = (res.reserved || []).map(normalizeReserve);
      overdueBooks  = (res.overdue  || []).map(normalizeBorrow);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch issued books';
    } finally {
      loading = false;
    }
  }

  async function cancelReservation(id: number) {
    const reservation = reservedBooks.find(r => r.id === id);
    if (!reservation) { error = 'Reservation not found'; return; }
    if (!confirm(`Cancel reservation for "${reservation.bookTitle}"?`)) return;
    loading = true;
    try {
      await apiCall('/api/books/transaction/cancel_reserve', 'POST', {
        bookId: reservation.bookId,
        userId: currentUser.id,
      });
      reservedBooks = reservedBooks.filter(r => r.id !== id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to cancel reservation';
    } finally {
      loading = false;
    }
  }

  function fmtDate(d?: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function fmtDateShort(d?: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function getRowType(item: Transaction & { _type?: string }): 'overdue' | 'borrowed' | 'reserved' {
    if (item._type) return item._type as any;
    return 'borrowed';
  }

  /** Returns initials from a title for the book spine avatar */
  function bookInitials(title: string) {
    return title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  const spineColors: Record<string, string[]> = {
    overdue:  ['#FEE2E2', '#EF4444', '#991B1B'],
    reserved: ['#ECFDF5', '#10B981', '#064E3B'],
    borrowed: ['#F0FDF4', '#22C55E', '#14532D'],
  };

  onMount(() => {
    checkWidth();
    window.addEventListener('resize', checkWidth);
    fetchIssuedBooks();
  });

  onDestroy(() => {
    window.removeEventListener('resize', checkWidth);
  });
</script>

<div class="flex flex-col gap-2.5 text-sm text-slate-800">

  <!-- ── Header ── -->
  <div class="relative overflow-hidden bg-white border border-slate-100 rounded-xl shadow-sm px-4 py-3.5">
    <div class="absolute inset-0 bg-gradient-to-br from-[#0D5C29]/5 via-transparent to-[#E8B923]/10 pointer-events-none rounded-xl"></div>
    <div class="relative z-10 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-base font-bold text-slate-900 leading-tight">My Library</h1>
        <p class="text-xs text-slate-500 mt-0.5">Manage your borrowed books, reservations, and overdue items</p>
      </div>
      <div class="flex items-center gap-1.5 mt-2 sm:mt-0">
        {#if overdueBooks.length > 0}
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
            {overdueBooks.length} overdue
          </span>
        {/if}
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          {borrowedBooks.length + reservedBooks.length + overdueBooks.length} total
        </span>
      </div>
    </div>
  </div>

  <!-- ── Error banner ── -->
  {#if error}
    <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs bg-red-50 text-red-800 border border-red-200">
      <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>
      {error}
      <button class="ml-auto text-red-500 hover:text-red-700 font-bold" on:click={() => error = ''}>✕</button>
    </div>
  {/if}

  <!-- ── Stats bar ── -->
  <div class="grid grid-cols-4 gap-1.5">
    <div class="bg-white border border-slate-100 rounded-xl py-2.5 px-2 flex flex-col items-center gap-1 shadow-sm text-center">
      <div class="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
        <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm4.5 7.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm.75-3.75a.75.75 0 0 0 0 1.5H15a.75.75 0 0 0 0-1.5H8.25Z" clip-rule="evenodd"/></svg>
      </div>
      <div class="text-base font-extrabold text-slate-900 leading-none">{allBooks.length}</div>
      <div class="text-[10px] text-slate-400 font-medium">All</div>
    </div>
    <div class="bg-white border border-slate-100 rounded-xl py-2.5 px-2 flex flex-col items-center gap-1 shadow-sm text-center">
      <div class="w-7 h-7 rounded-lg bg-[#0D5C29] flex items-center justify-center">
        <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z"/></svg>
      </div>
      <div class="text-base font-extrabold text-slate-900 leading-none">{borrowedBooks.length}</div>
      <div class="text-[10px] text-slate-400 font-medium">Borrowed</div>
    </div>
    <div class="bg-white border border-slate-100 rounded-xl py-2.5 px-2 flex flex-col items-center gap-1 shadow-sm text-center">
      <div class="w-7 h-7 rounded-lg bg-[#4A7C59] flex items-center justify-center">
        <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clip-rule="evenodd"/></svg>
      </div>
      <div class="text-base font-extrabold text-slate-900 leading-none">{reservedBooks.length}</div>
      <div class="text-[10px] text-slate-400 font-medium">Reserved</div>
    </div>
    <div class="bg-white border border-slate-100 rounded-xl py-2.5 px-2 flex flex-col items-center gap-1 shadow-sm text-center">
      <div class="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center">
        <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>
      </div>
      <div class="text-base font-extrabold leading-none {overdueBooks.length > 0 ? 'text-red-600' : 'text-slate-900'}">{overdueBooks.length}</div>
      <div class="text-[10px] text-slate-400 font-medium">Overdue</div>
    </div>
  </div>

  <!-- ── Search + Content ── -->
  <div class="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">

    <!-- Search bar -->
    <div class="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2">
      <div class="relative flex-1">
        <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search by title, author, or ID…"
          bind:value={searchTerm}
          class="block w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] text-xs transition-all bg-slate-50 placeholder:text-slate-400"
        />
      </div>
      {#if loading}
        <svg class="w-4 h-4 text-slate-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      {/if}
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-slate-100">
      {#each [
        { key: 'all',      label: 'All'      },
        { key: 'borrowed', label: 'Borrowed'  },
        { key: 'reserved', label: 'Reserved'  },
        { key: 'overdue',  label: 'Overdue'   },
      ] as tab}
        <button
          on:click={() => activeTab = tab.key as Tab}
          class="flex-1 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors duration-150
            {activeTab === tab.key
              ? 'border-[#0D5C29] text-[#0D5C29]'
              : 'border-transparent text-slate-500 hover:text-slate-700'}"
        >
          {tab.label}
        </button>
      {/each}
    </div>

    {#if currentList.length > 0}

      {#if isDesktop}
        <!-- ══ DESKTOP: Table (unchanged) ══ -->
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Book</th>
                <th class="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Author</th>
                <th class="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {activeTab === 'reserved' ? 'Reserved Date' : 'Due Date'}
                </th>
                {#if activeTab === 'all'}
                  <th class="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                {/if}
                <th class="px-4 py-2 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              {#each currentList as item (item.id)}
                {@const rowType = getRowType(item as any)}
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full shrink-0
                        {rowType === 'overdue' ? 'bg-red-500' :
                         rowType === 'reserved' ? 'bg-[#4A7C59]' : 'bg-[#0D5C29]'}">
                      </span>
                      <div>
                        <p class="text-sm font-semibold text-slate-800">{item.bookTitle}</p>
                        <p class="text-[10px] text-slate-400">ID: {item.bookId}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-xs text-slate-500">{item.bookAuthor}</td>
                  <td class="px-4 py-3">
                    {#if rowType === 'reserved'}
                      <span class="text-xs text-slate-500">{fmtDate(item.reservedDate)}</span>
                    {:else}
                      <span class="text-xs {rowType === 'overdue' ? 'text-red-600 font-semibold' : 'text-slate-500'}">{fmtDate(item.dueDate)}</span>
                    {/if}
                  </td>
                  {#if activeTab === 'all'}
                    <td class="px-4 py-3">
                      {#if rowType === 'overdue'}
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">Overdue</span>
                      {:else if rowType === 'reserved'}
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Reserved</span>
                      {:else}
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#0D5C29] border border-[#0D5C29]/20">Borrowed</span>
                      {/if}
                    </td>
                  {/if}
                  <td class="px-4 py-3 text-right">
                    {#if rowType === 'reserved'}
                      <button
                        on:click={() => cancelReservation(item.id)}
                        class="text-xs font-semibold text-rose-600 hover:text-rose-800 border border-rose-200 hover:border-rose-400 px-2.5 py-1 rounded-md transition-colors"
                      >Cancel</button>
                    {:else if rowType === 'overdue'}
                      <button
                        class="text-xs font-semibold text-amber-600 hover:text-amber-800 border border-amber-200 hover:border-amber-400 px-2.5 py-1 rounded-md transition-colors"
                      >Acknowledge</button>
                    {:else}
                      <span class="text-xs text-slate-300">—</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

      {:else}
        <!-- ══ MOBILE: Redesigned Cards ══ -->
        <div class="divide-y divide-slate-100">
          {#each currentList as item (item.id)}
            {@const rowType = getRowType(item as any)}
            {@const colors = spineColors[rowType]}
            <div class="px-3 py-3 flex gap-3 items-start">

              <!-- Book spine avatar -->
              <div
                class="shrink-0 w-10 h-14 rounded-md flex flex-col items-center justify-center text-[10px] font-black leading-none shadow-sm border select-none"
                style="background:{colors[0]}; border-color:{colors[1]}20; color:{colors[2]};"
              >
                <span class="text-base leading-none">{bookInitials(item.bookTitle)}</span>
                <span class="mt-0.5 text-[8px] font-semibold opacity-50 uppercase tracking-widest">
                  {rowType === 'overdue' ? '!!!' : rowType === 'reserved' ? 'RESV' : 'BRRW'}
                </span>
              </div>

              <!-- Main content -->
              <div class="flex-1 min-w-0 flex flex-col gap-1">
                <!-- Row 1: title + badge -->
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 flex-1">{item.bookTitle}</p>
                  {#if rowType === 'overdue'}
                    <span class="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                      <span class="w-1 h-1 rounded-full bg-red-500 inline-block"></span>Overdue
                    </span>
                  {:else if rowType === 'reserved'}
                    <span class="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Reserved</span>
                  {:else}
                    <span class="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#0D5C29] border border-[#0D5C29]/20">Borrowed</span>
                  {/if}
                </div>

                <!-- Row 2: author -->
                <p class="text-[11px] text-slate-400 truncate">{item.bookAuthor}</p>

                <!-- Row 3: meta chips + action -->
                <div class="flex items-center justify-between gap-2 mt-0.5">
                  <!-- Meta chips -->
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <!-- Date chip -->
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium
                      {rowType === 'overdue'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                      <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      {rowType === 'reserved' ? fmtDateShort(item.reservedDate) : fmtDateShort(item.dueDate)}
                    </span>
                    <!-- ID chip -->
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-100">
                      #{item.bookId}
                    </span>
                  </div>

                  <!-- Action button -->
                  {#if rowType === 'reserved'}
                    <button
                      on:click={() => cancelReservation(item.id)}
                      class="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-rose-600 active:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      Cancel
                    </button>
                  {:else if rowType === 'overdue'}
                    <button
                      class="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-amber-600 active:bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      Acknowledge
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

    {:else if loading}
      <div class="px-4 py-8 flex flex-col gap-4">
        {#each [1,2,3] as _}
          <div class="flex gap-3 animate-pulse">
            <!-- Spine skeleton -->
            <div class="w-10 h-14 rounded-md bg-slate-100 shrink-0"></div>
            <div class="flex-1 flex flex-col gap-2 justify-center">
              <div class="h-3.5 bg-slate-100 rounded w-3/4"></div>
              <div class="h-3 bg-slate-100 rounded w-1/2"></div>
              <div class="h-3 bg-slate-100 rounded w-1/3"></div>
            </div>
          </div>
        {/each}
      </div>

    {:else}
      <div class="flex flex-col items-center justify-center py-12 text-slate-400">
        {#if activeTab === 'overdue'}
          <svg class="w-10 h-10 mb-3 opacity-20 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
          <p class="text-xs font-medium text-slate-400">No overdue books — great standing!</p>
        {:else}
          <svg class="w-10 h-10 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
          <p class="text-xs font-medium">
            {searchTerm ? 'No results found' :
             activeTab === 'all' ? 'No issued items' :
             activeTab === 'reserved' ? 'No reserved books' : 'No borrowed books'}
          </p>
          {#if searchTerm}
            <button class="mt-2 text-xs text-[#0D5C29] hover:underline" on:click={() => searchTerm = ''}>Clear search</button>
          {/if}
        {/if}
      </div>
    {/if}

  </div>
</div>