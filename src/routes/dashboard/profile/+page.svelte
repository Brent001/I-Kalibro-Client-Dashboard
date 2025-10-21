<script lang="ts">
  import Layout from "$lib/components/ui/layout.svelte";
  import { page } from "$app/stores";

  $: user = $page.data?.user;
  $: stats = $page.data?.stats;

  let isEditing = false;
  let isSaving = false;
  let message = '';

  let editForm = {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    // Student fields
    gender: user?.gender || '',
    age: user?.age || '',
    department: user?.department || '',
    course: user?.course || '',
    year: user?.year || '',
    enrollmentNo: user?.enrollmentNo || '',
    // Faculty fields
    facultyNumber: user?.facultyNumber || '',
    designation: user?.designation || ''
  };

  function startEdit() {
    editForm = {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      gender: user?.gender || '',
      age: user?.age || '',
      department: user?.department || '',
      course: user?.course || '',
      year: user?.year || '',
      enrollmentNo: user?.enrollmentNo || '',
      facultyNumber: user?.facultyNumber || '',
      designation: user?.designation || ''
    };
    isEditing = true;
    message = '';
  }

  function cancelEdit() {
    isEditing = false;
    message = '';
  }

  async function saveProfile() {
    isSaving = true;
    message = '';

    // Only send relevant fields based on role
    let payload: Record<string, any> = {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone
    };

    if (user?.role === 'student') {
      payload = {
        ...payload,
        gender: editForm.gender,
        age: editForm.age,
        department: editForm.department,
        course: editForm.course,
        year: editForm.year,
        enrollmentNo: editForm.enrollmentNo
      };
    } else if (user?.role === 'faculty') {
      payload = {
        ...payload,
        gender: editForm.gender,
        age: editForm.age,
        department: editForm.department,
        facultyNumber: editForm.facultyNumber,
        designation: editForm.designation
      };
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        message = 'Profile updated successfully';
        isEditing = false;
        if (data.user) user = { ...user, ...data.user, ...data.extraInfo };
        setTimeout(() => message = '', 3000);
      } else {
        message = data.message || 'Failed to update profile';
      }
    } catch (error) {
      message = 'An error occurred';
      console.error(error);
    } finally {
      isSaving = false;
    }
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

    <!-- Message -->
    {#if message}
      <div class="bg-slate-100 border-l-4 border-slate-700 p-3 rounded text-sm text-slate-800">
        {message}
      </div>
    {/if}

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
        {#if !isEditing}
          <button 
            on:click={startEdit}
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded transition"
          >
            Edit
          </button>
        {/if}
      </div>

      <div class="p-4 sm:p-6">
        {#if isEditing}
          <!-- Edit Form -->
          <form on:submit|preventDefault={saveProfile} class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input 
                  type="text" 
                  bind:value={editForm.name}
                  class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  bind:value={editForm.email}
                  class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input 
                  type="tel" 
                  bind:value={editForm.phone}
                  class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                />
              </div>
              {#if user?.role === 'student'}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <input 
                    type="text" 
                    bind:value={editForm.gender}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input 
                    type="number" 
                    bind:value={editForm.age}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input 
                    type="text" 
                    bind:value={editForm.department}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <input 
                    type="text" 
                    bind:value={editForm.course}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input 
                    type="text" 
                    bind:value={editForm.year}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Enrollment No</label>
                  <input 
                    type="text" 
                    bind:value={editForm.enrollmentNo}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  />
                </div>
              {:else}
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <input 
                    type="text" 
                    bind:value={editForm.gender}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input 
                    type="number" 
                    bind:value={editForm.age}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input 
                    type="text" 
                    bind:value={editForm.department}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Faculty Number</label>
                  <input 
                    type="text" 
                    bind:value={editForm.facultyNumber}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input 
                    type="text" 
                    bind:value={editForm.designation}
                    class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
                  />
                </div>
              {/if}
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button 
                type="button"
                on:click={cancelEdit}
                disabled={isSaving}
                class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                class="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded transition disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        {:else}
          <!-- View Mode -->
          <div class="divide-y divide-gray-100">
            <!-- Contact Info -->
            <div class="py-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Full Name</p>
                <p class="text-sm text-gray-900">{user?.name || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Email</p>
                <p class="text-sm text-gray-900 break-all">{user?.email || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-medium mb-1">Phone</p>
                <p class="text-sm text-gray-900">{user?.phone || 'N/A'}</p>
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
        {/if}
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