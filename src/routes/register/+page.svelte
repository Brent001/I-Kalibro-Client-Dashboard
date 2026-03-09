<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';

  let formData = {
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    age: '',
    enrollmentNo: '',
    course: '',
    year: '',
    department: '',
    facultyNumber: '',
    gender: '',
    otp: ''
  };

  let errors: Record<string, string> = {};
  let currentStep = 1;
  let isSubmitting = false;
  let submitError = '';
  let submitSuccess = '';
  let agreedToTerms = false;
  const totalSteps = 3;

  const departments = [
    'Computer Science', 'Information Technology', 'Business',
    'Engineering', 'Medicine', 'Education', 'Arts & Sciences',
    'Library Services', 'Administration'
  ];

  let otpSent = false;
  let otpSuccessMsg = '';
  let otpErrorMsg = '';
  let otpResendTimer = 0;
  let otpResendInterval: ReturnType<typeof setInterval> | null = null;
  let otpVerified = false;
  let otpEmailUsed = '';

  onDestroy(() => { if (otpResendInterval) clearInterval(otpResendInterval); });

  function resetOtpState() {
    otpSent = false;
    otpVerified = false;
    otpSuccessMsg = '';
    otpErrorMsg = '';
    otpResendTimer = 0;
    otpEmailUsed = '';
    formData.otp = '';
    if (otpResendInterval) clearInterval(otpResendInterval);
    delete errors['otp'];
    errors = { ...errors };
  }

  function handleEmailInput() {
    clearError('email');
    if (otpEmailUsed && formData.email !== otpEmailUsed) {
      resetOtpState();
    }
  }

  function validateStep(step: number): boolean {
    const stepErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) stepErrors.name = 'Full name is required';
      if (!formData.email.trim()) {
        stepErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        stepErrors.email = 'Please enter a valid email address';
      }
      if (!formData.phone.trim()) {
        stepErrors.phone = 'Phone number is required';
      } else if (!/^[\d\-\+\(\)\s]+$/.test(formData.phone)) {
        stepErrors.phone = 'Please enter a valid phone number';
      }
      if (formData.age && (parseInt(formData.age) < 16 || parseInt(formData.age) > 100)) {
        stepErrors.age = 'Age must be between 16 and 100';
      }
    }

    if (step === 2) {
      if (!formData.username.trim()) {
        stepErrors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        stepErrors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        stepErrors.username = 'Username can only contain letters, numbers, and underscores';
      }
      if (!formData.password) {
        stepErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        stepErrors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        stepErrors.password = 'Password must contain uppercase, lowercase, and a number';
      }
      if (!formData.confirmPassword) {
        stepErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        stepErrors.confirmPassword = 'Passwords do not match';
      }
      if (!otpVerified) {
        stepErrors.otp = 'Please verify your email address before continuing';
      }
    }

    if (step === 3) {
      if (formData.role === 'student') {
        if (!formData.enrollmentNo.trim()) stepErrors.enrollmentNo = 'Enrollment number is required';
        if (!formData.course) stepErrors.course = 'Course is required';
        if (!formData.year) stepErrors.year = 'Year level is required';
      } else {
        if (!formData.department) stepErrors.department = 'Department is required';
      }
      if (!agreedToTerms) {
        stepErrors.terms = 'You must agree to the Terms of Service and Privacy Policy';
      }
    }

    errors = { ...errors, ...stepErrors };
    return Object.keys(stepErrors).length === 0;
  }

  function nextStep() {
    clearStepErrors(currentStep);
    if (validateStep(currentStep)) {
      currentStep = Math.min(currentStep + 1, totalSteps);
      showCourseDropdown = false;
      showYearDropdown = false;
      showGenderDropdown = false;
    }
  }

  function prevStep() {
    showCourseDropdown = false;
    showYearDropdown = false;
    showGenderDropdown = false;
    currentStep = Math.max(currentStep - 1, 1);
  }

  function clearStepErrors(step: number) {
    const stepFields = getStepFields(step);
    stepFields.forEach(field => { delete errors[field]; });
    errors = { ...errors };
  }

  function getStepFields(step: number): string[] {
    if (step === 1) return ['name', 'email', 'phone', 'age'];
    if (step === 2) return ['username', 'password', 'confirmPassword', 'otp'];
    if (step === 3) return ['enrollmentNo', 'course', 'year', 'department', 'terms'];
    return [];
  }

  function clearError(field: string) {
    delete errors[field];
    errors = { ...errors };
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    clearStepErrors(3);
    if (!validateStep(3)) return;
    isSubmitting = true;
    submitError = '';
    submitSuccess = '';
    try {
      const payload: Record<string, any> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        username: formData.username,
        password: formData.password,
        role: formData.role,
        age: formData.age || null,
        enrollmentNo: formData.role === 'student' ? formData.enrollmentNo : null,
        course: formData.role === 'student' ? formData.course : null,
        year: formData.role === 'student' ? formData.year : null,
        department: formData.role === 'faculty' ? formData.department : null,
        facultyNumber: formData.role === 'faculty' ? formData.facultyNumber || null : null,
        gender: formData.gender || null
      };
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        submitSuccess = data.message || 'Account created successfully!';
        setTimeout(() => { goto('/'); }, 2000);
      } else {
        submitError = data.message || 'Failed to create account';
      }
    } catch (err) {
      submitError = 'Network error. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }

  function startOtpResendTimer() {
    otpResendTimer = 60;
    if (otpResendInterval) clearInterval(otpResendInterval);
    otpResendInterval = setInterval(() => {
      otpResendTimer--;
      if (otpResendTimer <= 0 && otpResendInterval) clearInterval(otpResendInterval);
    }, 1000);
  }

  async function handleSendOtp() {
    otpErrorMsg = '';
    otpSuccessMsg = '';
    if (!formData.email || errors.email) {
      otpErrorMsg = 'Enter a valid email first.';
      return;
    }
    otpVerified = false;
    formData.otp = '';
    delete errors['otp'];
    errors = { ...errors };

    try {
      const res = await fetch('/api/register/send_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      if (data.success) {
        otpSent = true;
        otpEmailUsed = formData.email;
        otpSuccessMsg = `OTP sent to ${data.maskedEmail || formData.email}`;
        startOtpResendTimer();
      } else {
        otpErrorMsg = data.message || 'Failed to send OTP';
      }
    } catch (err) {
      otpErrorMsg = 'Network error. Please try again.';
    }
  }

  async function handleVerifyOtp() {
    otpErrorMsg = '';
    otpSuccessMsg = '';
    if (!formData.otp || formData.otp.length !== 6) {
      otpErrorMsg = 'Please enter a valid 6-digit OTP.';
      return;
    }
    try {
      const res = await fetch('/api/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: formData.otp })
      });
      const data = await res.json();
      if (data.success) {
        otpSuccessMsg = 'OTP verified successfully!';
        otpVerified = true;
        delete errors['otp'];
        errors = { ...errors };
      } else {
        otpErrorMsg = data.message || 'Invalid OTP. Please try again.';
        otpVerified = false;
      }
    } catch (err) {
      otpErrorMsg = 'Network error. Please try again.';
      otpVerified = false;
    }
  }

  let showCourseDropdown = false;
  let showYearDropdown = false;
  let showGenderDropdown = false;

  function handleWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-dropdown="course"]')) showCourseDropdown = false;
    if (!target.closest('[data-dropdown="year"]')) showYearDropdown = false;
    if (!target.closest('[data-dropdown="gender"]')) showGenderDropdown = false;
  }

  let courseOptions = [
    { value: "BSBA-MM", label: "BSBA - Marketing Management" },
    { value: "BSBA-FM", label: "BSBA - Financial Management" },
    { value: "BSCS", label: "BS Computer Science" },
    { value: "BSCrim", label: "BS Criminology" },
    { value: "BPEd", label: "Bachelor of Physical Education" },
    { value: "BSEd-Filipino", label: "BSEd - Filipino" },
    { value: "BSEd-English", label: "BSEd - English" },
    { value: "BSEd-Math", label: "BSEd - Mathematics" },
    { value: "BSEd-Science", label: "BSEd - Science and Technology" },
    { value: "BSEd-TLE-IA", label: "BSEd-TLE - Industrial Arts" },
    { value: "BSEd-TLE-HE", label: "BSEd-TLE - Home Economics" },
    { value: "BEEd", label: "Bachelor of Elementary Education" },
    { value: "BSTrM", label: "BS Tourism Management" }
  ];

  let yearOptions = [
    { value: "1st Year", label: "1st Year" },
    { value: "2nd Year", label: "2nd Year" },
    { value: "3rd Year", label: "3rd Year" },
    { value: "4th Year", label: "4th Year" }
  ];

  let genderOptions = [
    { value: "", label: "Select gender" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
    { value: "Prefer not to say", label: "Prefer not to say" }
  ];

  function selectCourse(option: { value: string; label: string }) {
    formData.course = option.value;
    showCourseDropdown = false;
    clearError('course');
  }

  function getCourseLabel(value: string) {
    const found = courseOptions.find(opt => opt.value === value);
    return found ? truncateLabel(found.label) : "Select Course";
  }

  function selectYear(option: { value: string; label: string }) {
    formData.year = option.value;
    showYearDropdown = false;
    clearError('year');
  }

  function getYearLabel(value: string) {
    const found = yearOptions.find(opt => opt.value === value);
    return found ? found.label : "Select Year Level";
  }

  function selectGender(option: { value: string; label: string }) {
    formData.gender = option.value;
    showGenderDropdown = false;
    clearError('gender');
  }

  function getGenderLabel(value: string) {
    const found = genderOptions.find(opt => opt.value === value);
    return found ? found.label : "Select gender";
  }

  function truncateLabel(label: string, max = 30) {
    return label.length > max ? label.slice(0, max - 3) + "..." : label;
  }

  $: progressPercentage = (currentStep / totalSteps) * 100;
  $: passwordStrength = getPasswordStrength(formData.password);

  function getPasswordStrength(password: string) {
    if (!password) return { label: '', score: 0 };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { label: 'Weak', score: 1 };
    if (score === 3) return { label: 'Medium', score: 2 };
    return { label: 'Strong', score: 3 };
  }

  let showPassword = false;
  let showConfirmPassword = false;

  const stepLabels = ['Basic Info', 'Account', 'Academic'];
</script>

<svelte:head>
  <title>Register | e-Kalibro Client Portal</title>
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

<svelte:window on:click={handleWindowClick} />

<!--
  FIX: Two changes from the original:
  1. Added `relative` so the absolutely-positioned .login-background anchors to this container.
  2. Removed `bg-gradient-to-br from-[#FFF9E6] via-white to-slate-50` which was covering the background image.
-->
<div class="relative min-h-screen flex">
  <div class="login-background"></div>

  <!-- Left Panel - Branding -->
  <div class="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-[#0D5C29] to-[#0a4620] text-white flex-col justify-center p-12 relative overflow-hidden lg:sticky lg:top-0 lg:h-screen">
    <div class="absolute top-0 right-0 w-64 h-64 bg-[#E8B923] opacity-5 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
    <div class="absolute bottom-0 left-0 w-48 h-48 bg-[#E8B923] opacity-5 rounded-full blur-3xl transform -translate-x-24 translate-y-24"></div>

    <div class="max-w-lg relative z-10">
      <div class="mb-10">
        <div class="flex flex-col items-center mb-6">
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
          <div class="bg-[#E8B923] p-3 rounded-full">
            <svg class="h-6 w-6 text-[#0D5C29]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div class="text-left">
            <h3 class="font-semibold">Guided 3-Step Registration</h3>
            <p class="text-sm text-slate-300">Simple process for both students and faculty</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="bg-[#E8B923] p-3 rounded-full">
            <svg class="h-6 w-6 text-[#0D5C29]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <div class="text-left">
            <h3 class="font-semibold">Secure & Private</h3>
            <p class="text-sm text-slate-300">Your information is kept secure and private.</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="bg-[#E8B923] p-3 rounded-full">
            <svg class="h-6 w-6 text-[#0D5C29]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="text-left">
            <h3 class="font-semibold">Need Help?</h3>
            <p class="text-sm text-slate-300">Contact <strong>library@school.edu</strong> or call (02) 8XXX-XXXX</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Right Panel - Form -->
  <div class="flex-1 flex items-start justify-center pl-4 lg:pl-8 pr-6 lg:pr-12 pt-6 lg:pt-12 pb-6 lg:pb-12 overflow-y-auto">
    <div class="w-full max-w-2xl py-4">

      <!-- Mobile Header -->
      <div class="lg:hidden text-center mb-8">
        <div class="flex flex-col items-center justify-center mb-3">
          <img src="/assets/logo.png" alt="e-Kalibro Logo" class="h-16 w-16 object-contain mb-2" />
          <h1 class="text-2xl font-bold text-[#0D5C29]">e-Kalibro Portal</h1>
        </div>
        <p class="text-slate-800 text-sm font-semibold">Library Management System</p>
        <p class="text-slate-700 text-xs mt-1 font-medium">Metro-Dagupan Colleges, Inc.</p>
      </div>

      <div class="mb-8">
        <h2 class="text-3xl font-bold text-[#0D5C29] mb-2">Create Account</h2>
        <p class="text-slate-900 font-semibold">Fill in your details to get started</p>
      </div>

      <!-- Step Indicator -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-3">
          {#each stepLabels as label, i}
            <div class="flex items-center {i < stepLabels.length - 1 ? 'flex-1' : ''}">
              <div class="flex flex-col items-center">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                  {currentStep > i + 1
                    ? 'bg-[#0D5C29] border-[#0D5C29] text-white'
                    : currentStep === i + 1
                      ? 'bg-[#0D5C29] border-[#0D5C29] text-white shadow-lg shadow-[#0D5C29]/30'
                      : 'bg-white border-slate-400 text-slate-700'}">
                  {#if currentStep > i + 1}
                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  {:else}
                    {i + 1}
                  {/if}
                </div>
                <span class="text-xs mt-1.5 font-semibold hidden sm:block
                  {currentStep === i + 1 ? 'text-[#0D5C29]' : currentStep > i + 1 ? 'text-[#0D5C29]' : 'text-slate-700'}">
                  {label}
                </span>
              </div>
              {#if i < stepLabels.length - 1}
                <div class="flex-1 h-0.5 mx-2 mb-4 sm:mb-0 transition-all
                  {currentStep > i + 1 ? 'bg-[#0D5C29]' : 'bg-slate-200'}"></div>
              {/if}
            </div>
          {/each}
        </div>
        <div class="w-full bg-slate-200 rounded-full h-1.5 mt-2">
          <div class="bg-gradient-to-r from-[#0D5C29] to-[#16a34a] h-1.5 rounded-full transition-all duration-500 ease-out" style="width: {progressPercentage}%"></div>
        </div>
      </div>

      <!-- Form Card -->
      <form on:submit={handleSubmit} class="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div class="p-6 sm:p-8">

          <!-- STEP 1 -->
          {#if currentStep === 1}
            <div class="space-y-5">
              <div class="mb-6">
                <h3 class="text-lg font-bold text-slate-800 mb-1">Basic Information</h3>
                <p class="text-sm text-slate-600 font-medium">Let's start with your personal details</p>
              </div>

              <div>
                <label for="name" class="block text-sm font-semibold text-slate-700 mb-2">Full Name <span class="text-red-500">*</span></label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  </div>
                  <input id="name" type="text" bind:value={formData.name} on:input={() => clearError('name')}
                    class="w-full pl-10 pr-3.5 py-3 border-2 {errors.name ? 'border-red-400' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm"
                    placeholder="Enter your full name" />
                </div>
                {#if errors.name}<p class="mt-1.5 text-xs text-red-600">{errors.name}</p>{/if}
              </div>

              <div>
                <label for="email" class="block text-sm font-semibold text-slate-700 mb-2">Email Address <span class="text-red-500">*</span></label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </div>
                  <input id="email" type="email" bind:value={formData.email} on:input={handleEmailInput}
                    class="w-full pl-10 pr-3.5 py-3 border-2 {errors.email ? 'border-red-400' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm"
                    placeholder="your.email@example.com" />
                </div>
                {#if errors.email}
                  <p class="mt-1.5 text-xs text-red-600">{errors.email}</p>
                {:else}
                  <p class="mt-1.5 text-xs text-slate-600 font-medium">You'll verify this email with an OTP in the next step.</p>
                {/if}
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label for="phone" class="block text-sm font-semibold text-slate-700 mb-2">Phone Number <span class="text-red-500">*</span></label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    </div>
                    <input id="phone" type="tel" bind:value={formData.phone} on:input={() => clearError('phone')}
                      class="w-full pl-10 pr-3.5 py-3 border-2 {errors.phone ? 'border-red-400' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm"
                      placeholder="+63 9XX XXX XXXX" />
                  </div>
                  {#if errors.phone}<p class="mt-1.5 text-xs text-red-600">{errors.phone}</p>{/if}
                </div>
                <div>
                  <label for="age" class="block text-sm font-semibold text-slate-700 mb-2">Age <span class="text-slate-600 font-normal">(Optional)</span></label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                    <input id="age" type="number" min="16" max="100" bind:value={formData.age} on:input={() => clearError('age')}
                      class="w-full pl-10 pr-3.5 py-3 border-2 {errors.age ? 'border-red-400' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm"
                      placeholder="25" />
                  </div>
                  {#if errors.age}<p class="mt-1.5 text-xs text-red-600">{errors.age}</p>{/if}
                </div>
              </div>

              <div>
                <label id="gender-label" class="block text-sm font-semibold text-slate-700 mb-2">Gender <span class="text-slate-600 font-normal">(Optional)</span></label>
                <div class="relative" data-dropdown="gender">
                  <button type="button" aria-labelledby="gender-label" aria-haspopup="listbox" aria-expanded={showGenderDropdown}
                    class="w-full px-3.5 py-3 border-2 {errors.gender ? 'border-red-400' : 'border-slate-200'} rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all shadow-sm flex items-center justify-between"
                    on:click|stopPropagation={() => { showGenderDropdown = !showGenderDropdown; showCourseDropdown = false; showYearDropdown = false; }}>
                    <span class="{formData.gender ? 'text-slate-800' : 'text-slate-400'} text-sm">{getGenderLabel(formData.gender)}</span>
                    <svg class="h-4 w-4 text-slate-400 transition-transform {showGenderDropdown ? 'rotate-180' : ''}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  {#if showGenderDropdown}
                    <ul class="absolute z-20 mt-1 w-full bg-white border-2 border-slate-200 rounded-lg shadow-lg overflow-auto max-h-48" role="listbox" aria-labelledby="gender-label">
                      {#each genderOptions as option}
                        <li class="px-4 py-2.5 cursor-pointer text-sm hover:bg-[#0D5C29]/5 {formData.gender === option.value ? 'bg-[#0D5C29]/10 text-[#0D5C29] font-semibold' : 'text-slate-700'}"
                          tabindex="0" on:click={() => selectGender(option)}
                          on:keydown={(ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectGender(option); } }}
                          role="option" aria-selected={formData.gender === option.value}>{option.label}</li>
                      {/each}
                    </ul>
                  {/if}
                </div>
              </div>
            </div>
          {/if}

          <!-- STEP 2 -->
          {#if currentStep === 2}
            <div class="space-y-5">
              <div class="mb-6">
                <h3 class="text-lg font-bold text-slate-800 mb-1">Account Information</h3>
                <p class="text-sm text-slate-600 font-medium">Set up your login credentials</p>
              </div>

              <div>
                <label id="role-label" class="block text-sm font-semibold text-slate-700 mb-3">I am a <span class="text-red-500">*</span></label>
                <div class="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="role-label">
                  <label class="relative flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all {formData.role === 'student' ? 'border-[#0D5C29] bg-[#0D5C29]/5 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}">
                    <input type="radio" bind:group={formData.role} value="student" class="sr-only" />
                    <div class="text-center">
                      <svg class="h-8 w-8 mx-auto mb-2 {formData.role === 'student' ? 'text-[#0D5C29]' : 'text-slate-400'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                      </svg>
                      <span class="text-sm font-semibold {formData.role === 'student' ? 'text-[#0D5C29]' : 'text-slate-700'}">Student</span>
                    </div>
                  </label>
                  <label class="relative flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all {formData.role === 'faculty' ? 'border-[#0D5C29] bg-[#0D5C29]/5 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}">
                    <input type="radio" bind:group={formData.role} value="faculty" class="sr-only" />
                    <div class="text-center">
                      <svg class="h-8 w-8 mx-auto mb-2 {formData.role === 'faculty' ? 'text-[#0D5C29]' : 'text-slate-400'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                      </svg>
                      <span class="text-sm font-semibold {formData.role === 'faculty' ? 'text-[#0D5C29]' : 'text-slate-700'}">Faculty</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label for="username" class="block text-sm font-semibold text-slate-700 mb-2">Username <span class="text-red-500">*</span></label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  </div>
                  <input id="username" type="text" bind:value={formData.username} on:input={() => clearError('username')}
                    class="w-full pl-10 pr-3.5 py-3 border-2 {errors.username ? 'border-red-400' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm"
                    placeholder="Choose a unique username" />
                </div>
                {#if errors.username}
                  <p class="mt-1.5 text-xs text-red-600">{errors.username}</p>
                {:else}
                  <p class="mt-1.5 text-xs text-slate-600 font-medium">At least 3 characters — letters, numbers, underscores only</p>
                {/if}
              </div>

              <div>
                <label for="password" class="block text-sm font-semibold text-slate-700 mb-2">Password <span class="text-red-500">*</span></label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                  <input id="password" type={showPassword ? "text" : "password"} bind:value={formData.password} on:input={() => clearError('password')}
                    class="w-full pl-10 pr-11 py-3 border-2 {errors.password ? 'border-red-400' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm"
                    placeholder="Create a strong password" />
                  <button type="button" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#0D5C29] transition-colors" on:click={() => showPassword = !showPassword}>
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
                {#if passwordStrength.label}
                  <div class="mt-2 flex items-center gap-2">
                    <div class="flex gap-1">
                      {#each [1,2,3] as bar}
                        <div class="h-1.5 w-8 rounded-full transition-all {passwordStrength.score >= bar ? passwordStrength.score === 1 ? 'bg-red-500' : passwordStrength.score === 2 ? 'bg-amber-500' : 'bg-[#0D5C29]' : 'bg-slate-200'}"></div>
                      {/each}
                    </div>
                    <span class="text-xs font-medium {passwordStrength.score === 1 ? 'text-red-600' : passwordStrength.score === 2 ? 'text-amber-600' : 'text-[#0D5C29]'}">{passwordStrength.label}</span>
                  </div>
                {/if}
                {#if errors.password}<p class="mt-1.5 text-xs text-red-600">{errors.password}</p>{/if}
              </div>

              <div>
                <label for="confirmPassword" class="block text-sm font-semibold text-slate-700 mb-2">Confirm Password <span class="text-red-500">*</span></label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} bind:value={formData.confirmPassword} on:input={() => clearError('confirmPassword')}
                    class="w-full pl-10 pr-11 py-3 border-2 {errors.confirmPassword ? 'border-red-400' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm"
                    placeholder="Confirm your password" />
                  <button type="button" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#0D5C29] transition-colors" on:click={() => showConfirmPassword = !showConfirmPassword}>
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
                {#if errors.confirmPassword}<p class="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>{/if}
              </div>

              <!-- OTP Section -->
              <div>
                <label for="otp" class="block text-sm font-semibold text-slate-700 mb-2">Email Verification (OTP) <span class="text-red-500">*</span></label>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input id="otp" type="text" maxlength="6" inputmode="numeric" pattern="[0-9]*"
                    bind:value={formData.otp} disabled={!otpSent}
                    on:input={(e: Event) => {
                      const t = e.target as HTMLInputElement | null;
                      const val = (t?.value ?? '').replace(/\D/g, '').slice(0, 6);
                      formData.otp = val;
                      clearError('otp');
                      otpErrorMsg = '';
                      otpSuccessMsg = '';
                    }}
                    class="flex-1 py-3 px-3.5 border-2 {errors.otp ? 'border-red-400' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all text-center text-lg tracking-[0.4em] font-mono placeholder-slate-400 shadow-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
                    placeholder="——————" autocomplete="one-time-code" />
                  <button type="button" on:click={handleSendOtp} disabled={!formData.email || !!errors.email || otpResendTimer > 0}
                    class="px-4 py-3 rounded-lg text-sm font-semibold border-2 transition-all whitespace-nowrap {otpResendTimer > 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-[#E8B923]/10 text-[#8a6c00] border-[#E8B923]/40 hover:bg-[#E8B923]/20'}">
                    {otpResendTimer > 0 ? `Resend (${otpResendTimer}s)` : otpSent ? 'Resend OTP' : 'Send OTP'}
                  </button>
                  <button type="button" on:click={handleVerifyOtp} disabled={!formData.otp || formData.otp.length !== 6}
                    class="px-4 py-3 rounded-lg text-sm font-semibold border-2 transition-all whitespace-nowrap {(!formData.otp || formData.otp.length !== 6) ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-[#0D5C29]/10 text-[#0D5C29] border-[#0D5C29]/30 hover:bg-[#0D5C29]/20'}">
                    {otpVerified ? '✓ Verified' : 'Verify'}
                  </button>
                </div>
                {#if errors.otp}<p class="mt-1.5 text-xs text-red-600">{errors.otp}</p>{/if}
                {#if otpSuccessMsg}
                  <div class="mt-2 flex items-center text-[#0D5C29] bg-[#0D5C29]/5 border border-[#0D5C29]/20 rounded-lg px-3 py-2 text-sm">
                    <svg class="h-4 w-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {otpSuccessMsg}
                  </div>
                {/if}
                {#if otpErrorMsg}
                  <div class="mt-2 flex items-center text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                    <svg class="h-4 w-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                    {otpErrorMsg}
                  </div>
                {/if}
                {#if !otpSent && !otpErrorMsg}
                  <p class="mt-1.5 text-xs text-slate-600 font-medium">Click <strong>Send OTP</strong> to receive a 6-digit code at your email.</p>
                {:else if otpSent && !otpVerified && !otpErrorMsg && !otpSuccessMsg}
                  <p class="mt-1.5 text-xs text-slate-600 font-medium">Enter the code sent to your email, then click <strong>Verify</strong>.</p>
                {:else if !otpVerified}
                  <p class="mt-1.5 text-xs text-slate-600 font-medium">Check your email for a 6-digit code. OTP required to proceed.</p>
                {/if}
              </div>
            </div>
          {/if}

          <!-- STEP 3 -->
          {#if currentStep === 3}
            <div class="space-y-5">
              <div class="mb-6">
                <h3 class="text-lg font-bold text-slate-800 mb-1">{formData.role === 'student' ? 'Academic Information' : 'Professional Information'}</h3>
                <p class="text-sm text-slate-600 font-medium">{formData.role === 'student' ? 'Tell us about your studies' : 'Tell us about your position'}</p>
              </div>

              {#if formData.role === 'student'}
                <div>
                  <label for="enrollmentNo" class="block text-sm font-semibold text-slate-700 mb-2">Student ID / Enrollment Number <span class="text-red-500">*</span></label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
                    </div>
                    <input id="enrollmentNo" type="text" bind:value={formData.enrollmentNo}
                      on:input={(e: Event) => {
                        const t = e.target as HTMLInputElement | null;
                        let value = (t?.value ?? '').replace(/\D/g, '').slice(0, 10);
                        if (value.length > 4) value = value.slice(0, 4) + '-' + value.slice(4);
                        formData.enrollmentNo = value;
                        clearError('enrollmentNo');
                      }}
                      class="w-full pl-10 pr-3.5 py-3 border-2 {errors.enrollmentNo ? 'border-red-400' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm"
                      placeholder="2024-123456" />
                  </div>
                  {#if errors.enrollmentNo}<p class="mt-1.5 text-xs text-red-600">{errors.enrollmentNo}</p>{/if}
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label id="course-label" class="block text-sm font-semibold text-slate-700 mb-2">Course <span class="text-red-500">*</span></label>
                    <div class="relative" data-dropdown="course">
                      <button type="button" aria-labelledby="course-label" aria-haspopup="listbox" aria-expanded={showCourseDropdown}
                        class="w-full px-3.5 py-3 border-2 {errors.course ? 'border-red-400' : 'border-slate-200'} rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all shadow-sm flex items-center justify-between"
                        on:click|stopPropagation={() => { showCourseDropdown = !showCourseDropdown; showYearDropdown = false; showGenderDropdown = false; }}>
                        <span class="text-sm {formData.course ? 'text-slate-800' : 'text-slate-400'} truncate">{getCourseLabel(formData.course)}</span>
                        <svg class="h-4 w-4 text-slate-400 flex-shrink-0 ml-1 transition-transform {showCourseDropdown ? 'rotate-180' : ''}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {#if showCourseDropdown}
                        <ul class="absolute z-20 mt-1 w-full bg-white border-2 border-slate-200 rounded-lg shadow-lg overflow-auto max-h-52" role="listbox" aria-labelledby="course-label">
                          {#each courseOptions as option}
                            <li class="px-4 py-2.5 cursor-pointer text-sm hover:bg-[#0D5C29]/5 {formData.course === option.value ? 'bg-[#0D5C29]/10 text-[#0D5C29] font-semibold' : 'text-slate-700'} truncate"
                              tabindex="0" on:click={() => selectCourse(option)} title={option.label}
                              on:keydown={(ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectCourse(option); } }}
                              role="option" aria-selected={formData.course === option.value}>{truncateLabel(option.label)}</li>
                          {/each}
                        </ul>
                      {/if}
                    </div>
                    {#if errors.course}<p class="mt-1.5 text-xs text-red-600">{errors.course}</p>{/if}
                  </div>

                  <div>
                    <label id="year-label" class="block text-sm font-semibold text-slate-700 mb-2">Year Level <span class="text-red-500">*</span></label>
                    <div class="relative" data-dropdown="year">
                      <button type="button" aria-labelledby="year-label" aria-haspopup="listbox" aria-expanded={showYearDropdown}
                        class="w-full px-3.5 py-3 border-2 {errors.year ? 'border-red-400' : 'border-slate-200'} rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all shadow-sm flex items-center justify-between"
                        on:click|stopPropagation={() => { showYearDropdown = !showYearDropdown; showCourseDropdown = false; showGenderDropdown = false; }}>
                        <span class="text-sm {formData.year ? 'text-slate-800' : 'text-slate-400'}">{getYearLabel(formData.year)}</span>
                        <svg class="h-4 w-4 text-slate-400 flex-shrink-0 transition-transform {showYearDropdown ? 'rotate-180' : ''}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {#if showYearDropdown}
                        <ul class="absolute z-20 mt-1 w-full bg-white border-2 border-slate-200 rounded-lg shadow-lg overflow-auto max-h-48" role="listbox" aria-labelledby="year-label">
                          {#each yearOptions as option}
                            <li class="px-4 py-2.5 cursor-pointer text-sm hover:bg-[#0D5C29]/5 {formData.year === option.value ? 'bg-[#0D5C29]/10 text-[#0D5C29] font-semibold' : 'text-slate-700'}"
                              tabindex="0" on:click={() => selectYear(option)}
                              on:keydown={(ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectYear(option); } }}
                              role="option" aria-selected={formData.year === option.value}>{option.label}</li>
                          {/each}
                        </ul>
                      {/if}
                    </div>
                    {#if errors.year}<p class="mt-1.5 text-xs text-red-600">{errors.year}</p>{/if}
                  </div>
                </div>

              {:else}
                <div>
                  <label for="department" class="block text-sm font-semibold text-slate-700 mb-2">Department <span class="text-red-500">*</span></label>
                  <select id="department" bind:value={formData.department} on:change={() => clearError('department')}
                    class="w-full px-3.5 py-3 border-2 {errors.department ? 'border-red-400' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all bg-white text-sm text-slate-800 shadow-sm">
                    <option value="">Select your department</option>
                    {#each departments as dept}<option value={dept}>{dept}</option>{/each}
                  </select>
                  {#if errors.department}<p class="mt-1.5 text-xs text-red-600">{errors.department}</p>{/if}
                </div>
                <div>
                  <label for="facultyNumber" class="block text-sm font-semibold text-slate-700 mb-2">Faculty Number <span class="text-slate-600 font-normal">(Optional)</span></label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8"/></svg>
                    </div>
                    <input id="facultyNumber" type="text" bind:value={formData.facultyNumber}
                      class="w-full pl-10 pr-3.5 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D5C29]/20 focus:border-[#0D5C29] transition-all placeholder-slate-400 shadow-sm"
                      placeholder="e.g., 12345" />
                  </div>
                </div>
              {/if}

              <div class="pt-2 space-y-3">
                <div class="bg-[#0D5C29]/5 border border-[#0D5C29]/15 rounded-xl p-4">
                  <div class="flex items-start gap-3">
                    <svg class="h-5 w-5 text-[#0D5C29] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    <div class="text-sm text-[#0D5C29]">
                      <p class="font-semibold mb-1">Privacy & Data Collection Notice</p>
                      <p class="text-xs text-[#0D5C29]/80 leading-relaxed">We collect and process your personal information responsibly. Your data will be used solely for library account management and will not be shared with third parties without your consent.</p>
                    </div>
                  </div>
                </div>

                <div class="bg-slate-50 rounded-xl p-4 border {errors.terms ? 'border-red-300' : 'border-slate-200'}">
                  <label class="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" bind:checked={agreedToTerms} on:change={() => clearError('terms')}
                      class="mt-0.5 h-4 w-4 text-[#0D5C29] focus:ring-[#0D5C29] border-slate-300 rounded cursor-pointer" />
                    <span class="text-sm text-slate-700 leading-relaxed">
                      I agree to the <a href="/terms" target="_blank" class="text-[#0D5C29] hover:underline font-semibold">Terms of Service</a> and <a href="/privacy" target="_blank" class="text-[#0D5C29] hover:underline font-semibold">Privacy Policy</a>. I understand my account will be reviewed by library staff before activation.
                    </span>
                  </label>
                  {#if errors.terms}<p class="mt-2 text-xs text-red-600">{errors.terms}</p>{/if}
                </div>

                <div class="bg-[#FFF9E6] border border-[#E8B923]/30 rounded-xl p-4">
                  <div class="flex items-start gap-3">
                    <svg class="h-5 w-5 text-[#8a6c00] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p class="text-xs text-[#6b5300] leading-relaxed"><strong>Your Rights:</strong> You have the right to access, correct, or request deletion of your data. Contact the library office for assistance.</p>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          {#if submitSuccess}
            <div class="mt-5 flex items-center gap-3 text-[#0D5C29] bg-[#0D5C29]/5 border border-[#0D5C29]/20 rounded-xl p-4">
              <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p class="text-sm font-medium">{submitSuccess}</p>
            </div>
          {/if}
          {#if submitError}
            <div class="mt-5 flex items-center gap-3 text-red-700 bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4">
              <svg class="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              <p class="text-sm">{submitError}</p>
            </div>
          {/if}
        </div>

        <!-- Footer Actions -->
        <div class="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl overflow-hidden">
          <div class="flex items-center justify-between">
            <div>
              {#if currentStep > 1}
                <button type="button" on:click={prevStep} disabled={isSubmitting}
                  class="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50">
                  <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                  Previous
                </button>
              {/if}
            </div>
            <div>
              {#if currentStep < totalSteps}
                <button type="button" on:click={nextStep} disabled={isSubmitting}
                  class="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0D5C29] to-[#0a4620] rounded-lg hover:shadow-lg hover:shadow-[#0D5C29]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue
                  <svg class="h-4 w-4 ml-2" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                </button>
              {:else}
                <button type="submit" disabled={isSubmitting}
                  class="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0D5C29] to-[#0a4620] rounded-lg hover:shadow-lg hover:shadow-[#0D5C29]/25 transition-all disabled:opacity-75">
                  {#if isSubmitting}
                    <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  {:else}
                    <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                    Create Account
                  {/if}
                </button>
              {/if}
            </div>
          </div>
        </div>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-slate-900 font-semibold">
          Already have an account?
          <a href="/" class="ml-1 font-bold text-[#0D5C29] hover:text-[#0a4620] transition-colors">Sign in here</a>
        </p>
        <div class="mt-4 text-xs text-slate-800 font-medium space-y-1">
          <p>Protected by our privacy practices.</p>
          <p>© 2026 Metro-Dagupan Colleges, Inc. Library. All rights reserved.</p>
        </div>
      </div>
    </div>
  </div>
</div>