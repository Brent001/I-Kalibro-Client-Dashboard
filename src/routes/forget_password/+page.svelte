<script lang="ts">
  let step = 1;
  let identifier = '';
  let actualEmail = '';
  let useUsername = false;
  let otp = '';
  let newPassword = '';
  let confirmPassword = '';
  let errorMsg = '';
  let successMsg = '';
  let isLoading = false;
  let resendTimer = 0;
  let resendInterval: any = null;

  let num1 = 0;
  let num2 = 0;
  let correctAnswer = 0;
  let captchaAnswer = '';

  let showNewPassword = false;
  let showConfirmPassword = false;

  function generateMathProblem() {
    num1 = Math.floor(Math.random() * 10) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    correctAnswer = num1 + num2;
    captchaAnswer = '';
  }

  generateMathProblem();

  function startResendTimer() {
    resendTimer = 60;
    resendInterval = setInterval(() => {
      resendTimer--;
      if (resendTimer <= 0) clearInterval(resendInterval);
    }, 1000);
  }

  async function handleIdentifierSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    successMsg = '';

    if (parseInt(captchaAnswer) !== correctAnswer) {
      errorMsg = 'Incorrect answer to the math problem. Please try again.';
      generateMathProblem();
      return;
    }

    if (!identifier || identifier.trim().length === 0) {
      errorMsg = 'Please enter your email or username.';
      return;
    }

    isLoading = true;
    try {
      const res = await fetch('/api/forgot_password/send_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() })
      });
      const data = await res.json();
      if (data.success) {
        actualEmail = data.email;
        step = 2;
        startResendTimer();
        successMsg = `OTP has been sent to ${data.maskedEmail}`;
      } else {
        errorMsg = data.message || 'Failed to send OTP.';
        generateMathProblem();
      }
    } catch (err) {
      errorMsg = 'Network error. Please try again.';
      generateMathProblem();
    } finally {
      isLoading = false;
    }
  }

  async function handleOTPSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    successMsg = '';

    if (otp.length !== 6) {
      errorMsg = 'Please enter a valid 6-digit OTP.';
      return;
    }

    isLoading = true;
    try {
      const res = await fetch('/api/forgot_password/verify_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: actualEmail, otp })
      });
      const data = await res.json();
      if (data.success) {
        step = 3;
        successMsg = 'OTP verified. Please set your new password.';
      } else {
        errorMsg = data.message || 'Invalid OTP. Please try again.';
      }
    } catch (err) {
      errorMsg = 'Network error. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  async function handleResendOTP() {
    if (resendTimer > 0) return;
    errorMsg = '';
    successMsg = '';
    isLoading = true;
    try {
      const res = await fetch('/api/forgot_password/send_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: actualEmail })
      });
      const data = await res.json();
      if (data.success) {
        startResendTimer();
        successMsg = 'New OTP has been sent to your email.';
      } else {
        errorMsg = data.message || 'Failed to resend OTP.';
      }
    } catch (err) {
      errorMsg = 'Network error. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  async function handlePasswordSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    successMsg = '';

    if (newPassword.length < 8) {
      errorMsg = 'Password must be at least 8 characters long.';
      return;
    }
    if (newPassword !== confirmPassword) {
      errorMsg = 'Passwords do not match.';
      return;
    }

    isLoading = true;
    try {
      const res = await fetch('/api/forgot_password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: actualEmail, otp, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        successMsg = 'Password reset successful! Redirecting to login...';
        setTimeout(() => { window.location.href = '/'; }, 2000);
      } else {
        errorMsg = data.message || 'Failed to reset password.';
      }
    } catch (err) {
      errorMsg = 'Network error. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  function handleBack() {
    if (step === 2) {
      step = 1;
      otp = '';
      actualEmail = '';
      clearInterval(resendInterval);
      resendTimer = 0;
    } else if (step === 3) {
      step = 2;
      newPassword = '';
      confirmPassword = '';
    }
    errorMsg = '';
    successMsg = '';
  }

  function toggleInputMode() {
    useUsername = !useUsername;
    identifier = '';
    errorMsg = '';
    successMsg = '';
  }
</script>

<svelte:head>
  <title>Forgot Password | e-Kalibro Client Portal</title>
  <style>
    html, body { overflow-x: hidden; max-width: 100%; }
  </style>
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

<!--
  FIX: Two changes from the original:
  1. Added `relative` to the outermost div so .login-background anchors to it correctly.
  2. Removed `bg-gradient-to-br from-[#FFF9E6] via-white to-slate-50` which was covering the background image.
-->
<div class="relative min-h-screen w-screen max-w-full overflow-x-hidden">
  <div class="login-background"></div>
  <div class="flex min-h-screen">

    <!-- Left Panel -->
    <div class="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-[#0D5C29] to-[#0a4620] text-white flex-col justify-center p-12 relative overflow-hidden shrink-0">
      <div class="absolute top-0 right-0 w-48 h-48 bg-[#E8B923] opacity-5 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 left-0 w-40 h-40 bg-[#E8B923] opacity-5 rounded-full blur-3xl"></div>

      <div class="max-w-lg relative z-10">
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

        <div class="space-y-6">
          <div class="flex items-center space-x-4">
            <div class="bg-[#E8B923] p-3 rounded-full shrink-0">
              <svg class="h-6 w-6 text-[#0D5C29]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
              </svg>
            </div>
            <div class="text-left">
              <h3 class="font-semibold">Email or Username</h3>
              <p class="text-sm text-slate-300">Use either to recover your account</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="bg-[#E8B923] p-3 rounded-full shrink-0">
              <svg class="h-6 w-6 text-[#0D5C29]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <div class="text-left">
              <h3 class="font-semibold">OTP Verification</h3>
              <p class="text-sm text-slate-300">Secure 6-digit code sent to your email</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="bg-[#E8B923] p-3 rounded-full shrink-0">
              <svg class="h-6 w-6 text-[#0D5C29]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div class="text-left">
              <h3 class="font-semibold">Quick Recovery</h3>
              <p class="text-sm text-slate-300">Reset your password in just minutes</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel -->
    <div class="flex-1 min-w-0 flex flex-col items-center justify-start lg:justify-center px-5 py-8 sm:px-8 lg:px-12">
      <div class="w-full max-w-md lg:max-w-lg min-w-0">

        <!-- Mobile Header -->
        <div class="lg:hidden text-center mb-6">
          <div class="flex flex-col items-center justify-center mb-3">
            <img src="/assets/logo.png" alt="e-Kalibro Logo" class="h-14 w-14 object-contain mb-2" />
            <h1 class="text-xl font-bold text-[#0D5C29]">e-Kalibro Portal</h1>
          </div>
          <p class="text-slate-800 text-sm font-semibold">Library Management System</p>
          <p class="text-slate-700 text-xs mt-0.5 font-medium">Metro-Dagupan Colleges, Inc.</p>
        </div>

        <!-- Progress Steps -->
        <div class="mb-7">
          <div class="flex items-center justify-center">
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full {step >= 1 ? 'bg-[#0D5C29] text-white' : 'bg-white border-2 border-slate-400 text-slate-700'} flex items-center justify-center text-sm font-semibold shrink-0">
                {#if step > 1}
                  <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                {:else}1{/if}
              </div>
              <span class="ml-1.5 text-xs font-semibold {step >= 1 ? 'text-[#0D5C29]' : 'text-slate-700'} hidden xs:inline sm:inline">Account</span>
            </div>
            <div class="w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 {step >= 2 ? 'bg-[#0D5C29]' : 'bg-slate-200'}"></div>
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full {step >= 2 ? 'bg-[#0D5C29] text-white' : 'bg-white border-2 border-slate-400 text-slate-700'} flex items-center justify-center text-sm font-semibold shrink-0">
                {#if step > 2}
                  <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                {:else}2{/if}
              </div>
              <span class="ml-1.5 text-xs font-semibold {step >= 2 ? 'text-[#0D5C29]' : 'text-slate-700'} hidden xs:inline sm:inline">OTP</span>
            </div>
            <div class="w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 {step >= 3 ? 'bg-[#0D5C29]' : 'bg-slate-200'}"></div>
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full {step >= 3 ? 'bg-[#0D5C29] text-white' : 'bg-white border-2 border-slate-400 text-slate-700'} flex items-center justify-center text-sm font-semibold shrink-0">3</div>
              <span class="ml-1.5 text-xs font-semibold {step >= 3 ? 'text-[#0D5C29]' : 'text-slate-700'} hidden xs:inline sm:inline">Reset</span>
            </div>
          </div>
          <div class="flex items-center justify-center mt-2 sm:hidden">
            <span class="text-xs font-semibold {step === 1 ? 'text-[#0D5C29]' : 'text-slate-800'}">
              {step === 1 ? 'Account' : step === 2 ? 'OTP Verification' : 'Reset Password'}
            </span>
          </div>
        </div>

        <!-- Step 1 -->
        {#if step === 1}
          <div class="mb-6">
            <h2 class="text-2xl sm:text-3xl font-bold text-[#0D5C29] mb-1.5">Forgot Password?</h2>
            <p class="text-slate-900 font-semibold text-sm sm:text-base">Enter your {useUsername ? 'username' : 'email'} to receive a verification code</p>
          </div>

          <form class="space-y-4" on:submit|preventDefault={handleIdentifierSubmit}>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5" for="identifier">
                {useUsername ? 'Username' : 'Email Address'}
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {#if useUsername}
                    <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  {:else}
                    <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  {/if}
                </div>
                <input id="identifier" type={useUsername ? 'text' : 'email'} required bind:value={identifier}
                  class="w-full pl-10 pr-3.5 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm text-sm sm:text-base"
                  placeholder={useUsername ? 'Enter your username' : 'Enter your email address'} />
              </div>
              <button type="button" on:click={toggleInputMode}
                class="mt-2 text-xs sm:text-sm text-[#0D5C29] hover:text-[#0a4620] transition-colors flex items-center font-medium">
                <svg class="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                Use {useUsername ? 'email' : 'username'} instead
              </button>
            </div>

            <!-- Math CAPTCHA -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5" for="captcha">Verify you're human</label>
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-gradient-to-r from-[#FFF9E6] to-slate-50 border-2 border-slate-200 rounded-lg px-3 py-2.5 flex items-center justify-center min-w-0">
                  <span class="text-base font-bold text-[#0D5C29] whitespace-nowrap">{num1} + {num2} = ?</span>
                </div>
                <input id="captcha" type="number" required bind:value={captchaAnswer}
                  class="w-16 px-2 py-2.5 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] text-center shadow-sm font-semibold shrink-0 text-sm" />
                <button type="button" on:click={generateMathProblem}
                  class="p-2.5 border-2 border-slate-200 rounded-lg hover:bg-slate-50 hover:border-[#0D5C29] transition-all text-slate-600 hover:text-[#0D5C29] shrink-0" title="Generate new problem">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </button>
              </div>
            </div>

            {#if errorMsg}
              <div class="text-red-700 bg-red-50 border-l-4 border-red-600 p-3.5 rounded text-sm flex items-start">
                <svg class="h-5 w-5 mr-2.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                <span>{errorMsg}</span>
              </div>
            {/if}

            <div class="bg-[#FFF9E6] border border-[#E8B923]/40 rounded-lg p-3.5 text-xs sm:text-sm text-[#7a5c00] flex items-start">
              <svg class="h-4 w-4 sm:h-5 sm:w-5 mr-2 mt-0.5 flex-shrink-0 text-[#E8B923]" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
              <span><strong>Can't find your email?</strong> You can use your username instead. The OTP will be sent to your registered email address.</span>
            </div>

            <button type="submit" disabled={isLoading}
              class="w-full bg-gradient-to-r from-[#0D5C29] to-[#0a4620] text-white py-3 rounded-lg hover:shadow-lg transition-all font-semibold flex items-center justify-center disabled:opacity-75">
              {#if isLoading}
                <svg class="animate-spin -ml-1 mr-2.5 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending OTP...
              {:else}
                Send OTP
              {/if}
            </button>

            <div class="text-center pt-5 border-t border-slate-200">
              <p class="text-slate-900 font-semibold text-sm">
                Remembered your password?
                <a href="/" class="ml-1 font-semibold text-[#0D5C29] hover:text-[#0a4620] transition-colors">Sign in</a>
              </p>
            </div>
          </form>
        {/if}

        <!-- Step 2 -->
        {#if step === 2}
          <div class="mb-6">
            <button on:click={handleBack} class="flex items-center text-[#0D5C29] hover:text-[#0a4620] mb-4 transition-colors font-medium text-sm">
              <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h2 class="text-2xl sm:text-3xl font-bold text-[#0D5C29] mb-1.5">Verify OTP</h2>
            <p class="text-slate-900 font-semibold text-sm sm:text-base">Enter the 6-digit code sent to your email</p>
          </div>

          <form class="space-y-4" on:submit|preventDefault={handleOTPSubmit}>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5" for="otp">One-Time Password</label>
              <input id="otp" type="text" inputmode="numeric" pattern="[0-9]*" required maxlength="6" bind:value={otp}
                class="w-full px-3.5 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm text-center text-xl sm:text-2xl tracking-widest font-semibold"
                placeholder="000000" />
            </div>

            {#if successMsg}
              <div class="text-green-700 bg-green-50 border-l-4 border-green-600 p-3.5 rounded text-sm flex items-start">
                <svg class="h-5 w-5 mr-2.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                <span>{successMsg}</span>
              </div>
            {/if}

            {#if errorMsg}
              <div class="text-red-700 bg-red-50 border-l-4 border-red-600 p-3.5 rounded text-sm flex items-start">
                <svg class="h-5 w-5 mr-2.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                <span>{errorMsg}</span>
              </div>
            {/if}

            <div class="bg-[#FFF9E6] border border-[#E8B923]/40 rounded-lg p-3.5 text-sm text-[#7a5c00] text-center">
              {#if resendTimer > 0}
                Resend OTP in <span class="font-bold text-[#0D5C29]">{resendTimer}s</span>
              {:else}
                Didn't receive the code?
                <button type="button" on:click={handleResendOTP} disabled={isLoading}
                  class="ml-1 font-semibold text-[#0D5C29] hover:text-[#0a4620] transition-colors disabled:opacity-50">Resend OTP</button>
              {/if}
            </div>

            <button type="submit" disabled={isLoading}
              class="w-full bg-gradient-to-r from-[#0D5C29] to-[#0a4620] text-white py-3 rounded-lg hover:shadow-lg transition-all font-semibold flex items-center justify-center disabled:opacity-75">
              {#if isLoading}
                <svg class="animate-spin -ml-1 mr-2.5 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              {:else}
                Verify OTP
              {/if}
            </button>
          </form>
        {/if}

        <!-- Step 3 -->
        {#if step === 3}
          <div class="mb-6">
            <button on:click={handleBack} class="flex items-center text-[#0D5C29] hover:text-[#0a4620] mb-4 transition-colors font-medium text-sm">
              <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h2 class="text-2xl sm:text-3xl font-bold text-[#0D5C29] mb-1.5">Set New Password</h2>
            <p class="text-slate-900 font-semibold text-sm sm:text-base">Create a strong password for your account</p>
          </div>

          <form class="space-y-4" on:submit|preventDefault={handlePasswordSubmit}>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5" for="newPassword">New Password</label>
              <div class="relative">
                <input id="newPassword" type={showNewPassword ? 'text' : 'password'} required bind:value={newPassword}
                  class="w-full px-3.5 py-3 pr-11 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm text-sm sm:text-base"
                  placeholder="Enter new password" />
                <button type="button" on:click={() => showNewPassword = !showNewPassword}
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-[#0D5C29] transition-colors" aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    {#if showNewPassword}
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                    {:else}
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    {/if}
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5" for="confirmPassword">Confirm Password</label>
              <div class="relative">
                <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required bind:value={confirmPassword}
                  class="w-full px-3.5 py-3 pr-11 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm text-sm sm:text-base"
                  placeholder="Confirm new password" />
                <button type="button" on:click={() => showConfirmPassword = !showConfirmPassword}
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-[#0D5C29] transition-colors" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    {#if showConfirmPassword}
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                    {:else}
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    {/if}
                  </svg>
                </button>
              </div>
            </div>

            <div class="bg-[#FFF9E6] border border-[#E8B923]/40 rounded-lg p-3.5">
              <p class="text-sm font-semibold text-[#0D5C29] mb-2">Password Requirements:</p>
              <ul class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <li class="flex items-center">
                  <svg class="h-3.5 w-3.5 mr-1.5 shrink-0 {newPassword.length >= 8 ? 'text-[#0D5C29]' : 'text-slate-300'}" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  <span class="{newPassword.length >= 8 ? 'text-[#0D5C29] font-medium' : 'text-slate-700 font-medium'}">8+ characters</span>
                </li>
                <li class="flex items-center">
                  <svg class="h-3.5 w-3.5 mr-1.5 shrink-0 {/[A-Z]/.test(newPassword) ? 'text-[#0D5C29]' : 'text-slate-300'}" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  <span class="{/[A-Z]/.test(newPassword) ? 'text-[#0D5C29] font-medium' : 'text-slate-700 font-medium'}">Uppercase</span>
                </li>
                <li class="flex items-center">
                  <svg class="h-3.5 w-3.5 mr-1.5 shrink-0 {/[a-z]/.test(newPassword) ? 'text-[#0D5C29]' : 'text-slate-300'}" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  <span class="{/[a-z]/.test(newPassword) ? 'text-[#0D5C29] font-medium' : 'text-slate-700 font-medium'}">Lowercase</span>
                </li>
                <li class="flex items-center">
                  <svg class="h-3.5 w-3.5 mr-1.5 shrink-0 {/[0-9]/.test(newPassword) ? 'text-[#0D5C29]' : 'text-slate-300'}" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  <span class="{/[0-9]/.test(newPassword) ? 'text-[#0D5C29] font-medium' : 'text-slate-700 font-medium'}">One number</span>
                </li>
              </ul>
            </div>

            {#if successMsg}
              <div class="text-green-700 bg-green-50 border-l-4 border-green-600 p-3.5 rounded text-sm flex items-start">
                <svg class="h-5 w-5 mr-2.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                <span>{successMsg}</span>
              </div>
            {/if}

            {#if errorMsg}
              <div class="text-red-700 bg-red-50 border-l-4 border-red-600 p-3.5 rounded text-sm flex items-start">
                <svg class="h-5 w-5 mr-2.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                <span>{errorMsg}</span>
              </div>
            {/if}

            <button type="submit" disabled={isLoading}
              class="w-full bg-gradient-to-r from-[#0D5C29] to-[#0a4620] text-white py-3 rounded-lg hover:shadow-lg transition-all font-semibold flex items-center justify-center disabled:opacity-75">
              {#if isLoading}
                <svg class="animate-spin -ml-1 mr-2.5 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting Password...
              {:else}
                Reset Password
              {/if}
            </button>

            <div class="text-center pt-5 border-t border-slate-200">
              <p class="text-slate-900 font-semibold text-sm">
                Remembered your password?
                <a href="/" class="ml-1 font-semibold text-[#0D5C29] hover:text-[#0a4620] transition-colors">Sign in</a>
              </p>
            </div>
          </form>
        {/if}

      </div>
    </div>
  </div>
</div>