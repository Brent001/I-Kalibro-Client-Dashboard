<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  
  export let data: { redirect?: string } = {};
  export let dbError = false;

  let showPassword = false;
  let username = '';
  let password = '';
  let errorMsg = '';
  let isSubmitting = false;
  let rememberMe = false;
  const dispatch = createEventDispatcher();

  // Math problem variables
  let num1 = 0;
  let num2 = 0;
  let correctAnswer = 0;
  let captchaAnswer = '';

  // Generate a new math problem
  function generateMathProblem() {
    num1 = Math.floor(Math.random() * 10) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    correctAnswer = num1 + num2;
    captchaAnswer = ''; // Clear previous answer
  }

  // Initialize on component mount
  generateMathProblem();

  onMount(async () => {
      if (data.redirect) {
          await goto(data.redirect);
      }
      
      // Check for remember me token
      const rememberMeToken = localStorage.getItem('rememberMe');
      if (rememberMeToken) {
        try {
          isSubmitting = true;
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rememberMeToken })
          });
          const result = await res.json();
          if (result.success) {
            await goto('/dashboard', { replaceState: true, noScroll: true });
          } else {
            localStorage.removeItem('rememberMe');
          }
        } catch (err) {
          console.error('Remember me login failed:', err);
          localStorage.removeItem('rememberMe');
          generateMathProblem();
        } finally {
          isSubmitting = false;
        }
      }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    
    // Validate math problem first
    if (parseInt(captchaAnswer) !== correctAnswer) {
      errorMsg = 'Incorrect answer to the math problem. Please try again.';
      generateMathProblem(); // Generate new problem on failure
      return;
    }
    
    isSubmitting = true;
    
    if (username && password) {
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, rememberMe })
        });
        const data = await res.json();
        if (data.success) {
          // Store remember me token if checkbox is checked
          if (rememberMe && data.rememberMeToken) {
            localStorage.setItem('rememberMe', data.rememberMeToken);
          }
          // Use optimized redirect: replaceState removes history entry, noScroll skips scroll animation
          await goto('/dashboard', { replaceState: true, noScroll: true });
        } else {
          errorMsg = data.message || 'Login failed';
          generateMathProblem(); // Generate new problem on login failure
        }
      } catch (err) {
        errorMsg = 'Network error. Please try again.';
        generateMathProblem(); // Generate new problem on error
      } finally {
        isSubmitting = false;
      }
    }
  }
</script>

<svelte:head>
  <title>Login | e-Kalibro Client Portal</title>
</svelte:head>

<style>
  .login-background {
    background: url('/assets/login_bg.png') no-repeat center center fixed;
    background-size: cover;
    opacity: 0.4;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
  }
</style>

<div class="login-background"></div>

<div class="min-h-screen flex">
  <!-- Left Panel - Branding & Features -->
  <div class="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-[#0D5C29] to-[#0a4620] text-white flex-col justify-center p-12 relative overflow-hidden">
    <!-- Decorative elements -->
    <div class="absolute top-0 right-0 w-64 h-64 bg-[#E8B923] opacity-5 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
    <div class="absolute bottom-0 left-0 w-48 h-48 bg-[#E8B923] opacity-5 rounded-full blur-3xl transform -translate-x-24 translate-y-24"></div>
    
    <div class="max-w-lg relative z-10">
      <!-- Logo & Brand -->
      <div class="mb-10">
        <div class="flex flex-col items-center mb-5">
          <img src="/assets/logo.png" alt="e-Kalibro Logo" class="h-20 w-20 object-contain mb-3 filter drop-shadow-lg" />
            <div class="text-center">
              <h1 class="text-2xl lg:text-3xl font-bold text-white">e-Kalibro Client Portal</h1>
              <p class="text-slate-100 text-sm mt-2">Library Management System</p>
              <p class="text-slate-200 text-xs mt-1">Metro-Dagupan Colleges, Inc.</p>
            </div>
        </div>
      </div>

      <!-- Features List -->
      <div class="space-y-6">
        <div class="flex items-center space-x-4">
          <div class="bg-[#E8B923] p-3 rounded-full">
            <svg class="h-6 w-6 text-[#0D5C29]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
          <div class="text-left">
            <h3 class="font-semibold">View Borrowed Books</h3>
            <p class="text-sm text-slate-300">See your current and past loans in one place</p>
          </div>
        </div>
        
        <div class="flex items-center space-x-4">
          <div class="bg-[#E8B923] p-3 rounded-full">
            <svg class="h-6 w-6 text-[#0D5C29]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div class="text-left">
            <h3 class="font-semibold">Update Your Profile</h3>
            <p class="text-sm text-slate-300">Keep your contact information up to date</p>
          </div>
        </div>
        
        <div class="flex items-center space-x-4">
          <div class="bg-[#E8B923] p-3 rounded-full">
            <svg class="h-6 w-6 text-[#0D5C29]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <div class="text-left">
            <h3 class="font-semibold">Explore Collection</h3>
            <p class="text-sm text-slate-300">Search and discover new books and resources</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Right Panel - Login Form -->
  <div class="flex-1 flex items-center justify-center p-6 lg:p-12">
    <div class="w-full max-w-lg">
      <!-- Mobile Header -->
      <div class="lg:hidden text-center mb-8">
        <div class="flex flex-col items-center justify-center mb-3">
          <img src="/assets/logo.png" alt="e-Kalibro Logo" class="h-16 w-16 object-contain mb-2" />
          <h1 class="text-2xl font-bold text-[#0D5C29]">e-Kalibro Portal</h1>
        </div>
        <p class="text-slate-500 text-sm">Library Management System</p>
        <p class="text-slate-400 text-xs mt-1">Metro-Dagupan Colleges, Inc.</p>
      </div>

      <!-- Form Header -->
      <div class="mb-8">
        <h2 class="text-3xl font-bold text-[#0D5C29] mb-2">Welcome Back!</h2>
        <p class="text-slate-600">Please enter your details to sign in</p>
      </div>

      <!-- Login Form -->
      <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
        <div class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              bind:value={username}
              class="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#0D5C29] focus:border-[#0D5C29]"
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-slate-700">
              Password
            </label>
            <div class="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                bind:value={password}
                class="block w-full px-3 py-2 pr-10 border border-slate-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#0D5C29] focus:border-[#0D5C29]"
                placeholder="Enter your password"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                on:click={() => showPassword = !showPassword}
                tabindex="-1"
              >
                {#if showPassword}
                  <!-- EyeOff SVG -->
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.94 10.94 0 0112 19c-5 0-9.27-3.11-10.94-7.5a10.97 10.97 0 012.92-4.19M1 1l22 22" />
                    <path d="M9.53 9.53A3.5 3.5 0 0012 15.5a3.5 3.5 0 003.5-3.5c0-.88-.32-1.69-.85-2.32" />
                  </svg>
                {:else}
                  <!-- Eye SVG -->
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                {/if}
              </button>
            </div>
          </div>
        </div>

        <!-- Math CAPTCHA -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2" for="captcha">
            Verify you're human
          </label>
          <div class="flex items-center gap-2.5">
            <div class="flex-1 bg-gradient-to-r from-[#FFF9E6] to-slate-50 border border-slate-200 rounded-md px-3.5 py-3 flex items-center justify-center">
              <span class="text-lg font-bold text-[#0D5C29]">
                {num1} + {num2} = ?
              </span>
            </div>
            <input
              id="captcha"
              type="number"
              required
              bind:value={captchaAnswer}
              class="w-20 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-[#0D5C29] focus:border-[#0D5C29] text-center shadow-sm font-semibold"
            />
            <button
              type="button"
              on:click={generateMathProblem}
              class="p-3 border border-slate-200 rounded-md hover:bg-slate-50 hover:border-[#0D5C29] transition-colors text-slate-600 hover:text-[#0D5C29]"
              title="Generate new problem"
              aria-label="Generate new problem"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>

        {#if errorMsg}
          <div class="text-red-600 text-sm mb-2">{errorMsg}</div>
        {/if}

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              bind:checked={rememberMe}
              class="h-4 w-4 text-[#0D5C29] focus:ring-[#0D5C29] border-slate-300 rounded"
            />
            <label for="remember-me" class="ml-2 block text-sm text-slate-600">
              Remember me for 7 days
            </label>
          </div>
          <div class="text-sm">
            <a href="/forget_password" class="font-medium text-[#0D5C29] hover:text-[#0a4620] transition-colors">
              Forgot password?
            </a>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            class="group relative w-full flex items-center justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-[#0D5C29] to-[#0a4620] hover:bg-gradient-to-r hover:from-[#0D5C29]/90 hover:to-[#0a4620]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0D5C29] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {#if isSubmitting}
              <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            {:else}
              Sign in to Dashboard
            {/if}
          </button>
        </div>
      </form>

      <!-- Sign Up Link -->
      <div class="mt-5 text-center pt-6 border-t border-slate-200">
        <p class="text-slate-600 text-sm">
          Don't have an account? 
          <a href="/register" class="ml-1 font-semibold text-[#0D5C29] hover:text-[#0a4620] transition-colors">
            Create Account
          </a>
        </p>
      </div>

      {#if dbError}
        <div class="bg-red-50 border border-red-500 text-red-700 px-4 py-3 rounded-lg relative mb-4 text-center">
          Unable to connect to the database. Please check your internet connection and try again.
          <button class="ml-2 underline text-[#0D5C29]" on:click={() => location.reload()}>Reconnect</button>
        </div>
      {/if}
    </div>
  </div>
</div>