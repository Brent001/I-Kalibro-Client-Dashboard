<script lang="ts">
  import { page } from '$app/stores';
  import { invalidateAll } from '$app/navigation';

  // ── Types ──────────────────────────────────────────
  type User = {
    id: number;
    uniqueId: string;
    name: string;
    email: string | null;
    phone: string | null;
    username: string;
    userType: 'student' | 'faculty';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    // student fields
    enrollmentNo: string | null;
    course: string | null;
    year: string | null;
    gender: string | null;
    age: number | null;
    department: string | null;
    // faculty fields
    facultyNumber: string | null;
    position: string | null;
  };

  type Stats = {
    totalBorrowedEver: number;
    currentlyBorrowed: number;
    libraryVisits: number;
  };

  // ── Data ───────────────────────────────────────────
  $: user  = ($page.data?.user  ?? {}) as User;
  $: stats = ($page.data?.stats ?? { totalBorrowedEver: 0, currentlyBorrowed: 0, libraryVisits: 0 }) as Stats;

  // ── UI state ───────────────────────────────────────
  let editing       = false;
  let saving        = false;
  let saveError     = '';
  let saveSuccess   = false;
  let showSensitive = false;

  // ── Edit form ──────────────────────────────────────
  let form = {
    name: '', email: '', phone: '',
    gender: '', age: '', department: '',
    course: '', year: '', position: '',
  };

  function openEdit() {
    form = {
      name:       user.name       ?? '',
      email:      user.email      ?? '',
      phone:      user.phone      ?? '',
      gender:     user.gender     ?? '',
      age:        user.age != null ? String(user.age) : '',
      department: user.department ?? '',
      course:     user.course     ?? '',
      year:       user.year       ?? '',
      position:   user.position   ?? '',
    };
    saveError = ''; saveSuccess = false; editing = true;
  }

  function cancelEdit() { editing = false; saveError = ''; }

  async function saveProfile() {
    if (!form.name.trim()) { saveError = 'Name is required.'; return; }
    saving = true; saveError = '';
    try {
      const payload: Record<string, any> = {
        name:       form.name.trim(),
        email:      form.email.trim()     || null,
        phone:      form.phone.trim()     || null,
        gender:     form.gender           || null,
        age:        form.age ? Number(form.age) : null,
        department: form.department       || null,
      };
      if (user.userType === 'student') {
        payload.course = form.course || null;
        payload.year   = form.year   || null;
      }
      if (user.userType === 'faculty') {
        payload.position = form.position || null;
      }
      const res  = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        saveError = data.message || 'Failed to save.';
      } else {
        saveSuccess = true; editing = false;
        await invalidateAll();
      }
    } catch {
      saveError = 'Network error. Please try again.';
    } finally {
      saving = false;
    }
  }

  // ── Helpers ────────────────────────────────────────
  function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }
  function maskEmail(email: string | null): string {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (!domain) return '••••••••';
    return `${local[0]}••••••${local[local.length - 1]}@${domain}`;
  }
  function maskPhone(phone: string | null): string {
    if (!phone) return 'N/A';
    return '••••••' + phone.slice(-4);
  }
  function fmtDate(d: string | null) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const YEAR_OPTIONS   = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
  const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
</script>

<svelte:head>
  <title>My Profile | E-Kalibro Client Portal</title>
</svelte:head>

<div class="flex flex-col gap-2.5 sm:gap-1.5 text-sm text-slate-800">

  <!-- ── SUCCESS TOAST ────────────────────────────── -->
  {#if saveSuccess}
    <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium bg-green-50 text-green-800 border border-green-200">
      <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25z" clip-rule="evenodd"/></svg>
      Profile updated successfully.
    </div>
  {/if}

  <!-- ── HEADER CARD ───────────────────────────────── -->
  <div class="relative overflow-hidden bg-white border border-slate-100 rounded-xl shadow-sm px-3 py-3 sm:px-5 sm:py-3.5">
    <div class="absolute inset-0 bg-gradient-to-br from-[#0D5C29]/5 via-transparent to-[#E8B923]/10 pointer-events-none rounded-xl"></div>
    <div class="relative z-10 flex items-center gap-3">
      <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[#0D5C29] to-[#4A7C59] flex items-center justify-center text-white font-extrabold text-xl shrink-0 shadow">
        {getInitials(user?.name || 'U')}
      </div>
      <div class="flex-1 min-w-0">
        <h1 class="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">{user.name || 'User'}</h1>
        <p class="text-xs text-slate-500 mt-0.5 truncate">
          {#if user.userType === 'student'}
            Student · {user.course || 'Course N/A'}
            {#if user.enrollmentNo}<span class="font-semibold text-slate-600"> · {user.enrollmentNo}</span>{/if}
          {:else}
            Faculty · {user.department || 'Dept N/A'}
            {#if user.facultyNumber}<span class="font-semibold text-slate-600"> · {user.facultyNumber}</span>{/if}
          {/if}
        </p>
        <div class="flex items-center gap-1.5 mt-1">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border
            {user.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}">
            <span class="w-1.5 h-1.5 rounded-full {user.isActive ? 'bg-green-500' : 'bg-red-500'}"></span>
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
          <span class="text-[10px] text-slate-400 font-medium capitalize">{user.userType}</span>
        </div>
      </div>
      <div class="flex flex-col sm:flex-row gap-1.5 shrink-0">
        <button
          on:click={() => showSensitive = !showSensitive}
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 transition-all"
        >
          {#if showSensitive}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
            Hide
          {:else}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Reveal
          {/if}
        </button>
        {#if !editing}
          <button on:click={openEdit}
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0D5C29] text-white text-[11px] font-bold hover:bg-[#0a4d23] transition-all">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z"/><path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z"/></svg>
            Edit
          </button>
        {/if}
        <a href="/dashboard/profile/activity_logs" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 transition-all">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.1 0-2 .9-2 2v4h-2l4 4 4-4h-2v-4c0-1.1-.9-2-2-2z"/></svg>
          Activity Logs
        </a>
      </div>
    </div>
  </div>

  <!-- ── STATS ─────────────────────────────────────── -->
  <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
    <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 sm:py-2.5 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0D5C29] flex items-center justify-center shrink-0">
        <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103Z"/></svg>
      </div>
      <div class="text-lg sm:text-2xl font-extrabold text-slate-900 leading-none">{stats.totalBorrowedEver}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Items Borrowed</div>
    </div>
    <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 sm:py-2.5 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#4A7C59] flex items-center justify-center shrink-0">
        <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.5 2.25a.75.75 0 000 1.5v16.5h-.75a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5h-.75V3.75a.75.75 0 000-1.5h-15zM9 6a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H9zm-.75 3.75A.75.75 0 019 9h1.5a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM9 12a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H9zm3.75-5.25A.75.75 0 0113.5 6H15a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H15a.75.75 0 000-1.5h-1.5zm-.75 3.75A.75.75 0 0113.5 12H15a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM9 19.5v-2.25a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v2.25a.75.75 0 01-.75.75h-4.5A.75.75 0 019 19.5z" clip-rule="evenodd"/></svg>
      </div>
      <div class="text-lg sm:text-2xl font-extrabold text-slate-900 leading-none">{stats.libraryVisits}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Library Visits</div>
    </div>
    <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 sm:py-2.5 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#E8B923] flex items-center justify-center shrink-0">
        <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 011.04-.207z" clip-rule="evenodd"/></svg>
      </div>
      <div class="text-lg sm:text-2xl font-extrabold text-slate-900 leading-none">{stats.currentlyBorrowed}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Currently Borrowed</div>
    </div>
  </div>

  <!-- ── EDIT FORM ─────────────────────────────────── -->
  {#if editing}
    <div class="bg-white border border-[#0D5C29]/30 rounded-xl shadow-sm p-3 sm:p-3.5">
      <div class="flex items-center gap-1.5 mb-3">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0D5C29] shrink-0"></span>
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Edit Profile</span>
      </div>

      {#if saveError}
        <div class="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"/></svg>
          {saveError}
        </div>
      {/if}

      <!-- Basic Info -->
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Basic Information</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-500" for="f-name">Full Name <span class="text-red-500">*</span></label>
          <input id="f-name" type="text" bind:value={form.name} placeholder="Full name"
            class="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#0D5C29] focus:bg-white transition-all" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-500" for="f-email">Email</label>
          <input id="f-email" type="email" bind:value={form.email} placeholder="Email address"
            class="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#0D5C29] focus:bg-white transition-all" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-500" for="f-phone">Phone</label>
          <input id="f-phone" type="tel" bind:value={form.phone} placeholder="Phone number"
            class="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#0D5C29] focus:bg-white transition-all" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-500" for="f-gender">Gender</label>
          <select id="f-gender" bind:value={form.gender}
            class="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#0D5C29] focus:bg-white transition-all">
            <option value="">— Select —</option>
            {#each GENDER_OPTIONS as g}<option value={g}>{g}</option>{/each}
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-500" for="f-age">Age</label>
          <input id="f-age" type="number" bind:value={form.age} min="1" max="120" placeholder="Age"
            class="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#0D5C29] focus:bg-white transition-all" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-semibold text-slate-500" for="f-dept">Department</label>
          <input id="f-dept" type="text" bind:value={form.department} placeholder="Department"
            class="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#0D5C29] focus:bg-white transition-all" />
        </div>
      </div>

      <!-- Student-only -->
      {#if user.userType === 'student'}
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Academic Details</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-semibold text-slate-500" for="f-course">Course / Program</label>
            <input id="f-course" type="text" bind:value={form.course} placeholder="e.g. BSCS, BSIT"
              class="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#0D5C29] focus:bg-white transition-all" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-semibold text-slate-500" for="f-year">Year Level</label>
            <select id="f-year" bind:value={form.year}
              class="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#0D5C29] focus:bg-white transition-all">
              <option value="">— Select —</option>
              {#each YEAR_OPTIONS as y}<option value={y}>{y}</option>{/each}
            </select>
          </div>
        </div>
      {/if}

      <!-- Faculty-only -->
      {#if user.userType === 'faculty'}
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Faculty Details</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-semibold text-slate-500" for="f-position">Position / Title</label>
            <input id="f-position" type="text" bind:value={form.position} placeholder="e.g. Instructor, Professor"
              class="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#0D5C29] focus:bg-white transition-all" />
          </div>
        </div>
      {/if}

      <!-- Read-only note -->
      <p class="text-[10px] text-slate-400 mb-3">
        <svg class="inline w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/></svg>
        {user.userType === 'student' ? 'Enrollment No.' : 'Faculty No.'} and Username are managed by library administration and cannot be changed here.
      </p>

      <div class="flex items-center gap-2">
        <button on:click={saveProfile} disabled={saving}
          class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D5C29] text-white text-xs font-bold hover:bg-[#0a4d23] disabled:opacity-60 disabled:cursor-not-allowed transition-all">
          {#if saving}
            <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
            Saving…
          {:else}
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 011.04-.207z" clip-rule="evenodd"/></svg>
            Save Changes
          {/if}
        </button>
        <button on:click={cancelEdit} disabled={saving}
          class="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-all">
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <!-- ── VIEW MODE ──────────────────────────────────── -->
  {#if !editing}

    <!-- Contact Information -->
    <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
      <div class="flex items-center gap-1.5 mb-2 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0D5C29] shrink-0"></span>
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Information</span>
        {#if !showSensitive}
          <span class="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd"/></svg>
            Protected
          </span>
        {/if}
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <!-- Email -->
        <div class="flex items-center gap-2 px-2 py-2 sm:px-3 sm:py-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <div class="w-7 h-7 rounded-lg bg-[#E3F2FD] flex items-center justify-center shrink-0">
            <svg class="w-3.5 h-3.5 text-[#1565C0]" fill="currentColor" viewBox="0 0 24 24"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] text-slate-400 font-medium">Email</p>
            <p class="text-xs sm:text-sm font-semibold text-slate-800 truncate font-mono">
              {showSensitive ? (user.email || 'N/A') : maskEmail(user.email)}
            </p>
          </div>
        </div>
        <!-- Phone -->
        <div class="flex items-center gap-2 px-2 py-2 sm:px-3 sm:py-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <div class="w-7 h-7 rounded-lg bg-[#F3E5F5] flex items-center justify-center shrink-0">
            <svg class="w-3.5 h-3.5 text-[#6A1B9A]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clip-rule="evenodd"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] text-slate-400 font-medium">Phone</p>
            <p class="text-xs sm:text-sm font-semibold text-slate-800 font-mono">
              {showSensitive ? (user.phone || 'N/A') : maskPhone(user.phone)}
            </p>
          </div>
        </div>
        <!-- Username -->
        <div class="flex items-center gap-2 px-2 py-2 sm:px-3 sm:py-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <div class="w-7 h-7 rounded-lg bg-[#E8F5E9] flex items-center justify-center shrink-0">
            <svg class="w-3.5 h-3.5 text-[#0D5C29]" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] text-slate-400 font-medium">Username</p>
            <p class="text-xs sm:text-sm font-semibold text-slate-800 truncate">{user.username || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Academic / Faculty Details -->
    <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
      <div class="flex items-center gap-1.5 mb-2 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#4A7C59] shrink-0"></span>
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {user.userType === 'faculty' ? 'Faculty Details' : 'Academic Details'}
        </span>
      </div>
      {#if user.userType === 'student'}
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {#each [
            { label: 'Enrollment No.', value: user.enrollmentNo, locked: true  },
            { label: 'Course',         value: user.course                      },
            { label: 'Year Level',     value: user.year                        },
            { label: 'Department',     value: user.department                  },
            { label: 'Gender',         value: user.gender                      },
            { label: 'Age',            value: user.age != null ? String(user.age) : null },
          ] as f}
            <div class="flex flex-col gap-0.5 px-2 py-2 sm:px-3 sm:py-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span class="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                {f.label}
                {#if f.locked}
                  <svg class="w-2.5 h-2.5 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd"/></svg>
                {/if}
              </span>
              <span class="text-xs sm:text-sm font-semibold text-slate-800">{f.value || 'N/A'}</span>
            </div>
          {/each}
        </div>
      {:else if user.userType === 'faculty'}
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {#each [
            { label: 'Faculty No.',  value: user.facultyNumber, locked: true },
            { label: 'Position',     value: user.position                    },
            { label: 'Department',   value: user.department                  },
            { label: 'Gender',       value: user.gender                      },
            { label: 'Age',          value: user.age != null ? String(user.age) : null },
          ] as f}
            <div class="flex flex-col gap-0.5 px-2 py-2 sm:px-3 sm:py-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span class="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                {f.label}
                {#if f.locked}
                  <svg class="w-2.5 h-2.5 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd"/></svg>
                {/if}
              </span>
              <span class="text-xs sm:text-sm font-semibold text-slate-800">{f.value || 'N/A'}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Account Details -->
    <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
      <div class="flex items-center gap-1.5 mb-2 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-400 shrink-0"></span>
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Details</span>
      </div>
      <div class="grid grid-cols-2 gap-1.5">
        <div class="flex flex-col gap-0.5 px-2 py-2 sm:px-3 sm:py-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <span class="text-[10px] text-slate-400 font-medium">Member Since</span>
          <span class="text-xs sm:text-sm font-semibold text-slate-800">{fmtDate(user.createdAt)}</span>
        </div>
        <div class="flex flex-col gap-0.5 px-2 py-2 sm:px-3 sm:py-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <span class="text-[10px] text-slate-400 font-medium">Last Updated</span>
          <span class="text-xs sm:text-sm font-semibold text-slate-800">{fmtDate(user.updatedAt)}</span>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-white border border-slate-100 rounded-xl shadow-sm p-3 sm:p-3.5">
      <div class="flex items-center gap-1.5 mb-2 sm:mb-2.5">
        <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-400 shrink-0"></span>
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
        <button on:click={openEdit}
          class="flex items-center gap-2.5 px-3 py-3 sm:py-4 rounded-xl border border-slate-100 bg-white text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 bg-[#0D5C29]">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z"/><path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z"/></svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-700 leading-tight">Edit Profile</p>
            <p class="text-[10px] text-slate-400 mt-0.5 leading-tight">Update your info</p>
          </div>
        </button>
        <button class="flex items-center gap-2.5 px-3 py-3 sm:py-4 rounded-xl border border-slate-100 bg-white text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 bg-[#4A7C59]">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd"/></svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-700 leading-tight">Change Password</p>
            <p class="text-[10px] text-slate-400 mt-0.5 leading-tight">Update your password</p>
          </div>
        </button>
        <a href="/help" class="flex items-center gap-2.5 px-3 py-3 sm:py-4 rounded-xl border border-slate-100 bg-white no-underline transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 bg-[#1565C0]">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/></svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-700 leading-tight">Help & Support</p>
            <p class="text-[10px] text-slate-400 mt-0.5 leading-tight">Get assistance</p>
          </div>
        </a>
      </div>
    </div>

  {/if}
</div>