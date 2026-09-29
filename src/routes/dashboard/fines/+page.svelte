<script lang="ts">
  import { onMount } from 'svelte';

  interface FineRecord {
    id: number;
    itemType: string;
    borrowingId: number;
    amount: number;
    daysOverdue: number;
    status: string;
    calculatedAt: string | null;
    createdAt: string | null;
  }

  let fines: FineRecord[] = [];
  let outstandingAmount = 0;
  let filter = 'all';
  let loading = true;
  let errorMessage = '';
  $: filteredFines = fines.filter((fine) => filter === 'all' || fine.status === filter);

  async function loadFines() {
    loading = true;
    errorMessage = '';
    try {
      const response = await fetch('/api/account/fines', { credentials: 'include' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to load fine records');
      fines = result.data.fines;
      outstandingAmount = result.data.outstandingAmount;
    } catch (cause) {
      errorMessage = cause instanceof Error ? cause.message : 'Unable to load fine records';
      fines = [];
      outstandingAmount = 0;
    } finally {
      loading = false;
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'PHP' }).format(amount);
  }

  function formatDate(value: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  onMount(() => {
    void loadFines();
  });
</script>

<svelte:head><title>Fine Status | I-Kalibro</title></svelte:head>

<main class="w-full space-y-2 text-sm" style="color:#2C1A0E;">
  <header class="relative overflow-hidden rounded-xl border px-3 py-3 shadow-sm sm:px-5 sm:py-3.5" style="background:linear-gradient(135deg,#3A6B3A 0%,#0D5C29 50%,#1A4D1A 100%);border-color:#1A4D1A;">
    <div class="pointer-events-none absolute inset-0 opacity-10" style="background-image:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,.05) 10px,rgba(255,255,255,.05) 11px);"></div>
    <div class="relative z-10 flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-3"><div class="flex h-11 w-11 items-center justify-center rounded-lg border-2 text-lg font-extrabold text-white" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);">₱</div><div><h1 class="text-lg font-bold leading-tight text-[#F5F0E8] sm:text-xl">Fine Status</h1><p class="mt-0.5 hidden text-xs text-white/70 sm:block sm:text-sm">Recorded charges and settlement status</p></div></div><div class="rounded-lg border px-3 py-2" style="background:rgba(0,0,0,.15);border-color:rgba(255,255,255,.25);"><p class="text-[10px] font-bold uppercase tracking-wide text-white/70">Outstanding</p><p class="mt-0.5 text-base font-extrabold tabular-nums text-[#F5F0E8]">{formatCurrency(outstandingAmount)}</p></div></div>
  </header>

  <section class="rounded-xl border p-2 shadow-sm sm:p-4" style="background:#F5F0E8;border-color:#D4C4A8;"><div class="flex flex-wrap items-center justify-between gap-3"><p class="max-w-2xl text-sm leading-6" style="color:#7A5A2A;">Payments are handled at the library counter. Current overdue loans appear under <a class="font-bold underline underline-offset-2" style="color:#0D5C29;" href="/dashboard/issued">My Items</a>.</p><label class="min-w-40"><span class="mb-1 block text-xs font-bold uppercase tracking-wide" style="color:#7A5A2A;">Status</span><select bind:value={filter} class="h-10 w-full rounded-lg border px-3 text-sm" style="background:#FDF8F0;border-color:#D4C4A8;color:#2C1A0E;"><option value="all">All records</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="waived">Waived</option></select></label></div></section>

    {#if errorMessage}
      <div class="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm" style="background:#F5E6E6;border-color:#D4A0A0;color:#7A1A1A;" role="alert"><span class="flex-1">{errorMessage}</span><button class="text-xs font-bold underline" on:click={loadFines}>Retry</button></div>
    {:else if loading}
      <div class="rounded-xl border px-4 py-12 text-center text-sm" style="background:#F5F0E8;border-color:#D4C4A8;color:#7A5A2A;" role="status">Loading fine records...</div>
    {:else if filteredFines.length === 0}
      <div class="rounded-xl border px-4 py-12 text-center" style="background:#F5F0E8;border-color:#D4C4A8;"><h2 class="text-base font-bold" style="color:#2C1A0E;">No fine records</h2><p class="mt-1 text-sm" style="color:#9A7A5A;">There are no recorded fines for this status.</p></div>
    {:else}
      <div class="overflow-hidden rounded-xl border shadow-sm" style="border-color:#D4C4A8;"><div class="overflow-x-auto">
        <table class="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead><tr style="background:#EDE4D4;border-bottom:1.5px solid #D4C4A8;"><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Item type</th><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Borrowing record</th><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Days overdue</th><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Amount</th><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Status</th><th class="px-3 py-3.5 text-xs font-bold uppercase tracking-widest sm:px-5" style="color:#7A5A2A;">Recorded</th></tr></thead>
          <tbody>
            {#each filteredFines as fine (fine.id)}
              <tr style="border-bottom:1px solid #EDE4D4;background:#FDF8F0;">
                <td class="px-3 py-3.5 capitalize sm:px-5">{fine.itemType === 'thesis' ? 'Research' : fine.itemType}</td>
                <td class="px-3 py-3.5 font-mono text-xs sm:px-5">#{fine.borrowingId}</td>
                <td class="px-3 py-3.5 sm:px-5">{fine.daysOverdue}</td>
                <td class="px-3 py-3.5 font-bold tabular-nums sm:px-5" style="color:#1A3A1A;">{formatCurrency(fine.amount)}</td>
                <td class="px-3 py-3.5 sm:px-5"><span class="rounded-md px-2 py-1 text-[10px] font-bold uppercase" style={fine.status === 'unpaid' ? 'background:#B06A00;color:white;' : 'background:#0D5C29;color:white;'}>{fine.status}</span></td>
                <td class="px-3 py-3.5 sm:px-5">{formatDate(fine.calculatedAt || fine.createdAt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div></div>
    {/if}
</main>
