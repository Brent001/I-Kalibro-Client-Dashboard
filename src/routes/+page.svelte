<script lang="ts">
  let showPassword = false;
  let username = '';
  let password = '';
  let errorMsg = '';
  let isLoading = false;

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    isLoading = true;
    
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
      } finally {
        isLoading = false;
      }
    }
  }
</script>

<svelte:head>
  <title>Login | i-Kalibro Client Portal</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
  <!-- Left Panel - Branding & Features -->
  <div class="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-slate-900 to-slate-800 text-white flex-col justify-center p-12">
    <div class="max-w-lg">
      <!-- Logo & Brand -->
      <div class="mb-12">
        <div class="flex items-center mb-6">
          <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-4 shadow-lg">
            <svg class="h-7 w-7 text-slate-900" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <h1 class="text-3xl font-bold">i-Kalibro</h1>
        </div>
        <h2 class="text-4xl font-bold mb-4 leading-tight">Library Client Portal</h2>
        <p class="text-slate-300 text-lg leading-relaxed">Access your borrowed books, manage your account, and explore our collection.</p>
      </div>

      <!-- Features List -->
      <div class="space-y-8">
        <div class="flex items-start space-x-4">
          <div class="flex-shrink-0 w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center mt-1">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-lg mb-1">View Borrowed Books</h3>
            <p class="text-slate-300">See your current and past loans in one place</p>
          </div>
        </div>
        
        <div class="flex items-start space-x-4">
          <div class="flex-shrink-0 w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center mt-1">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-lg mb-1">Update Your Profile</h3>
            <p class="text-slate-300">Keep your contact information up to date</p>
          </div>
        </div>
        
        <div class="flex items-start space-x-4">
          <div class="flex-shrink-0 w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center mt-1">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-lg mb-1">Explore Collection</h3>
            <p class="text-slate-300">Search and discover new books and resources</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Right Panel - Login Form -->
  <div class="flex-1 flex items-center justify-center p-6 lg:p-12">
    <div class="w-full max-w-md">
      <!-- Mobile Header -->
      <div class="lg:hidden text-center mb-10">
        <div class="flex items-center justify-center mb-2">
          <div class="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center mr-3">
            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-slate-900">i-Kalibro</h1>
        </div>
        <p class="text-slate-600">Metro Dagupan Colleges</p>
      </div>

      <!-- Form Header -->
      <div class="mb-10">
        <h2 class="text-3xl font-bold text-slate-900 mb-3">Welcome Back!</h2>
        <p class="text-slate-600">Please enter your details to sign in</p>
      </div>

      <!-- Login Form -->
      <form class="space-y-6" on:submit|preventDefault={handleSubmit}>
        <!-- Username Field -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2" for="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            bind:value={username}
            class="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-base transition-all placeholder-slate-400 shadow-sm"
            placeholder="Enter your username"
          />
        </div>
        
        <!-- Password Field -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2" for="password">
            Password
          </label>
          <div class="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              bind:value={password}
              class="w-full px-4 py-3.5 pr-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-base transition-all placeholder-slate-400 shadow-sm"
              placeholder="Enter your password"
            />
            <button
              type="button"
              class="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
              on:click={() => showPassword = !showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
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

        <!-- Error Message -->
        {#if errorMsg}
          <div class="text-red-600 bg-red-50 p-3 rounded-lg text-sm flex items-start">
            <svg class="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <span>{errorMsg}</span>
          </div>
        {/if}

        <!-- Remember & Forgot Password -->
        <div class="flex items-center justify-between">
          <label class="flex items-center text-sm text-slate-600">
            <input type="checkbox" class="rounded border-slate-300 text-slate-900 mr-2 h-4 w-4" />
            Remember for 30 days
          </label>
          <a href="#" class="text-sm font-medium text-slate-900 hover:text-slate-700 transition-colors">
            Forgot password?
          </a>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={isLoading}
          class="w-full bg-slate-900 text-white py-3.5 rounded-xl hover:bg-slate-800 transition-colors font-semibold text-base flex items-center justify-center shadow-md disabled:opacity-75"
        >
          {#if isLoading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          {:else}
            Sign in
          {/if}
        </button>

        <!-- Sign Up Link -->
        <div class="mt-6 text-center">
          <p class="text-slate-600 text-sm">
            Don't have an account? 
            <a href="/register" class="ml-1 font-semibold text-slate-900 hover:text-slate-700 transition-colors">
              Create Account
            </a>
          </p>
        </div>
      </form>
    </div>
  </div>
</div>