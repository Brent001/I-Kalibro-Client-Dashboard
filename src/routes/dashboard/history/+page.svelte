<script lang="ts">
  import { onMount } from 'svelte';
  import { History } from '@lucide/svelte';
  import { tick } from 'svelte';

  interface HistoryEntry {
    id: number;
    itemId: number;
    catalogId: string | null;
    title: string | null;
    author: string | null;
    copyNumber: number | null;
    borrowDate: string | null;
    dueDate: string | null;
    returnDate: string | null;
    status: string | null;
    itemType: string;
    createdAt: string | null;
  }

  let history: HistoryEntry[] = [];
  let searchTerm = '';
  let filter = 'all';
  let loading = true;
  let errorMessage = '';
  let focusItemId: number | null = null;
  let focusItemType = '';

  $: filteredHistory = history.filter((item) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [item.title, item.author, item.catalogId, item.itemType]
      .some((value) => value?.toLowerCase().includes(query));
    const returned = Boolean(item.returnDate) || item.status === 'returned';
    const matchesFilter = filter === 'all' || (filter === 'returned' ? returned : !returned);
    return matchesSearch && matchesFilter;
  });

  async function loadHistory() {
    loading = true;
    errorMessage = '';
    try {
      const response = await fetch('/api/account/history', { credentials: 'include' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load borrowing history');
      history = result.data.history;
    } catch (cause) {
      errorMessage = cause instanceof Error ? cause.message : 'Unable to load borrowing history';
      history = [];
    } finally {
      loading = false;
    }
  }

  function formatDate(value: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function statusLabel(item: HistoryEntry) {
    if (item.returnDate || item.status === 'returned') return 'Returned';
    if (item.status === 'overdue' || (item.dueDate && new Date(item.dueDate).getTime() < Date.now())) return 'Overdue';
    return 'Borrowed';
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const itemId = Number(params.get('focusItemId'));
    focusItemId = Number.isInteger(itemId) && itemId > 0 ? itemId : null;
    focusItemType = (params.get('focusItemType') || '').toLowerCase();
    void (async () => {
      await loadHistory();
      if (focusItemId === null) return;
      await tick();
      document.querySelector(`[data-item-id="${focusItemId}"]${focusItemType ? `[data-item-type="${focusItemType}"]` : ''}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    })();
  });
</script>

<svelte:head><title>Borrowing History | I-Kalibro</title></svelte:head>

<main class="w-full space-y-2 text-sm" style="color:#2C1A0E;">
  <header class="relative overflow-hidden rounded-xl border px-3 py-3 shadow-sm sm:px-5 sm:py-3.5" style="background:linear-gradient(135deg,#3A6B3A 0%,#0D5C29 50%,#1A4D1A 100%);border-color:#1A4D1A;">
    <div class="pointer-events-none absolute inset-0 opacity-10" style="background-image:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,.05) 10px,rgba(255,255,255,.05) 11px);"></div>
    <div class="relative z-10 flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-3"><div class="flex h-11 w-11 items-center justify-center rounded-lg border-2" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);"><History class="h-5 w-5 text-white" strokeWidth={1.6} aria-hidden="true" /></div><div><h1 class="text-lg font-bold leading-tight text-[#F5F0E8] sm:text-xl">Borrowing History</h1><p class="mt-0.5 hidden text-xs text-white/70 sm:block sm:text-sm">Borrowed and returned items across the collection</p></div></div><a href="/dashboard/issued" class="rounded-lg border px-3 py-2 text-xs font-bold text-[#F5F0E8] hover:bg-white/10" style="border-color:rgba(255,255,255,.35);">Current items</a></div>
  </header>

  <section class="rounded-xl border p-2 shadow-sm sm:p-4" style="background:#F5F0E8;border-color:#D4C4A8;">
    <div class="grid gap-2 sm:grid-cols-[minmax(16rem,1fr)_12rem]">
      <label><span class="mb-1 block text-xs font-bold uppercase tracking-wide" style="color:#7A5A2A;">Search history</span><input bind:value={searchTerm} type="search" placeholder="Title, contributor, or catalog ID" class="h-11 w-full rounded-lg border px-3 text-sm focus:outline-none" style="background:#FDF8F0;border-color:#D4C4A8;color:#2C1A0E;" /></label>
      <label><span class="mb-1 block text-xs font-bold uppercase tracking-wide" style="color:#7A5A2A;">Status</span><select bind:value={filter} class="h-11 w-full rounded-lg border px-3 text-sm focus:outline-none" style="background:#FDF8F0;border-color:#D4C4A8;color:#2C1A0E;"><option value="all">All items</option><option value="current">Current</option><option value="returned">Returned</option></select></label>
    </div>
  </section>

  {#if errorMessage}
    <div class="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm" style="background:#F5E6E6;border-color:#D4A0A0;color:#7A1A1A;" role="alert"><span class="flex-1">{errorMessage}</span><button class="text-xs font-bold underline" on:click={loadHistory}>Retry</button></div>
  {:else if loading}
    <div class="rounded-xl border px-4 py-12 text-center text-sm" style="background:#F5F0E8;border-color:#D4C4A8;color:#7A5A2A;" role="status">Loading history...</div>
  {:else if filteredHistory.length === 0}
    <div class="rounded-xl border px-4 py-12 text-center" style="background:#F5F0E8;border-color:#D4C4A8;"><h2 class="text-base font-bold" style="color:#2C1A0E;">No matching borrowing records</h2><p class="mt-1 text-sm" style="color:#9A7A5A;">Completed loans will appear here after library staff records them.</p></div>
  {:else}
      <div class="overflow-hidden rounded-xl border shadow-sm" style="border-color:#D4C4A8;"><div class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead><tr style="background:#EDE4D4;border-bottom:1.5px solid #D4C4A8;"><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Item</th><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Type / ID</th><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Borrowed</th><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Due</th><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Returned</th><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Status</th></tr></thead>
          <tbody>
            {#each filteredHistory as item (`${item.itemType}-${item.id}`)}
              <tr data-item-id={item.itemId} data-item-type={item.itemType.toLowerCase()} class={focusItemId === item.itemId && (!focusItemType || focusItemType === item.itemType.toLowerCase()) ? 'ring-2 ring-inset ring-amber-400' : ''} style="border-bottom:1px solid #EDE4D4;background:{focusItemId === item.itemId && (!focusItemType || focusItemType === item.itemType.toLowerCase()) ? '#FEF3C7' : '#FDF8F0'};">
                <td class="px-3 py-3.5 sm:px-5"><div class="font-bold" style="color:#1A3A1A;">{item.title || 'Catalog item'}</div><div class="mt-0.5 text-xs" style="color:#9A7A5A;">{item.author || 'Contributor not listed'}{#if item.copyNumber} · Copy {item.copyNumber}{/if}</div></td>
                <td class="px-3 py-3.5 capitalize sm:px-5"><div>{item.itemType === 'thesis' ? 'Research' : item.itemType}</div><div class="mt-0.5 font-mono text-xs" style="color:#B06A00;">{item.catalogId || '—'}</div></td>
                <td class="px-3 py-3.5 sm:px-5">{formatDate(item.borrowDate)}</td>
                <td class="px-3 py-3.5 sm:px-5">{formatDate(item.dueDate)}</td>
                <td class="px-3 py-3.5 sm:px-5">{formatDate(item.returnDate)}</td>
                <td class="px-3 py-3.5 sm:px-5"><span class="rounded-md px-2 py-1 text-[10px] font-bold" style={statusLabel(item) === 'Returned' ? 'background:#0D5C29;color:white;' : statusLabel(item) === 'Overdue' ? 'background:#A83232;color:white;' : 'background:#B06A00;color:white;'}>{statusLabel(item)}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div></div>
    {/if}
</main>
