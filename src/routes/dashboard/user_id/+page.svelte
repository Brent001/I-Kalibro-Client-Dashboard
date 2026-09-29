<script lang="ts">
  import { onMount } from 'svelte';
  import JsBarcode from 'jsbarcode';
  import { Printer, UserCircle } from '@lucide/svelte';

  export let data: any;
  const user = data?.user;
  let svgEl: SVGSVGElement | null = null;
  let barcodeReady = false;

  function shortName(name: string | undefined) {
    if (!name) return 'User';
    return name.split(' ')[0];
  }

  function format711(identifier: string | undefined) {
    if (!identifier) return '—';
    const clean = identifier.replace(/\s+/g, '');
    if (clean.length >= 18) {
      return `${clean.slice(0, 7)} ${clean.slice(7, 18)}${clean.length > 18 ? ' ' + clean.slice(18) : ''}`;
    }
    if (clean.length > 7) return `${clean.slice(0, 7)} ${clean.slice(7)}`;
    return clean;
  }

  function handlePrint() {
    window.print();
  }

  onMount(() => {
    const value = user?.enrollmentNo ?? user?.facultyNumber;
    if (!value || !svgEl) return;
    try {
      JsBarcode(svgEl, String(value), {
        format: 'CODE128',
        displayValue: false,
        height: 72,
        width: 2,
        margin: 10,
        lineColor: '#1a2e1e',
        background: '#ffffff',
      });
      barcodeReady = true;
    } catch (err) {
      console.error('JsBarcode error', err);
    }
  });
</script>

<div class="w-full space-y-5 text-slate-800">

  <!-- Header -->
  <div class="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
    <div class="flex-shrink-0 w-14 h-14 rounded-xl bg-[#f0f7f2] border border-[#d9eee1] flex items-center justify-center text-[#0D5C29]">
      <UserCircle class="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
    </div>
    <div class="flex-1 min-w-0">
      <h1 class="text-2xl font-bold text-slate-900 truncate">{shortName(user?.name)}'s ID</h1>
      <p class="text-sm text-slate-500 mt-0.5">Identification &amp; barcode card</p>
    </div>
    <button
      on:click={handlePrint}
      class="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors"
    >
      <Printer class="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
      Print
    </button>
  </div>

  <!-- ID Number Banner -->
  <div class="bg-[#0D5C29] rounded-2xl px-7 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-1.5">ID Number</p>
      <p class="text-3xl sm:text-4xl font-bold text-white tracking-wide tabular-nums leading-none">
        {user?.enrollmentNo ?? user?.facultyNumber ?? '—'}
      </p>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-[11px] font-bold uppercase tracking-wider text-white border border-white/30 bg-white/10 rounded-full px-3 py-1">
        {user?.userType ?? 'Member'}
      </span>
      <span class="text-sm text-white/60">@{user?.username ?? '—'}</span>
    </div>
  </div>

  <!-- Bottom Grid: Details + Barcode -->
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

    <!-- Personal Details -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <p class="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-5">Personal Details</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

        <div class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name</p>
          <p class="text-sm font-semibold text-slate-800">{user?.name ?? '—'}</p>
        </div>

        <div class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Username</p>
          <p class="text-sm font-semibold text-slate-800 break-all">{user?.username ?? '—'}</p>
        </div>

        <div class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dept / Course</p>
          <p class="text-sm font-semibold text-slate-800">{user?.department ?? user?.course ?? '—'}</p>
        </div>

        <div class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Position / Year</p>
          <p class="text-sm font-semibold text-slate-800">{user?.position ?? user?.year ?? '—'}</p>
        </div>

      </div>
    </div>

    <!-- Barcode -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center">
      <p class="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-5 self-start">Barcode</p>

      <div class="w-full bg-white border border-slate-200 rounded-xl flex items-center justify-center py-4 px-2 min-h-[100px]">
        <svg
          bind:this={svgEl}
          class="max-w-full transition-opacity duration-300"
          style="opacity: {barcodeReady ? 1 : 0}"
        ></svg>
      </div>

      <p class="mt-3 mb-5 text-sm font-semibold tracking-widest text-slate-500 tabular-nums">
        {format711(user?.enrollmentNo ?? user?.facultyNumber)}
      </p>

      <button
        on:click={handlePrint}
        class="w-full flex items-center justify-center gap-2 bg-[#0D5C29] hover:bg-[#116b30] text-white font-bold text-sm rounded-xl py-3 transition-colors"
      >
        <Printer class="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        Print ID
      </button>
    </div>

  </div>
</div>

<style>
  @media print {
    button { display: none !important; }
  }
</style>