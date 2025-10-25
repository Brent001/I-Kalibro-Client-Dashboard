<script lang="ts">
  import Layout from "$lib/components/ui/layout.svelte";
  import { page } from "$app/stores";

  $: user = $page.data?.user;
  $: stats = $page.data?.stats;

  let showSensitiveInfo = false;

  function maskEmail(email: string): string {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (!domain) return '••••••••';
    const maskedLocal = local.charAt(0) + '••••••' + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
  }

  function maskPhone(phone: string): string {
    if (!phone) return 'N/A';
    return '••••••' + phone.slice(-4);
  }

  function toggleSensitiveInfo() {
    showSensitiveInfo = !showSensitiveInfo;
  }
</script>

<Layout>
  <div class="space-y-4">
    <!-- Welcome Header -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center space-x-3">
      <div class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
        <svg class="h-6 w-6 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-gray-900 text-base truncate">
          {user?.name || 'User'}
        </div>
        <div class="text-xs text-gray-500 truncate">
          {#if user?.role === 'student'}
            {user?.course || 'Student'} {user?.year ? `• ${user.year}` : ''}
          {:else}
            {user?.designation || 'Faculty'} {user?.department ? `• ${user.department}` : ''}
          {/if}
          {#if user?.enrollmentNo}
            &nbsp;|&nbsp;ID: {user.enrollmentNo}
          {/if}
          {#if user?.facultyNumber}
            &nbsp;|&nbsp;Faculty No: {user.facultyNumber}
          {/if}
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-3 gap-1">
      <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div class="text-center">
          <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2">
            <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
          <p class="text-xl sm:text-2xl font-bold text-gray-900">{stats?.totalBooksRead || 0}</p>
          <p class="text-xs text-gray-600">Books Read</p>
        </div>
      </div>
      
      <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div class="text-center">
          <div class="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-2">
            <svg class="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/>
            </svg>
          </div>
          <p class="text-xl sm:text-2xl font-bold text-gray-900">{stats?.libraryVisits || 0}</p>
          <p class="text-xs text-gray-600">Visits</p>
        </div>
      </div>
      
      <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div class="text-center">
          <div class="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-2">
            <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p class="text-xl sm:text-2xl font-bold text-gray-900">{stats?.currentlyBorrowed || 0}</p>
          <p class="text-xs text-gray-600">Borrowed</p>
        </div>
      </div>
    </div>

    <!-- Main Profile Card -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <div class="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
        <h3 class="text-base sm:text-lg font-semibold text-gray-900">Profile Information</h3>
        <button 
          on:click={toggleSensitiveInfo}
          class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition flex items-center gap-1"
          title={showSensitiveInfo ? 'Hide sensitive info' : 'Show sensitive info'}
        >
          {#if showSensitiveInfo}
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
            </svg>
          {:else}
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          {/if}
        </button>
      </div>

      <div class="p-4 sm:p-6">
        <!-- View Mode -->
        <div class="divide-y divide-gray-100">
          <!-- Contact Info (Sensitive - can be hidden) -->
          <div class="py-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-gray-600 font-medium mb-1">Full Name</p>
              <p class="text-sm text-gray-900">{user?.name || 'N/A'}</p>
            </div>
            <div>
              <p class="text-xs text-gray-600 font-medium mb-1 flex items-center gap-1">
                Email
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                  <svg class="h-3 w-3 mr-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                  </svg>
                  Protected
                </span>
              </p>
              <p class="text-sm text-gray-900 break-all font-mono">
                {showSensitiveInfo ? (user?.email || 'N/A') : maskEmail(user?.email)}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-600 font-medium mb-1 flex items-center gap-1">
                Phone
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                  <svg class="h-3 w-3 mr-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                  </svg>
                  Protected
                </span>
              </p>
              <p class="text-sm text-gray-900 font-mono">
                {showSensitiveInfo ? (user?.phone || 'N/A') : maskPhone(user?.phone)}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-600 font-medium mb-1">Status</p>
              <span class="inline-block px-2 py-1 rounded text-xs font-medium {user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                {user?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <!-- Academic/Professional Info -->
          <div class="py-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {#if user?.role === 'student'}
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Enrollment No</p>
                <p class="text-sm text-gray-900">{user?.enrollmentNo || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Course</p>
                <p class="text-sm text-gray-900">{user?.course || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Year</p>
                <p class="text-sm text-gray-900">{user?.year || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Department</p>
                <p class="text-sm text-gray-900">{user?.department || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Gender</p>
                <p class="text-sm text-gray-900">{user?.gender || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Age</p>
                <p class="text-sm text-gray-900">{user?.age || 'N/A'}</p>
              </div>
            {:else if user?.role === 'faculty'}
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Faculty Number</p>
                <p class="text-sm text-gray-900">{user?.facultyNumber || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Designation</p>
                <p class="text-sm text-gray-900">{user?.designation || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Department</p>
                <p class="text-sm text-gray-900">{user?.department || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Gender</p>
                <p class="text-sm text-gray-900">{user?.gender || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Age</p>
                <p class="text-sm text-gray-900">{user?.age || 'N/A'}</p>
              </div>
            {/if}
          </div>

          <!-- Account Details -->
          <div class="py-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-gray-600 font-medium mb-1">Member Since</p>
              <p class="text-sm text-gray-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-600 font-medium mb-1">Last Updated</p>
              <p class="text-sm text-gray-900">
                {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button class="flex items-start space-x-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition text-left">
        <div class="w-2 h-2 bg-slate-500 rounded-full mt-2 flex-shrink-0"></div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900">Change Password</p>
          <p class="text-xs text-gray-500 mt-1">Update your account password</p>
        </div>
      </button>
      
      <a href="/help" class="flex items-start space-x-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition">
        <div class="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900">Help & Support</p>
          <p class="text-xs text-gray-500 mt-1">Get assistance with your account</p>
        </div>
      </a>
    </div>
  </div>
</Layout>