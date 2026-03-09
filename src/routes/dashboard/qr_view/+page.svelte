<script lang="ts">
  import { onMount } from 'svelte';

  export let data: any;
  const user = data?.user;
  let qrHtml: string | null = null;
  let qrReady = false;

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

  onMount(async () => {
    const value = user?.enrollmentNo ?? user?.facultyNumber;
    if (!value) return;
    try {
      const QR = await import('qrcode');
      // render as SVG string
      const svg = await (QR as any).toString(String(value), { type: 'svg', margin: 1, width: 260 });
      qrHtml = svg;
      qrReady = true;
    } catch (err) {
      console.error('QR generation error', err);
    }
  });
</script>

<div class="w-full space-y-5 text-slate-800">

  <!-- Header -->
  <div class="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
    <div class="flex-shrink-0 w-14 h-14 rounded-xl bg-[#f0f7f2] border border-[#d9eee1] flex items-center justify-center text-[#0D5C29]">
      <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0"/>
      </svg>
    </div>
    <div class="flex-1 min-w-0">
      <h1 class="text-2xl font-bold text-slate-900 truncate">{shortName(user?.name)}'s ID</h1>
      <p class="text-sm text-slate-500 mt-0.5">Identification &amp; barcode card</p>
    </div>
    <button
      on:click={handlePrint}
      class="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-colors"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-6 0h.008v.008H12V10.5Z"/>
      </svg>
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
    <!-- on small screens this should appear before details -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center order-first lg:order-last">
      <p class="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-5 self-start">Barcode</p>

      <div class="w-full bg-white border border-slate-200 rounded-xl flex items-center justify-center py-4 px-2 min-h-[100px]">
        <div class="max-w-full transition-opacity duration-300" style="opacity: {qrReady ? 1 : 0}" aria-hidden={!qrReady} >
          {@html qrHtml}
        </div>
      </div>

      <p class="mt-3 mb-5 text-sm font-semibold tracking-widest text-slate-500 tabular-nums">
        {format711(user?.enrollmentNo ?? user?.facultyNumber)}
      </p>

      <button
        on:click={handlePrint}
        class="w-full flex items-center justify-center gap-2 bg-[#0D5C29] hover:bg-[#116b30] text-white font-bold text-sm rounded-xl py-3 transition-colors"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-6 0h.008v.008H12V10.5Z"/>
        </svg>
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