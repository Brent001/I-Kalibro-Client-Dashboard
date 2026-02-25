<script lang="ts">
  let showPassword = false;
  let username = '';
  let password = '';
  let captchaAnswer = '';
  let errorMsg = '';
  let isLoading = false;
  
  // Math problem variables
  let num1 = 0;
  let num2 = 0;
  let correctAnswer = 0;

  // Generate a new math problem
  function generateMathProblem() {
    num1 = Math.floor(Math.random() * 10) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    correctAnswer = num1 + num2;
    captchaAnswer = ''; // Clear previous answer
  }

  // Initialize on component mount
  generateMathProblem();

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    
    // Validate math problem first
    if (parseInt(captchaAnswer) !== correctAnswer) {
      errorMsg = 'Incorrect answer to the math problem. Please try again.';
      generateMathProblem(); // Generate new problem on failure
      return;
    }
    
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
          generateMathProblem(); // Generate new problem on login failure
        }
      } catch (err) {
        errorMsg = 'Network error. Please try again.';
        generateMathProblem(); // Generate new problem on error
      } finally {
        isLoading = false;
      }
    }
  }
</script>

<svelte:head>
  <title>Login | e-Kalibro Client Portal</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#FFF9E6] via-white to-slate-50 flex">
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
              <p class="text-slate-200 text-xs mt-1">Metro Dagupan Colleges</p>
            </div>
        </div>
          <h2 class="text-2xl font-semibold mb-2 leading-tight">Welcome to Your Library Portal</h2>
          <p class="text-slate-100 text-sm leading-relaxed">Manage your borrowed books, explore our collection, and track your library activities with ease.</p>
      </div>

      <!-- Features List -->
      <div class="space-y-6">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0 w-10 h-10 bg-[#E8B923]/20 rounded-lg flex items-center justify-center mt-0.5">
            <svg class="h-5 w-5 text-[#E8B923]" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold mb-1">View Borrowed Books</h3>
            <p class="text-slate-200 text-sm">See your current and past loans in one place</p>
          </div>
        </div>
        
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0 w-10 h-10 bg-[#E8B923]/20 rounded-lg flex items-center justify-center mt-0.5">
            <svg class="h-5 w-5 text-[#E8B923]" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold mb-1">Update Your Profile</h3>
            <p class="text-slate-200 text-sm">Keep your contact information up to date</p>
          </div>
        </div>
        
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0 w-10 h-10 bg-[#E8B923]/20 rounded-lg flex items-center justify-center mt-0.5">
            <svg class="h-5 w-5 text-[#E8B923]" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold mb-1">Explore Collection</h3>
            <p class="text-slate-200 text-sm">Search and discover new books and resources</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Right Panel - Login Form -->
  <div class="flex-1 flex items-center justify-center p-6 lg:p-12">
    <div class="w-full max-w-md">
      <!-- Mobile Header -->
      <div class="lg:hidden text-center mb-8">
        <div class="flex flex-col items-center justify-center mb-3">
          <img src="/assets/logo.png" alt="e-Kalibro Logo" class="h-16 w-16 object-contain mb-2" />
          <h1 class="text-2xl font-bold text-[#0D5C29]">e-Kalibro Portal</h1>
        </div>
        <p class="text-slate-500 text-sm">Library Management System</p>
        <p class="text-slate-400 text-xs mt-1">Metro Dagupan Colleges</p>
      </div>

      <!-- Form Header -->
      <div class="mb-8">
        <h2 class="text-3xl font-bold text-[#0D5C29] mb-2">Welcome Back!</h2>
        <p class="text-slate-600">Please enter your details to sign in</p>
      </div>

      <!-- Login Form -->
      <form class="space-y-5" on:submit|preventDefault={handleSubmit}>
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
            class="w-full px-3.5 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm"
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
              class="w-full px-3.5 py-3 pr-11 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm"
              placeholder="Enter your password"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-[#0D5C29] transition-colors"
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

        <!-- Math CAPTCHA -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2" for="captcha">
            Verify you're human
          </label>
          <div class="flex items-center gap-2.5">
            <div class="flex-1 bg-gradient-to-r from-[#FFF9E6] to-slate-50 border-2 border-slate-200 rounded-lg px-3.5 py-3 flex items-center justify-center">
              <span class="text-lg font-bold text-[#0D5C29]">
                {num1} + {num2} = ?
              </span>
            </div>
            <input
              id="captcha"
              type="number"
              required
              bind:value={captchaAnswer}
              class="w-20 px-3.5 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all text-center shadow-sm font-semibold"
            />
            <button
              type="button"
              on:click={generateMathProblem}
              class="p-3 border-2 border-slate-200 rounded-lg hover:bg-slate-50 hover:border-[#0D5C29] transition-all text-slate-600 hover:text-[#0D5C29]"
              title="Generate new problem"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Error Message -->
        {#if errorMsg}
          <div class="text-red-700 bg-red-50 border-l-4 border-red-600 p-4 rounded text-sm flex items-start">
            <svg class="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <span>{errorMsg}</span>
          </div>
        {/if}

        <!-- Remember & Forgot Password -->
        <div class="flex items-center justify-between pt-2">
          <label class="flex items-center text-sm text-slate-600 cursor-pointer group">
            <input type="checkbox" class="rounded border-slate-300 text-[#0D5C29] mr-2 h-4 w-4 cursor-pointer" />
            <span class="group-hover:text-[#0D5C29] transition-colors">Remember for 30 days</span>
          </label>
          <a href="/forget_password" class="text-sm font-medium text-[#0D5C29] hover:text-[#0a4620] transition-colors">
            Forgot password?
          </a>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={isLoading}
          class="w-full bg-gradient-to-r from-[#0D5C29] to-[#0a4620] text-white py-3 rounded-lg hover:shadow-lg transition-all font-semibold flex items-center justify-center disabled:opacity-75 mt-6"
        >
          {#if isLoading}
            <svg class="animate-spin -ml-1 mr-2.5 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          {:else}
            Sign in
          {/if}
        </button>

        <!-- Sign Up Link -->
        <div class="mt-5 text-center pt-6 border-t border-slate-200">
          <p class="text-slate-600 text-sm">
            Don't have an account? 
            <a href="/register" class="ml-1 font-semibold text-[#0D5C29] hover:text-[#0a4620] transition-colors">
              Create Account
            </a>
          </p>
        </div>
      </form>
    </div>
  </div>
</div>