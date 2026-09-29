<script lang="ts">
  import { page } from '$app/stores';
  import { invalidateAll } from '$app/navigation';
  import {
    Building2,
    BookOpen,
    Check,
    CircleCheck,
    Eye,
    EyeOff,
    History,
    Info,
    KeyRound,
    LifeBuoy,
    LoaderCircle,
    Lock,
    Mail,
    Phone,
    SquarePen,
    TriangleAlert,
    User as UserIcon
  } from '@lucide/svelte';

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
      <CircleCheck class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
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
            <EyeOff class="w-3 h-3" aria-hidden="true" />
            Hide
          {:else}
            <Eye class="w-3 h-3" aria-hidden="true" />
            Reveal
          {/if}
        </button>
        {#if !editing}
          <button on:click={openEdit}
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0D5C29] text-white text-[11px] font-bold hover:bg-[#0a4d23] transition-all">
            <SquarePen class="w-3 h-3" aria-hidden="true" />
            Edit
          </button>
        {/if}
        <a href="/dashboard/profile/activity_logs" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 transition-all">
          <History class="w-3 h-3" aria-hidden="true" />
          Activity Logs
        </a>
      </div>
    </div>
  </div>

  <!-- ── STATS ─────────────────────────────────────── -->
  <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
    <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 sm:py-2.5 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0D5C29] flex items-center justify-center shrink-0">
        <BookOpen class="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
      </div>
      <div class="text-lg sm:text-2xl font-extrabold text-slate-900 leading-none">{stats.totalBorrowedEver}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Items Borrowed</div>
    </div>
    <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 sm:py-2.5 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#4A7C59] flex items-center justify-center shrink-0">
        <Building2 class="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
      </div>
      <div class="text-lg sm:text-2xl font-extrabold text-slate-900 leading-none">{stats.libraryVisits}</div>
      <div class="text-xs text-slate-400 font-medium leading-tight">Library Visits</div>
    </div>
    <div class="bg-white border border-slate-100 rounded-xl py-3 px-2 sm:py-2.5 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-sm hover:border-slate-300 transition-colors text-center">
      <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#E8B923] flex items-center justify-center shrink-0">
        <Check class="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
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
          <TriangleAlert class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
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
        <Info class="inline w-3 h-3 mr-0.5 align-[-2px]" aria-hidden="true" />
        {user.userType === 'student' ? 'Enrollment No.' : 'Faculty No.'} and Username are managed by library administration and cannot be changed here.
      </p>

      <div class="flex items-center gap-2">
        <button on:click={saveProfile} disabled={saving}
          class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D5C29] text-white text-xs font-bold hover:bg-[#0a4d23] disabled:opacity-60 disabled:cursor-not-allowed transition-all">
          {#if saving}
            <LoaderCircle class="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            Saving…
          {:else}
            <Check class="w-3.5 h-3.5" aria-hidden="true" />
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
            <Lock class="w-2.5 h-2.5" aria-hidden="true" />
            Protected
          </span>
        {/if}
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <!-- Email -->
        <div class="flex items-center gap-2 px-2 py-2 sm:px-3 sm:py-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <div class="w-7 h-7 rounded-lg bg-[#E3F2FD] flex items-center justify-center shrink-0">
            <Mail class="w-3.5 h-3.5 text-[#1565C0]" aria-hidden="true" />
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
            <Phone class="w-3.5 h-3.5 text-[#6A1B9A]" aria-hidden="true" />
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
            <UserIcon class="w-3.5 h-3.5 text-[#0D5C29]" aria-hidden="true" />
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
                  <Lock class="w-2.5 h-2.5 text-slate-300" aria-hidden="true" />
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
                  <Lock class="w-2.5 h-2.5 text-slate-300" aria-hidden="true" />
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
            <SquarePen class="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-700 leading-tight">Edit Profile</p>
            <p class="text-[10px] text-slate-400 mt-0.5 leading-tight">Update your info</p>
          </div>
        </button>
        <button class="flex items-center gap-2.5 px-3 py-3 sm:py-4 rounded-xl border border-slate-100 bg-white text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 bg-[#4A7C59]">
            <KeyRound class="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-700 leading-tight">Change Password</p>
            <p class="text-[10px] text-slate-400 mt-0.5 leading-tight">Update your password</p>
          </div>
        </button>
        <a href="/help" class="flex items-center gap-2.5 px-3 py-3 sm:py-4 rounded-xl border border-slate-100 bg-white no-underline transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 bg-[#1565C0]">
            <LifeBuoy class="w-5 h-5 text-white" aria-hidden="true" />
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