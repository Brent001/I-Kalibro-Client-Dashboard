<script lang="ts">
  import { goto } from '$app/navigation';

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
    designation: ''
  };

  let errors: Record<string, string> = {};
  let currentStep = 1;
  let isSubmitting = false;
  let submitError = '';
  let submitSuccess = '';
  let agreedToTerms = false;
  const totalSteps = 3;

  const courses = [
    'Computer Science', 'Information Technology', 'Software Engineering',
    'Data Science', 'Cybersecurity', 'Business Administration',
    'Accounting', 'Marketing', 'Psychology', 'Education',
    'Engineering', 'Medicine', 'Nursing', 'Architecture'
  ];

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

  const departments = [
    'Computer Science', 'Information Technology', 'Business',
    'Engineering', 'Medicine', 'Education', 'Arts & Sciences',
    'Library Services', 'Administration'
  ];

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
        stepErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
      
      if (!formData.confirmPassword) {
        stepErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        stepErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (step === 3) {
      if (formData.role === 'student') {
        if (!formData.enrollmentNo.trim()) stepErrors.enrollmentNo = 'Enrollment number is required';
        if (!formData.course) stepErrors.course = 'Course is required';
        if (!formData.year) stepErrors.year = 'Year level is required';
      } else {
        if (!formData.department) stepErrors.department = 'Department is required';
        if (!formData.designation.trim()) stepErrors.designation = 'Designation is required';
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
    }
  }

  function prevStep() {
    currentStep = Math.max(currentStep - 1, 1);
  }

  function clearStepErrors(step: number) {
    const stepFields = getStepFields(step);
    stepFields.forEach(field => {
      delete errors[field];
    });
    errors = { ...errors };
  }

  function getStepFields(step: number): string[] {
    if (step === 1) return ['name', 'email', 'phone', 'age'];
    if (step === 2) return ['username', 'password', 'confirmPassword'];
    if (step === 3) return ['enrollmentNo', 'course', 'year', 'department', 'designation', 'terms'];
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
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
          designation: formData.role === 'faculty' ? formData.designation : null
        })
      });

      const data = await response.json();

      if (data.success) {
        submitSuccess = data.message || 'Account created successfully!';
        setTimeout(() => {
          goto('/');
        }, 2000);
      } else {
        submitError = data.message || 'Failed to create account';
      }
    } catch (err) {
      submitError = 'Network error. Please try again.';
      console.error('Registration error:', err);
    } finally {
      isSubmitting = false;
    }
  }

  // Add for custom dropdown
  let showCourseDropdown = false;
  let showYearDropdown = false;

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

  function selectCourse(option) {
    formData.course = option.value;
    showCourseDropdown = false;
    clearError('course');
  }

  function getCourseLabel(value) {
    const found = courseOptions.find(opt => opt.value === value);
    return found ? truncateLabel(found.label) : "Select Course";
  }

  function selectYear(option) {
    formData.year = option.value;
    showYearDropdown = false;
    clearError('year');
  }

  function getYearLabel(value) {
    const found = yearOptions.find(opt => opt.value === value);
    return found ? found.label : "Select Year Level";
  }

  function truncateLabel(label: string, max = 28) {
    return label.length > max ? label.slice(0, max - 3) + "..." : label;
  }

  $: progressPercentage = (currentStep / totalSteps) * 100;

  // Password strength indicator
  $: passwordStrength = getPasswordStrength(formData.password);

  function getPasswordStrength(password: string) {
    if (!password) return { label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { label: 'Weak', color: 'red' };
    if (score === 3) return { label: 'Medium', color: 'amber' };
    if (score >= 4) return { label: 'Strong', color: 'green' };
    return { label: '', color: '' };
  }

  // Password visibility toggle
  let showPassword = false;
  let showConfirmPassword = false;
</script>

<svelte:head>
  <title>Register | i-Kalibro Admin Portal</title>
</svelte:head>

<div class="min-h-screen bg-white flex">
  <!-- Left Panel (Branding & Info) -->
  <div class="hidden lg:flex lg:w-2/5 bg-slate-900 text-white flex-col justify-center p-12 lg:sticky lg:top-0 lg:h-screen">
    <div class="max-w-sm">
      <div class="mb-12">
        <div class="flex items-center mb-6">
          <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3">
            <svg class="h-6 w-6 text-slate-900" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <h1 class="text-2xl font-medium">i-Kalibro</h1>
        </div>
        <h2 class="text-3xl font-medium mb-4 leading-tight">Create Your Library Account</h2>
        <p class="text-slate-300 text-lg leading-relaxed">Register to borrow books, manage your profile, and access library resources.</p>
      </div>
      <div class="space-y-6">
        <div class="flex items-start space-x-3">
          <div class="w-6 h-6 bg-slate-700 rounded-md flex items-center justify-center mt-1">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-medium mb-1">Multi-Step Registration</h3>
            <p class="text-sm text-slate-300">Easy, guided process for students and faculty</p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <div class="w-6 h-6 bg-slate-700 rounded-md flex items-center justify-center mt-1">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-medium mb-1">Secure & Private</h3>
            <p class="text-sm text-slate-300">Your data is protected under RA 10173</p>
          </div>
        </div>
        <div class="flex items-start space-x-3">
          <div class="w-6 h-6 bg-slate-700 rounded-md flex items-center justify-center mt-1">
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 class="font-medium mb-1">Need Help?</h3>
            <p class="text-sm text-slate-300">Contact <strong>library@school.edu</strong> or call (02) 8XXX-XXXX</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Right Panel (Form) -->
  <div class="flex-1 flex items-center justify-center p-6 lg:p-12">
    <div class="w-full max-w-lg">
      <!-- Mobile Header -->
      <div class="lg:hidden text-center mb-10">
        <div class="flex items-center justify-center mb-4">
          <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center mr-2">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <h1 class="text-xl font-medium text-slate-900">i-Kalibro</h1>
        </div>
        <p class="text-slate-600">Metro Dagupan Colleges</p>
      </div>

      <!-- Progress Bar -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-slate-900">Step {currentStep} of {totalSteps}</span>
          <span class="text-sm text-slate-600">{Math.round(progressPercentage)}% Complete</span>
        </div>
        <div class="w-full bg-slate-200 rounded-full h-2">
          <div class="bg-slate-900 h-2 rounded-full transition-all duration-300 ease-out" style="width: {progressPercentage}%"></div>
        </div>
        <div class="flex justify-between mt-4">
          <div class="flex items-center {currentStep >= 1 ? 'text-slate-900' : 'text-slate-400'}">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 {currentStep >= 1 ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-400'}">
              1
            </div>
            <span class="ml-2 text-sm font-medium hidden sm:block">Basic Info</span>
          </div>
          <div class="flex items-center {currentStep >= 2 ? 'text-slate-900' : 'text-slate-400'}">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 {currentStep >= 2 ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-400'}">
              2
            </div>
            <span class="ml-2 text-sm font-medium hidden sm:block">Account</span>
          </div>
          <div class="flex items-center {currentStep >= 3 ? 'text-slate-900' : 'text-slate-400'}">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 {currentStep >= 3 ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-400'}">
              3
            </div>
            <span class="ml-2 text-sm font-medium hidden sm:block">Academic</span>
          </div>
        </div>
      </div>

      <!-- Registration Form -->
      <form on:submit={handleSubmit} class="bg-white rounded-lg shadow-sm border border-slate-200">
        <div class="p-6 sm:p-8">
          {#if currentStep === 1}
            <!-- Step 1: Basic Information -->
            <div class="space-y-6">
              <div class="text-center mb-6">
                <h2 class="text-lg font-semibold text-gray-900 mb-2">Basic Information</h2>
                <p class="text-sm text-gray-600">Let's start with your personal details</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <!-- Full Name -->
                <div class="sm:col-span-2">
                  <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    </div>
                    <input
                      id="name"
                      type="text"
                      bind:value={formData.name}
                      on:input={() => clearError('name')}
                      class="block w-full pl-10 pr-3 py-2 border {errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>
                  {#if errors.name}
                    <p class="mt-1 text-sm text-red-600">{errors.name}</p>
                  {/if}
                </div>

                <!-- Email -->
                <div class="sm:col-span-2">
                  <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <input
                      id="email"
                      type="email"
                      bind:value={formData.email}
                      on:input={() => clearError('email')}
                      class="block w-full pl-10 pr-3 py-2 border {errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  {#if errors.email}
                    <p class="mt-1 text-sm text-red-600">{errors.email}</p>
                  {/if}
                </div>

                <!-- Phone -->
                <div>
                  <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                      </svg>
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      bind:value={formData.phone}
                      on:input={() => clearError('phone')}
                      class="block w-full pl-10 pr-3 py-2 border {errors.phone ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="+63 9XX XXX XXXX"
                    />
                  </div>
                  {#if errors.phone}
                    <p class="mt-1 text-sm text-red-600">{errors.phone}</p>
                  {/if}
                </div>

                <!-- Age -->
                <div>
                  <label for="age" class="block text-sm font-medium text-gray-700 mb-2">
                    Age (Optional)
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <input
                      id="age"
                      type="number"
                      min="16"
                      max="100"
                      bind:value={formData.age}
                      on:input={() => clearError('age')}
                      class="block w-full pl-10 pr-3 py-2 border {errors.age ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="25"
                    />
                  </div>
                  {#if errors.age}
                    <p class="mt-1 text-sm text-red-600">{errors.age}</p>
                  {/if}
                </div>
              </div>
            </div>
          {/if}

          {#if currentStep === 2}
            <!-- Step 2: Account Information -->
            <div class="space-y-6">
              <div class="text-center mb-6">
                <h2 class="text-lg font-semibold text-gray-900 mb-2">Account Information</h2>
                <p class="text-sm text-gray-600">Set up your login credentials</p>
              </div>

              <div class="grid grid-cols-1 gap-6">
                <!-- Role Selection -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-3">
                    I am a <span class="text-red-500">*</span>
                  </label>
                  <div class="grid grid-cols-2 gap-4">
                    <label class="relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors {formData.role === 'student' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}">
                      <input
                        type="radio"
                        bind:group={formData.role}
                        value="student"
                        class="sr-only"
                      />
                      <div class="text-center">
                        <svg class="h-8 w-8 mx-auto mb-2 {formData.role === 'student' ? 'text-blue-600' : 'text-gray-400'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                        </svg>
                        <span class="text-sm font-medium {formData.role === 'student' ? 'text-blue-900' : 'text-gray-900'}">Student</span>
                      </div>
                    </label>

                    <label class="relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors {formData.role === 'faculty' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}">
                      <input
                        type="radio"
                        bind:group={formData.role}
                        value="faculty"
                        class="sr-only"
                      />
                      <div class="text-center">
                        <svg class="h-8 w-8 mx-auto mb-2 {formData.role === 'faculty' ? 'text-blue-600' : 'text-gray-400'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                        <span class="text-sm font-medium {formData.role === 'faculty' ? 'text-blue-900' : 'text-gray-900'}">Faculty</span>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Username -->
                <div>
                  <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
                    Username <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                      </svg>
                    </div>
                    <input
                      id="username"
                      type="text"
                      bind:value={formData.username}
                      on:input={() => clearError('username')}
                      class="block w-full pl-10 pr-3 py-2 border {errors.username ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Choose a unique username"
                    />
                  </div>
                  {#if errors.username}
                    <p class="mt-1 text-sm text-red-600">{errors.username}</p>
                  {/if}
                  <p class="mt-1 text-xs text-gray-500">Username must be at least 3 characters and can only contain letters, numbers, and underscores</p>
                </div>

                <!-- Password -->
                <div>
                  <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                    Password <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      bind:value={formData.password}
                      on:input={() => clearError('password')}
                      class="block w-full pl-10 pr-10 py-2 border {errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 focus:outline-none"
                      tabindex="-1"
                      on:click={() => showPassword = !showPassword}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {#if showPassword}
                        <!-- Eye open icon -->
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-.5 1.57-1.5 3.03-2.958 4.03M15.5 15.5l-1.5-1.5"/>
                        </svg>
                      {:else}
                        <!-- Eye closed icon -->
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a10.05 10.05 0 012.541-4.03M6.7 6.7A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-1.357 2.568M3 3l18 18"/>
                        </svg>
                      {/if}
                    </button>
                  </div>
                  <!-- Password strength indicator -->
                  {#if passwordStrength.label}
                    <div class="mt-1 flex items-center space-x-2">
                      <div class="h-2 w-24 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          class="h-2 rounded-full transition-all"
                          style="width: {passwordStrength.label === 'Weak' ? '33%' : passwordStrength.label === 'Medium' ? '66%' : '100%'}; background-color: {passwordStrength.color === 'red' ? '#ef4444' : passwordStrength.color === 'amber' ? '#f59e42' : '#22c55e'}"
                        ></div>
                      </div>
                      <span class="text-xs font-medium"
                        style="color: {passwordStrength.color === 'red' ? '#ef4444' : passwordStrength.color === 'amber' ? '#f59e42' : '#22c55e'}">
                        {passwordStrength.label}
                      </span>
                    </div>
                  {/if}
                  {#if errors.password}
                    <p class="mt-1 text-sm text-red-600">{errors.password}</p>
                  {/if}
                  <p class="mt-1 text-xs text-gray-500">Must be at least 8 characters with uppercase, lowercase, and numbers</p>
                </div>

                <!-- Confirm Password -->
                <div>
                  <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      bind:value={formData.confirmPassword}
                      on:input={() => clearError('confirmPassword')}
                      class="block w-full pl-10 pr-10 py-2 border {errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 focus:outline-none"
                      tabindex="-1"
                      on:click={() => showConfirmPassword = !showConfirmPassword}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {#if showConfirmPassword}
                        <!-- Eye open icon -->
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-.5 1.57-1.5 3.03-2.958 4.03M15.5 15.5l-1.5-1.5"/>
                        </svg>
                      {:else}
                        <!-- Eye closed icon -->
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a10.05 10.05 0 012.541-4.03M6.7 6.7A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-1.357 2.568M3 3l18 18"/>
                        </svg>
                      {/if}
                    </button>
                  </div>
                  {#if errors.confirmPassword}
                    <p class="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  {/if}
                </div>
              </div>
            </div>
          {/if}

          {#if currentStep === 3}
            <!-- Step 3: Academic/Professional Information -->
            <div class="space-y-6">
              <div class="text-center mb-6">
                <h2 class="text-lg font-semibold text-gray-900 mb-2">
                  {formData.role === 'student' ? 'Academic Information' : 'Professional Information'}
                </h2>
                <p class="text-sm text-gray-600">
                  {formData.role === 'student' ? 'Tell us about your studies' : 'Tell us about your position'}
                </p>
              </div>

              {#if formData.role === 'student'}
                <!-- Student Fields -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <!-- Enrollment Number -->
                  <div class="sm:col-span-2">
                    <label for="enrollmentNo" class="block text-sm font-medium text-gray-700 mb-2">
                      Student ID / Enrollment Number <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                        </svg>
                      </div>
                      <input
                        id="enrollmentNo"
                        type="text"
                        bind:value={formData.enrollmentNo}
                        on:input={e => {
                          // Remove all non-digits
                          let value = e.target.value.replace(/\D/g, '');
                          // Limit to 10 digits (4 + 6)
                          value = value.slice(0, 10);
                          // Insert hyphen after 4 digits if enough digits are present
                          if (value.length > 4) {
                            value = value.slice(0, 4) + '-' + value.slice(4);
                          }
                          formData.enrollmentNo = value;
                          clearError('enrollmentNo');
                        }}
                        class="block w-full pl-10 pr-3 py-2 border {errors.enrollmentNo ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="2024-123456"
                      />
                    </div>
                    {#if errors.enrollmentNo}
                      <p class="mt-1 text-sm text-red-600">{errors.enrollmentNo}</p>
                    {/if}
                  </div>

                  <!-- Course -->
                  <div>
                    <label for="course" class="block text-sm font-medium text-gray-700 mb-2">
                      Course <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                      <button
                        type="button"
                        class="block w-full px-3 py-2 border {errors.course ? 'border-red-300' : 'border-gray-300'} rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors truncate"
                        on:click={() => showCourseDropdown = !showCourseDropdown}
                        aria-haspopup="listbox"
                        aria-expanded={showCourseDropdown}
                        style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                      >
                        <span class="{formData.course ? 'text-gray-900' : 'text-gray-400'}">
                          {getCourseLabel(formData.course)}
                        </span>
                        <svg class="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      {#if showCourseDropdown}
                        <ul
                          class="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                          tabindex="-1"
                          role="listbox"
                        >
                          {#each courseOptions as option}
                            <li
                              class="px-4 py-2 cursor-pointer hover:bg-blue-50 {formData.course === option.value ? 'bg-blue-100 font-semibold' : ''} truncate"
                              style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                              on:click={() => selectCourse(option)}
                              role="option"
                              aria-selected={formData.course === option.value}
                              title={option.label}
                            >
                              {truncateLabel(option.label)}
                            </li>
                          {/each}
                        </ul>
                      {/if}
                    </div>
                    {#if errors.course}
                      <p class="mt-1 text-sm text-red-600">{errors.course}</p>
                    {/if}
                  </div>

                  <!-- Year Level -->
                  <div>
                    <label for="year" class="block text-sm font-medium text-gray-700 mb-2">
                      Year Level <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                      <button
                        type="button"
                        class="block w-full px-3 py-2 border {errors.year ? 'border-red-300' : 'border-gray-300'} rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors truncate"
                        on:click={() => showYearDropdown = !showYearDropdown}
                        aria-haspopup="listbox"
                        aria-expanded={showYearDropdown}
                        style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                      >
                        <span class="{formData.year ? 'text-gray-900' : 'text-gray-400'}">
                          {getYearLabel(formData.year)}
                        </span>
                        <svg class="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      {#if showYearDropdown}
                        <ul
                          class="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                          tabindex="-1"
                          role="listbox"
                        >
                          {#each yearOptions as option}
                            <li
                              class="px-4 py-2 cursor-pointer hover:bg-blue-50 {formData.year === option.value ? 'bg-blue-100 font-semibold' : ''} truncate"
                              style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                              on:click={() => selectYear(option)}
                              role="option"
                              aria-selected={formData.year === option.value}
                            >
                              {option.label}
                            </li>
                          {/each}
                        </ul>
                      {/if}
                    </div>
                    {#if errors.year}
                      <p class="mt-1 text-sm text-red-600">{errors.year}</p>
                    {/if}
                  </div>
                </div>
              {:else}
                <!-- Faculty Fields -->
                <div class="grid grid-cols-1 gap-6">
                  <!-- Department -->
                  <div>
                    <label for="department" class="block text-sm font-medium text-gray-700 mb-2">
                      Department <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                      <select
                        id="department"
                        bind:value={formData.department}
                        on:change={() => clearError('department')}
                        class="block w-full px-3 py-2 border {errors.department ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      >
                        <option value="">Select your department</option>
                        {#each departments as dept}
                          <option value={dept}>{dept}</option>
                        {/each}
                      </select>
                    </div>
                    {#if errors.department}
                      <p class="mt-1 text-sm text-red-600">{errors.department}</p>
                    {/if}
                  </div>

                  <!-- Designation -->
                  <div>
                    <label for="designation" class="block text-sm font-medium text-gray-700 mb-2">
                      Position/Designation <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0v2a2 2 0 002 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2v-2"/>
                        </svg>
                      </div>
                      <input
                        id="designation"
                        type="text"
                        bind:value={formData.designation}
                        on:input={() => clearError('designation')}
                        class="block w-full pl-10 pr-3 py-2 border {errors.designation ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="e.g., Professor, Assistant Professor, Librarian"
                      />
                    </div>
                    {#if errors.designation}
                      <p class="mt-1 text-sm text-red-600">{errors.designation}</p>
                    {/if}
                  </div>
                </div>
              {/if}

              <!-- Privacy Policy & Terms -->
              <div class="pt-4 border-t border-gray-200 space-y-4">
                <!-- Privacy Notice Box -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0 pt-0.5">
                      <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                    </div>
                    <div class="text-sm text-blue-900">
                      <p class="font-semibold mb-2">Privacy & Data Collection Notice</p>
                      <p class="mb-2">We collect and process your personal information in accordance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>.</p>
                      <ul class="list-disc list-inside space-y-1 text-xs ml-1">
                        <li>Your data will be used solely for library account management and services</li>
                        <li>We protect your information with appropriate security measures</li>
                        <li>You have the right to access, correct, or request deletion of your data</li>
                        <li>Your information will not be shared with third parties without consent</li>
                        <li>Data retention follows institutional policies and legal requirements</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <!-- Terms and Conditions Checkbox -->
                <div class="bg-gray-50 rounded-lg p-4">
                  <label class="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      bind:checked={agreedToTerms}
                      on:change={() => clearError('terms')}
                      class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div class="flex-1 text-sm text-gray-700">
                      <p>I have read and agree to the <a href="/terms" target="_blank" class="text-blue-600 hover:text-blue-800 underline font-medium">Terms of Service</a> and <a href="/privacy" target="_blank" class="text-blue-600 hover:text-blue-800 underline font-medium">Privacy Policy</a>. I understand that:</p>
                      <ul class="list-disc list-inside mt-2 space-y-1 text-xs ml-1">
                        <li>My account will be reviewed and activated by library staff</li>
                        <li>I am responsible for maintaining the confidentiality of my account</li>
                        <li>I will comply with all library rules and regulations</li>
                        <li>Misuse of library resources may result in account suspension</li>
                      </ul>
                    </div>
                  </label>
                  {#if errors.terms}
                    <p class="mt-2 text-sm text-red-600">{errors.terms}</p>
                  {/if}
                </div>

                <!-- Data Subject Rights Info -->
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0 pt-0.5">
                      <svg class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div class="text-xs text-amber-900">
                      <p class="font-semibold mb-1">Your Rights as a Data Subject</p>
                      <p>Under RA 10173, you have the right to be informed, access, correct, erase, object to processing, data portability, and file complaints. For privacy concerns, contact our Data Protection Officer at <strong>dpo@school.edu</strong> or visit the library office.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Success Message -->
          {#if submitSuccess}
            <div class="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div class="flex">
                <svg class="h-5 w-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-sm text-green-800">{submitSuccess}</p>
              </div>
            </div>
          {/if}

          <!-- Error Message -->
          {#if submitError}
            <div class="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div class="flex">
                <svg class="h-5 w-5 text-red-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
                <p class="text-sm text-red-800">{submitError}</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Form Actions -->
        <div class="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 rounded-b-lg">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div class="flex space-x-3">
              {#if currentStep > 1}
                <button
                  type="button"
                  on:click={prevStep}
                  disabled={isSubmitting}
                  class="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                  </svg>
                  Previous
                </button>
              {/if}
            </div>
            <div class="flex space-x-3">
              {#if currentStep < totalSteps}
                <button
                  type="button"
                  on:click={nextStep}
                  disabled={isSubmitting}
                  class="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-slate-900 border border-transparent rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <svg class="h-4 w-4 ml-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              {:else}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  class="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-slate-900 border border-transparent rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {#if isSubmitting}
                    <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  {:else}
                    <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                    Create Account
                  {/if}
                </button>
              {/if}
            </div>
          </div>
        </div>
      </form>

      <!-- Additional Links -->
      <div class="mt-8 text-center">
        <p class="text-sm text-slate-600">
          Already have an account?
          <a href="/" class="font-medium text-slate-900 hover:underline transition-colors">
            Sign in here
          </a>
        </p>
        <div class="mt-4 text-xs text-slate-500">
          <p>Protected by the Data Privacy Act of 2012 (RA 10173)</p>
          <p class="mt-1">© 2024 Metro Dagupan Colleges Library. All rights reserved.</p>
        </div>
      </div>
    </div>
  </div>
</div>