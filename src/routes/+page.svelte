<script lang="ts">
  let showPassword = false;
  let username = '';
  let password = '';
  let errorMsg = '';

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    if (username && password) {
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = '/dashboard';
        } else {
          errorMsg = data.message || 'Login failed';
        }
      } catch (err) {
        errorMsg = 'Network error. Please try again.';
      }
    }
  }
</script>

<svelte:head>
  <title>Login | i/Kalibro Admin Portal</title>
</svelte:head>

<!-- Notion-Inspired Design -->
<div class="min-h-screen bg-white flex">
  <!-- Left Panel -->
  <div class="hidden lg:flex lg:w-2/5 bg-slate-900 text-white flex-col justify-center p-12">
    <div class="max-w-sm">
      <div class="mb-12">
        <div class="flex items-center mb-6">
          <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3">
            <svg class="h-6 w-6 text-slate-900" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <h1 class="text-2xl font-medium">i/Kalibro</h1>
        </div>
        <h2 class="text-3xl font-medium mb-4 leading-tight">Welcome to the Library Client Portal</h2>
        <p class="text-slate-300 text-lg leading-relaxed">Access your borrowed books, manage your account, and explore the library collection.</p>
      </div>

      <div class="space-y-6">
        <div class="flex items-start space-x-3">
          <div class="w-6 h-6 bg-slate-700 rounded-md flex items-center justify-center mt-1">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-medium mb-1">View Borrowed Books</h3>
            <p class="text-sm text-slate-300">See your current and past loans in one place</p>
          </div>
        </div>
        
        <div class="flex items-start space-x-3">
          <div class="w-6 h-6 bg-slate-700 rounded-md flex items-center justify-center mt-1">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-medium mb-1">Update Your Profile</h3>
            <p class="text-sm text-slate-300">Keep your contact information up to date</p>
          </div>
        </div>
        
        <div class="flex items-start space-x-3">
          <div class="w-6 h-6 bg-slate-700 rounded-md flex items-center justify-center mt-1">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-medium mb-1">Explore Library Collection</h3>
            <p class="text-sm text-slate-300">Search and discover new books and resources</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Right Panel -->
  <div class="flex-1 flex items-center justify-center p-6 lg:p-12">
    <div class="w-full max-w-sm">
      <!-- Mobile Header -->
      <div class="lg:hidden text-center mb-10">
        <div class="flex items-center justify-center mb-4">
          <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center mr-2">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <h1 class="text-xl font-medium text-slate-900">i/Kalibro</h1>
        </div>
        <p class="text-slate-600">Metro Dagupan Colleges</p>
      </div>

      <div class="mb-10">
        <h2 class="text-3xl font-medium text-slate-900 mb-3">Log in</h2>
        <p class="text-slate-600">Welcome back! Please enter your details.</p>
      </div>

      <form class="space-y-5" on:submit|preventDefault={handleSubmit}>
        <div>
          <label class="block text-sm font-medium text-slate-900 mb-2">Username</label>
          <input
            id="username"
            type="text"
            required
            bind:value={username}
            class="w-full px-3 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-base transition-all placeholder-slate-400"
            placeholder="Enter your username"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-900 mb-2">Password</label>
          <div class="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              bind:value={password}
              class="w-full px-3 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-base transition-all placeholder-slate-400 pr-10"
              placeholder="Enter your password"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 transform -translate-y-1/2"
              on:click={() => showPassword = !showPassword}
            >
              <svg class="h-5 w-5 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                {#if showPassword}
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                {:else}
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                {/if}
              </svg>
            </button>
          </div>
        </div>

        {#if errorMsg}
          <div class="text-red-600 text-sm">{errorMsg}</div>
        {/if}

        <div class="flex items-center justify-between">
          <label class="flex items-center text-sm text-slate-600">
            <input type="checkbox" class="rounded border-slate-300 text-slate-900 mr-2" />
            Remember for 30 days
          </label>
          <a href="#" class="text-sm text-slate-600 hover:text-slate-900">Forgot password</a>
        </div>

        <button
          type="submit"
          class="w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-colors font-medium text-base"
        >
          Sign in
        </button>
        <!-- Add Register/Create Account Link -->
        <div class="mt-4 text-center">
          <span class="text-slate-600 text-sm">Don't have an account?</span>
          <a href="/register" class="ml-2 text-slate-900 font-medium hover:underline">Create Account</a>
        </div>
      </form>
    </div>
  </div>
</div>