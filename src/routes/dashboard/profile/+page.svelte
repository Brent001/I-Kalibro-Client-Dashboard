<script lang="ts">
  import Layout from "$lib/components/ui/layout.svelte";
  import { page } from "$app/stores";

  // Use data from server
  $: user = $page.data?.user;
  $: stats = $page.data?.stats;

  // Edit mode state
  let isEditing = false;
  let isSaving = false;
  let successMessage = '';
  let errorMessage = '';

  let editForm = {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    course: user?.course || '',
    year: user?.year || '',
    department: user?.department || '',
    designation: user?.designation || ''
  };

  function startEdit() {
    editForm = {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      course: user?.course || '',
      year: user?.year || '',
      department: user?.department || '',
      designation: user?.designation || ''
    };
    isEditing = true;
    successMessage = '';
    errorMessage = '';
  }

  function cancelEdit() {
    isEditing = false;
    successMessage = '';
    errorMessage = '';
  }

  async function saveProfile() {
    isSaving = true;
    successMessage = '';
    errorMessage = '';

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();

      if (data.success) {
        successMessage = 'Profile updated successfully!';
        isEditing = false;
        // Update the user data
        if (data.user) {
          user = data.user;
        }
        setTimeout(() => {
          successMessage = '';
        }, 3000);
      } else {
        errorMessage = data.message || 'Failed to update profile';
      }
    } catch (error) {
      errorMessage = 'An error occurred while updating profile';
      console.error('Error saving profile:', error);
    } finally {
      isSaving = false;
    }
  }
</script>

<Layout>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Page Header -->
    <div class="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 sm:p-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-white mb-2">My Profile</h1>
          <p class="text-slate-300">Manage your personal information and account settings</p>
        </div>
        <div class="mt-4 sm:mt-0">
          <div class="inline-flex items-center px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-600">
            <div class="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            <span class="text-sm font-medium text-slate-200">Account Active</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    {#if successMessage}
      <div class="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-start">
        <svg class="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="text-sm font-medium">{successMessage}</span>
      </div>
    {/if}

    {#if errorMessage}
      <div class="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start">
        <svg class="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
        </svg>
        <span class="text-sm font-medium">{errorMessage}</span>
      </div>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column - Profile Card & Stats -->
      <div class="space-y-6">
        <!-- Profile Card -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="bg-gradient-to-br from-slate-600 to-slate-700 h-24"></div>
          <div class="px-6 pb-6">
            <div class="flex flex-col items-center -mt-12">
              <div class="w-24 h-24 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center mb-4">
                <svg class="h-14 w-14 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              </div>
              <h2 class="text-xl font-bold text-slate-900 text-center">{user?.name || 'User'}</h2>
              <p class="text-sm text-slate-600 mt-1 text-center">
                {#if user?.role === 'student'}
                  {user?.course || 'Student'}
                  {#if user?.year}
                    <span class="text-slate-400">•</span> {user.year}
                  {/if}
                {:else}
                  {user?.designation || 'Faculty'}
                  {#if user?.department}
                    <span class="text-slate-400">•</span> {user.department}
                  {/if}
                {/if}
              </p>
              <div class="mt-3 px-3 py-1 bg-slate-100 rounded-full">
                <p class="text-xs font-medium text-slate-700">
                  ID: {user?.enrollmentNo || user?.username || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <svg class="h-5 w-5 text-slate-600 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
            </svg>
            Activity Summary
          </h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div class="flex items-center">
                <div class="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center mr-3">
                  <svg class="h-5 w-5 text-slate-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                </div>
                <span class="text-sm font-medium text-slate-700">Books Read</span>
              </div>
              <span class="text-lg font-bold text-slate-900">{stats?.totalBooksRead || 0}</span>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div class="flex items-center">
                <div class="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center mr-3">
                  <svg class="h-5 w-5 text-slate-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/>
                  </svg>
                </div>
                <span class="text-sm font-medium text-slate-700">Library Visits</span>
              </div>
              <span class="text-lg font-bold text-slate-900">{stats?.libraryVisits || 0}</span>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div class="flex items-center">
                <div class="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center mr-3">
                  <svg class="h-5 w-5 text-slate-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span class="text-sm font-medium text-slate-700">Currently Borrowed</span>
              </div>
              <span class="text-lg font-bold text-slate-900">{stats?.currentlyBorrowed || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column - Personal Information -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200">
          <!-- Header -->
          <div class="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">Personal Information</h3>
              <p class="text-sm text-slate-600 mt-1">Update your account details and information</p>
            </div>
            {#if !isEditing}
              <button 
                on:click={startEdit}
                class="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors duration-150 flex items-center space-x-2"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
                </svg>
                <span>Edit Profile</span>
              </button>
            {/if}
          </div>

          <!-- Content -->
          <div class="p-6">
            {#if isEditing}
              <!-- Edit Mode -->
              <form on:submit|preventDefault={saveProfile} class="space-y-6">
                <!-- Basic Information Section -->
                <div>
                  <h4 class="text-sm font-semibold text-slate-900 mb-4 flex items-center">
                    <div class="w-6 h-6 bg-slate-100 rounded flex items-center justify-center mr-2">
                      <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
                      </svg>
                    </div>
                    Basic Information
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {#if user?.role === 'student'}
                      <div class="flex justify-between py-3 border-b border-slate-100">
                        <span class="text-sm font-medium text-slate-600">Enrollment Number</span>
                        <span class="text-sm text-slate-900 font-medium">{user?.enrollmentNo || 'N/A'}</span>
                      </div>
                      <div class="flex justify-between py-3 border-b border-slate-100">
                        <span class="text-sm font-medium text-slate-600">Course</span>
                        <span class="text-sm text-slate-900">{user?.course || 'N/A'}</span>
                      </div>
                      <div class="flex justify-between py-3 border-b border-slate-100">
                        <span class="text-sm font-medium text-slate-600">Year Level</span>
                        <span class="text-sm text-slate-900">{user?.year || 'N/A'}</span>
                      </div>
                      {#if user?.age}
                        <div class="flex justify-between py-3 border-b border-slate-100">
                          <span class="text-sm font-medium text-slate-600">Age</span>
                          <span class="text-sm text-slate-900">{user.age}</span>
                        </div>
                      {/if}
                    {:else}
                      <div class="flex justify-between py-3 border-b border-slate-100">
                        <span class="text-sm font-medium text-slate-600">Department</span>
                        <span class="text-sm text-slate-900">{user?.department || 'N/A'}</span>
                      </div>
                      <div class="flex justify-between py-3 border-b border-slate-100">
                        <span class="text-sm font-medium text-slate-600">Designation</span>
                        <span class="text-sm text-slate-900">{user?.designation || 'N/A'}</span>
                      </div>
                    {/if}
                  </div>
                </div>

                <!-- Account Information -->
                <div>
                  <h4 class="text-sm font-semibold text-slate-900 mb-4 flex items-center">
                    <div class="w-6 h-6 bg-slate-100 rounded flex items-center justify-center mr-2">
                      <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                      </svg>
                    </div>
                    Account Information
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div class="flex justify-between py-3 border-b border-slate-100">
                      <span class="text-sm font-medium text-slate-600">Account Status</span>
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        {user?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div class="flex justify-between py-3 border-b border-slate-100">
                      <span class="text-sm font-medium text-slate-600">Member Since</span>
                      <span class="text-sm text-slate-900">
                        {#if user?.createdAt}
                          {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {:else}
                          N/A
                        {/if}
                      </span>
                    </div>
                    <div class="flex justify-between py-3 border-b border-slate-100">
                      <span class="text-sm font-medium text-slate-600">Last Updated</span>
                      <span class="text-sm text-slate-900">
                        {#if user?.updatedAt}
                          {new Date(user.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {:else}
                          N/A
                        {/if}
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            {:else}
              <!-- View Mode -->
              <div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <!-- Basic Information -->
                  <div>
                    <h4 class="text-sm font-semibold text-slate-900 mb-4 flex items-center">
                      <div class="w-6 h-6 bg-slate-100 rounded flex items-center justify-center mr-2">
                        <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
                        </svg>
                      </div>
                      Basic Information
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {#if user?.role === 'student'}
                        <div class="flex justify-between py-3 border-b border-slate-100">
                          <span class="text-sm font-medium text-slate-600">Enrollment Number</span>
                          <span class="text-sm text-slate-900 font-medium">{user?.enrollmentNo || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between py-3 border-b border-slate-100">
                          <span class="text-sm font-medium text-slate-600">Course</span>
                          <span class="text-sm text-slate-900">{user?.course || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between py-3 border-b border-slate-100">
                          <span class="text-sm font-medium text-slate-600">Year Level</span>
                          <span class="text-sm text-slate-900">{user?.year || 'N/A'}</span>
                        </div>
                        {#if user?.age}
                          <div class="flex justify-between py-3 border-b border-slate-100">
                            <span class="text-sm font-medium text-slate-600">Age</span>
                            <span class="text-sm text-slate-900">{user.age}</span>
                          </div>
                        {/if}
                      {:else}
                        <div class="flex justify-between py-3 border-b border-slate-100">
                          <span class="text-sm font-medium text-slate-600">Department</span>
                          <span class="text-sm text-slate-900">{user?.department || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between py-3 border-b border-slate-100">
                          <span class="text-sm font-medium text-slate-600">Designation</span>
                          <span class="text-sm text-slate-900">{user?.designation || 'N/A'}</span>
                        </div>
                      {/if}
                    </div>
                  </div>

                  <!-- Account Information -->
                  <div>
                    <h4 class="text-sm font-semibold text-slate-900 mb-4 flex items-center">
                      <div class="w-6 h-6 bg-slate-100 rounded flex items-center justify-center mr-2">
                        <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                        </svg>
                      </div>
                      Account Information
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div class="flex justify-between py-3 border-b border-slate-100">
                        <span class="text-sm font-medium text-slate-600">Account Status</span>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                          {user?.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div class="flex justify-between py-3 border-b border-slate-100">
                        <span class="text-sm font-medium text-slate-600">Member Since</span>
                        <span class="text-sm text-slate-900">
                          {#if user?.createdAt}
                            {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          {:else}
                            N/A
                          {/if}
                        </span>
                      </div>
                      <div class="flex justify-between py-3 border-b border-slate-100">
                        <span class="text-sm font-medium text-slate-600">Last Updated</span>
                        <span class="text-sm text-slate-900">
                          {#if user?.updatedAt}
                            {new Date(user.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {:else}
                            N/A
                          {/if}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Additional Info Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <!-- Account Security -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <svg class="h-5 w-5 text-slate-600 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
              </svg>
              Account Security
            </h3>
            <div class="space-y-3">
              <button class="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div class="flex items-center">
                  <svg class="h-5 w-5 text-slate-600 mr-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>
                  </svg>
                  <span class="text-sm font-medium text-slate-700">Change Password</span>
                </div>
                <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Help & Support -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 class="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <svg class="h-5 w-5 text-slate-600 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
              </svg>
              Help & Support
            </h3>
            <div class="space-y-3">
              <a href="/help" class="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div class="flex items-center">
                  <svg class="h-5 w-5 text-slate-600 mr-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 006 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
                  </svg>
                  <span class="text-sm font-medium text-slate-700">User Guide</span>
                </div>
                <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </a>
              <a href="/contact" class="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div class="flex items-center">
                  <svg class="h-5 w-5 text-slate-600 mr-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                  </svg>
                  <span class="text-sm font-medium text-slate-700">Contact Support</span>
                </div>
                <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</Layout>