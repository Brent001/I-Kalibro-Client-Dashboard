<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { afterNavigate } from '$app/navigation';
  import Layout from "$lib/components/ui/layout.svelte";
  import type { PageData } from './$types.js';
  
  export let data: PageData;
  
  // Core state
  let html5QrCode: any = null;
  let isScanning = false;
  let cameraId: string | null = null;
  let cameras: Array<{ id: string; label: string }> = [];
  let scanHistory: Array<{text: string, timestamp: Date, action: string}> = [];
  let scanResult: string | null = null;
  let errorMsg = "";
  let cameraPermission: 'granted' | 'denied' | 'pending' | 'checking' = 'pending';
  let isStopping = false;
  
  // Processing state
  let isProcessing = false;
  let processingQrCode: string | null = null;
  let lastProcessedTime = 0;

  // Menu state
  let currentStep: 'menu' | 'scanning' = 'menu';
  let selectedAction: 'time_in' | 'time_out' | null = null;
  let purpose = '';
  let customPurpose = '';
  let showPurposeError = false;
  let showDropdown = false;
  
  // Common purposes
  const commonPurposes = [
    'Study',
    'Research',
    'Borrow Books',
    'Return Books',
    'Reading',
    'Group Study',
    'Use Computer/Internet',
    'Print Documents',
    'Attend Workshop/Seminar',
    'Meet with Librarian',
    'Custom'
  ];

  // Server-side data
  $: ({ scanner, user } = data);
  $: config = scanner?.config || { fps: 10, qrboxPercentage: 0.7, preferredCamera: 'user' };
  $: hasRequirementErrors = scanner?.errors?.httpsRequired || scanner?.errors?.unsupportedBrowser;

  // Load QR scanner library
  async function loadHtml5Qrcode() {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      return Html5Qrcode;
    } catch (error) {
      throw new Error('QR scanner library failed to load');
    }
  }

  // Request camera permission and get devices
  async function requestCameraAccess(): Promise<boolean> {
    cameraPermission = 'checking';
    errorMsg = "";

    try {
      const constraints = {
        video: {
          facingMode: scanner.device.isMobile ? 
            { ideal: 'environment' } : { ideal: 'user' },
          width: { ideal: scanner.device.isMobile ? 640 : 480 },
          height: { ideal: scanner.device.isMobile ? 480 : 360 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach(track => track.stop());
      
      cameraPermission = 'granted';
      await getCameraDevices();
      return true;
    } catch (err: any) {
      cameraPermission = 'denied';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = scanner.device.isMobile && scanner.device.isIOS ?
          "Go to Settings > Safari > Camera and allow access" :
          "Please allow camera access when prompted";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "No camera found on this device";
      } else {
        errorMsg = `Camera error: ${err.message}`;
      }
      return false;
    }
  }

  async function getCameraDevices() {
    try {
      const Html5Qrcode = await loadHtml5Qrcode();
      const devices = await Html5Qrcode.getCameras();
      
      cameras = devices.map((d: any, index: number) => ({ 
        id: d.id, 
        label: d.label || `Camera ${index + 1}` 
      }));
      
      if (scanner.device.isMobile) {
        const backCamera = cameras.find(cam => 
          cam.label.toLowerCase().includes('back') || 
          cam.label.toLowerCase().includes('environment')
        );
        cameraId = backCamera?.id || cameras[cameras.length - 1]?.id || null;
      } else {
        cameraId = cameras[0]?.id || null;
      }
    } catch (err) {
      errorMsg = "Unable to access camera devices";
      cameras = [];
      cameraId = null;
    }
  }

  async function startScanner() {
    if (cameraPermission !== 'granted') {
      const hasAccess = await requestCameraAccess();
      if (!hasAccess) return;
    }

    await tick();
    const qrReaderElement = document.getElementById("qr-reader");
    if (!qrReaderElement) {
      errorMsg = "Scanner interface not ready";
      return;
    }

    try {
      await stopScanner();
      
      isProcessing = false;
      processingQrCode = null;
      lastProcessedTime = 0;
      
      const Html5Qrcode = await loadHtml5Qrcode();
      html5QrCode = new Html5Qrcode("qr-reader");
      
      if (!cameraId) {
        throw new Error("No camera available");
      }

      const scannerConfig = {
        fps: config.fps,
        qrbox: function(viewfinderWidth: number, viewfinderHeight: number) {
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * config.qrboxPercentage);
          return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        cameraId,
        scannerConfig,
        async (decodedText: string) => {
          const now = Date.now();
          
          if (isProcessing || 
              (processingQrCode === decodedText && now - lastProcessedTime < 5000)) {
            return;
          }
          
          isProcessing = true;
          processingQrCode = decodedText;
          lastProcessedTime = now;
          
          try {
            await processQRCode(decodedText);
            await stopScanner();
          } catch (error) {
            console.error('Error processing QR code:', error);
            isProcessing = false;
            processingQrCode = null;
          }
        },
        () => {}
      );
      
      isScanning = true;
      errorMsg = "";
    } catch (err: any) {
      isScanning = false;
      isProcessing = false;
      processingQrCode = null;
      errorMsg = `Failed to start scanner: ${err.message}`;
    }
  }

  async function stopScanner() {
    if (isStopping) return;
    isStopping = true;
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        await html5QrCode.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      const videoEl = document.querySelector('#qr-reader video') as HTMLVideoElement;
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoEl.srcObject = null;
      }
      html5QrCode = null;
    }
    isScanning = false;
    isStopping = false;
  }

  async function handleCameraChange(event: Event) {
    cameraId = (event.target as HTMLSelectElement).value;
    if (isScanning) {
      await stopScanner();
      setTimeout(startScanner, 500);
    }
  }

  function handleActionSelect(action: 'time_in' | 'time_out') {
    selectedAction = action;
    if (action === 'time_out') {
      purpose = '';
      customPurpose = '';
      showPurposeError = false;
    }
  }
  
  function handlePurposeSelect(selectedPurpose: string) {
    if (selectedPurpose === 'Custom') {
      purpose = 'Custom';
      customPurpose = '';
    } else {
      purpose = selectedPurpose;
      customPurpose = '';
    }
    showDropdown = false;
    showPurposeError = false;
  }
  
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      showDropdown = false;
    }
  }

  function handleProceedToScan() {
    if (selectedAction === 'time_in') {
      if (!purpose || purpose === '') {
        showPurposeError = true;
        return;
      }
      
      if (purpose === 'Custom') {
        if (!customPurpose.trim()) {
          showPurposeError = true;
          return;
        }
        if (customPurpose.trim().length > 100) {
          showPurposeError = true;
          return;
        }
      }
    }
    
    showPurposeError = false;
    currentStep = 'scanning';
    
    if (cameraPermission === 'granted') {
      startScanner();
    }
  }

  function handleBackToMenu() {
    stopScanner();
    currentStep = 'menu';
    selectedAction = null;
    purpose = '';
    customPurpose = '';
    showPurposeError = false;
    showDropdown = false;
    errorMsg = '';
    scanResult = null;
  }

  async function processQRCode(content: string) {
    try {
      errorMsg = "";

      const now = new Date();
      const cooldownMs = 2 * 60 * 1000;
      const recentScan = scanHistory.find(
        entry => entry.text === content && 
                 entry.action === selectedAction &&
                 now.getTime() - entry.timestamp.getTime() < cooldownMs
      );
      
      if (recentScan) {
        errorMsg = "This QR code was already scanned recently for this action.";
        isProcessing = false;
        processingQrCode = null;
        setTimeout(() => {
          errorMsg = "";
          isProcessing = false;
          processingQrCode = null;
        }, 10000);
        return;
      }

      const validateRes = await fetch('/api/process-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const validateData = await validateRes.json();

      if (!validateRes.ok || !validateData.success) {
        errorMsg = validateData.error || validateData.message || "Invalid QR code";
        isProcessing = false;
        processingQrCode = null;
        setTimeout(() => {
          errorMsg = "";
          isProcessing = false;
          processingQrCode = null;
        }, 10000);
        return;
      }

      const saveRes = await fetch('/api/process-qr/db_save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          username: user.username,
          fullName: user.name,
          purpose: selectedAction === 'time_in' ? (purpose === 'Custom' ? customPurpose : purpose) : undefined
        })
      });
      const saveData = await saveRes.json();

      if (!saveRes.ok || !saveData.success) {
        errorMsg = saveData.error || saveData.message || `Failed to save ${selectedAction}`;
        isProcessing = false;
        processingQrCode = null;
        setTimeout(() => {
          errorMsg = "";
          isProcessing = false;
          processingQrCode = null;
        }, 10000);
        return;
      }

      scanResult = content;
      scanHistory = [
        { text: content, timestamp: now, action: selectedAction! },
        ...scanHistory
      ];
      
      setTimeout(() => {
        scanResult = null;
        isProcessing = false;
        processingQrCode = null;
        handleBackToMenu();
      }, 3000);
      
    } catch (error) {
      console.error('Error in processQRCode:', error);
      errorMsg = "An error occurred while processing the QR code";
      isProcessing = false;
      processingQrCode = null;
    }
  }

  async function cleanup() {
    try {
      await stopScanner();
      isProcessing = false;
      processingQrCode = null;
      lastProcessedTime = 0;
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  function handleVisibilityChange() {
    if (document.hidden && isScanning) {
      cleanup();
    }
  }

  function handleBeforeUnload() {
    cleanup();
  }

  onMount(() => {
    if (!hasRequirementErrors && scanner.capabilities.supportsCamera) {
      requestCameraAccess();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    afterNavigate((nav) => {
      if (nav.from?.url.pathname === '/dashboard/qr_scanner' && nav.to?.url.pathname !== '/dashboard/qr_scanner') {
        cleanup();
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      cleanup();
    };
  });

  onDestroy(() => {
    cleanup();
  });
</script>

<svelte:head>
  <title>QR Scanner | Library System</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
</svelte:head>

<Layout>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
    <div class="max-w-3xl mx-auto px-2 sm:px-4 py-2 sm:py-6">
      <!-- Header Section -->
      <div class="mb-3 sm:mb-6">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">QR Scanner</h1>
            <p class="text-slate-600 mt-1 text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
              <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
              </svg>
              Scan QR code for library attendance
            </p>
          </div>
          {#if currentStep === 'scanning'}
            <div class="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
              <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span class="text-xs sm:text-sm font-semibold text-blue-900">
                {selectedAction === 'time_in' ? 'Time In Mode' : 'Time Out Mode'}
              </span>
            </div>
          {/if}
        </div>
      </div>

      {#if hasRequirementErrors}
        <!-- Requirements Error -->
        <div class="bg-white rounded-xl shadow-md border border-slate-200 p-4 sm:p-6 text-center">
          <div class="w-14 h-14 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <svg class="w-7 h-7 sm:w-10 sm:h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h2 class="text-lg sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">QR Scanner Not Available</h2>
          {#if scanner.errors.httpsRequired}
            <p class="text-red-600 mb-2 text-xs sm:text-base">{scanner.errors.httpsRequired}</p>
          {/if}
          {#if scanner.errors.unsupportedBrowser}
            <p class="text-red-600 mb-2 text-xs sm:text-base">{scanner.errors.unsupportedBrowser}</p>
          {/if}
          <button 
            class="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            on:click={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      {:else if currentStep === 'menu'}
        <!-- Enhanced Menu Step -->
        <div class="bg-white rounded-xl shadow-md border border-slate-200 p-3 sm:p-6">
          <h2 class="text-lg sm:text-2xl font-bold text-slate-900 mb-3 sm:mb-4 text-center">Select Action</h2>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-3 sm:mb-4">
            <button
              class="group rounded-lg border-2 p-3 sm:p-4 text-center font-medium transition-all duration-200 hover:shadow-lg {selectedAction === 'time_in' ? 'border-green-500 bg-green-50 shadow-md' : 'border-slate-200 bg-white hover:border-green-300'}"
              on:click={() => handleActionSelect('time_in')}
            >
              <div class="mb-2">
                <div class="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-green-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                  </svg>
                </div>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-slate-900 mb-1">Time In</h3>
              <p class="text-xs sm:text-sm text-slate-600">Check in to the library</p>
            </button>
            
            <button
              class="group rounded-lg border-2 p-3 sm:p-4 text-center font-medium transition-all duration-200 hover:shadow-lg {selectedAction === 'time_out' ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-slate-200 bg-white hover:border-orange-300'}"
              on:click={() => handleActionSelect('time_out')}
            >
              <div class="mb-2">
                <div class="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-orange-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                </div>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-slate-900 mb-1">Time Out</h3>
              <p class="text-xs sm:text-sm text-slate-600">Check out from the library</p>
            </button>
          </div>
          
          {#if selectedAction === 'time_in'}
            <div class="bg-slate-50 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 border border-slate-200">
              <label class="block text-xs sm:text-sm font-bold text-slate-900 mb-2">
                Purpose of Visit <span class="text-red-500">*</span>
              </label>
              <div class="relative custom-dropdown">
                <button
                  type="button"
                  class="w-full px-3 sm:px-4 py-2 border-2 rounded-lg text-xs sm:text-sm text-left transition-all {showPurposeError ? 'border-red-500 bg-red-50' : purpose ? 'border-green-500 bg-green-50' : 'border-slate-300 bg-white hover:border-slate-400'}"
                  on:click={() => showDropdown = !showDropdown}
                >
                  <span class="{!purpose ? 'text-slate-400' : 'text-slate-900 font-medium'}">
                    {purpose || 'Select your purpose'}
                  </span>
                  <svg class="w-4 h-4 sm:w-5 sm:h-5 float-right text-slate-400 transition-transform {showDropdown ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {#if showDropdown}
                  <div class="absolute z-10 w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {#each commonPurposes as commonPurpose}
                      <button
                        type="button"
                        class="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-slate-50 transition-colors {purpose === commonPurpose ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700'}"
                        on:click={() => handlePurposeSelect(commonPurpose)}
                      >
                        {commonPurpose}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
              {#if purpose === 'Custom'}
                <div class="mt-2">
                  <input
                    type="text"
                    class="w-full px-3 sm:px-4 py-2 border-2 rounded-lg text-xs sm:text-sm transition-all {showPurposeError && !customPurpose.trim() ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white focus:border-slate-500'} focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter your custom purpose (max 100 characters)"
                    maxlength="100"
                    bind:value={customPurpose}
                    on:input={() => showPurposeError = false}
                  />
                  <div class="mt-2 flex justify-between items-center">
                    <span class="text-xs text-slate-500">Be specific about your visit purpose</span>
                    <span class="text-xs font-medium {customPurpose.length > 90 ? 'text-orange-600' : 'text-slate-400'}">
                      {customPurpose.length}/100
                    </span>
                  </div>
                </div>
              {/if}
              {#if showPurposeError}
                <div class="mt-2 sm:mt-3 flex items-center gap-2 text-xs sm:text-sm text-red-600 bg-red-50 px-2 sm:px-3 py-2 rounded-lg">
                  <svg class="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                  </svg>
                  <span>
                    {purpose === 'Custom' && !customPurpose.trim() 
                      ? 'Please enter your custom purpose' 
                      : customPurpose.length > 100 
                        ? 'Purpose must be 100 characters or less'
                        : 'Please select a purpose for your visit'}
                  </span>
                </div>
              {/if}
            </div>
          {/if}
          
          {#if selectedAction}
            <button
              class="w-full py-2.5 sm:py-3 bg-slate-900 text-white rounded-lg font-bold text-xs sm:text-sm hover:bg-slate-800 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.98]"
              on:click={handleProceedToScan}
            >
              <svg class="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
              </svg>
              Proceed to Scan QR Code
            </button>
          {/if}
        </div>
      {:else if currentStep === 'scanning'}
        <!-- Enhanced Scanning Step -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          <div class="lg:col-span-2 bg-white rounded-xl shadow-md border border-slate-200 p-3 sm:p-6">
            <div class="flex items-center justify-between mb-3 sm:mb-6">
              <button
                class="flex items-center gap-1 sm:gap-2 text-slate-600 hover:text-slate-900 font-medium text-xs sm:text-sm transition-colors"
                on:click={handleBackToMenu}
                disabled={isProcessing}
              >
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Back to Menu
              </button>
              <h3 class="text-base sm:text-lg font-bold text-slate-900">Scanner Active</h3>
              <div class="w-16 sm:w-24"></div>
            </div>
            
            {#if cameras.length > 1}
              <div class="mb-3 sm:mb-6">
                <label class="block text-xs sm:text-sm font-bold text-slate-900 mb-2">Camera Selection</label>
                <select
                  class="w-full px-3 sm:px-4 py-2 border-2 border-slate-300 rounded-lg text-xs sm:text-sm font-medium focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all"
                  on:change={handleCameraChange}
                  bind:value={cameraId}
                >
                  {#each cameras as cam}
                    <option value={cam.id}>{cam.label}</option>
                  {/each}
                </select>
              </div>
            {/if}
            
            {#if errorMsg}
              <div class="bg-rose-50 border-l-4 border-rose-500 text-rose-800 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-3 sm:mb-6 flex items-center justify-between shadow-sm animate-slideUp">
                <div class="flex items-center gap-2 sm:gap-3">
                  <svg class="h-4 w-4 sm:h-5 sm:w-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-xs sm:text-sm font-medium">{errorMsg}</span>
                </div>
                <button on:click={() => errorMsg = ""} class="text-rose-400 hover:text-rose-600 transition-colors">
                  <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            {/if}
            
            <div class="relative mb-3 sm:mb-6">
              <div
                id="qr-reader"
                class="rounded-xl bg-slate-100 border border-slate-200 shadow-inner overflow-hidden"
                style="width: 100%; aspect-ratio: 1 / 1; max-width: 320px; margin: auto;"
              ></div>
              {#if isProcessing && !scanResult}
                <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-xl backdrop-blur-sm">
                  <div class="bg-white p-3 sm:p-4 rounded-xl shadow-2xl text-center animate-slideUp">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2 sm:mb-3"></div>
                    <div class="text-sm sm:text-base font-semibold text-slate-900">Processing QR Code...</div>
                    <div class="text-xs sm:text-sm text-slate-600 mt-1">Please wait</div>
                  </div>
                </div>
              {/if}
              {#if scanResult}
                <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-xl backdrop-blur-sm">
                  <div class="bg-white p-3 sm:p-4 rounded-xl shadow-2xl text-center max-w-sm mx-4 animate-slideUp">
                    <div class="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <svg class="w-7 h-7 sm:w-10 sm:h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                    <h4 class="text-base sm:text-lg font-bold text-slate-900 mb-2">Success!</h4>
                    <div class="text-xs sm:text-sm text-slate-600 mb-2">QR Code Scanned</div>
                    <div class="text-xs font-mono text-slate-900 bg-slate-100 px-2 sm:px-3 py-2 rounded-lg break-all mb-2 sm:mb-3">{scanResult}</div>
                    <div class="text-xs sm:text-sm font-bold text-green-600">
                      {selectedAction === 'time_in' ? '✓ Time in recorded successfully' : '✓ Time out recorded successfully'}
                    </div>
                  </div>
                </div>
              {/if}
            </div>
            
            {#if isScanning}
              <button
                class="w-full py-2.5 sm:py-4 bg-red-600 text-white rounded-lg font-bold text-sm sm:text-base hover:bg-red-700 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                on:click={stopScanner}
                disabled={isStopping || isProcessing}
              >
                {isStopping ? 'Stopping Scanner...' : isProcessing ? 'Processing...' : 'Stop Scanner'}
              </button>
            {:else if !isProcessing}
              <button
                class="w-full py-2.5 sm:py-4 bg-slate-900 text-white rounded-lg font-bold text-sm sm:text-base hover:bg-slate-800 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                on:click={startScanner}
              >
                Start Scanner
              </button>
            {/if}
          </div>
          
          <div class="lg:col-span-1 space-y-3 sm:space-y-4">
            <!-- Current Action Card -->
            <div class="bg-white rounded-xl shadow-md border border-slate-200 p-3 sm:p-5">
              <h3 class="text-sm sm:text-base font-bold text-slate-900 mb-3 sm:mb-4">Current Action</h3>
              <div class="bg-gradient-to-br {selectedAction === 'time_in' ? 'from-green-50 to-emerald-50 border-green-200' : 'from-orange-50 to-amber-50 border-orange-200'} border-2 rounded-xl p-3 sm:p-4">
                <div class="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div class="w-8 h-8 sm:w-10 sm:h-10 {selectedAction === 'time_in' ? 'bg-green-600' : 'bg-orange-600'} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {#if selectedAction === 'time_in'}
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                      {:else}
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                      {/if}
                    </svg>
                  </div>
                  <div>
                    <span class="text-base sm:text-lg font-bold text-slate-900 block">
                      {selectedAction === 'time_in' ? 'Time In' : 'Time Out'}
                    </span>
                    <span class="text-xs text-slate-600">Active mode</span>
                  </div>
                </div>
                {#if selectedAction === 'time_in' && purpose}
                  <div class="border-t-2 border-white pt-2 sm:pt-3 mt-2 sm:mt-3">
                    <div class="text-xs font-semibold text-slate-700 mb-1">Purpose:</div>
                    <div class="text-xs sm:text-sm font-bold text-slate-900 bg-white px-2 sm:px-3 py-2 rounded-lg">
                      {purpose === 'Custom' ? customPurpose : purpose}
                    </div>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Instructions Card -->
            <div class="bg-white rounded-xl shadow-md border border-slate-200 p-3 sm:p-5">
              <h4 class="font-bold text-sm sm:text-base text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
                <svg class="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Instructions
              </h4>
              <ol class="space-y-2 sm:space-y-3">
                <li class="flex items-start gap-2 sm:gap-3">
                  <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span class="text-xs sm:text-sm text-slate-700 pt-0.5">Position the QR code within the scanner frame</span>
                </li>
                <li class="flex items-start gap-2 sm:gap-3">
                  <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span class="text-xs sm:text-sm text-slate-700 pt-0.5">Hold your device steady for automatic scanning</span>
                </li>
                <li class="flex items-start gap-2 sm:gap-3">
                  <span class="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span class="text-xs sm:text-sm text-slate-700 pt-0.5">Wait for the success confirmation</span>
                </li>
              </ol>
            </div>

            <!-- Tips Card -->
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3 sm:p-5 shadow-sm">
              <div class="flex items-start gap-2 sm:gap-3">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                <div>
                  <h5 class="font-bold text-xs sm:text-sm text-blue-900 mb-1">Scanning Tips</h5>
                  <p class="text-xs text-blue-800">Ensure good lighting and keep the QR code clean and flat for best results.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</Layout>

<style>
  /* Mobile-only compact styles (applies to screens smaller than 640px) */
  @media (max-width: 639px) {
    /* Border radius - mobile only */
    .rounded-lg { border-radius: 0.75rem; }
    .rounded-xl { border-radius: 1rem; }
    .rounded-full { border-radius: 9999px; }

    /* Padding - mobile only */
    .p-6, .p-8 { padding: 0.75rem !important; }
    .p-4, .p-5 { padding: 0.75rem !important; }
    .p-3 { padding: 0.5rem !important; }

    /* Font sizes - mobile only, slightly increased */
    h1, h2, h3, h4, h5 { font-size: 1.1rem !important; }
    .text-base { font-size: 0.95rem !important; }
    .text-sm { font-size: 0.85rem !important; }
    .text-xs { font-size: 0.8rem !important; }
    .text-xl { font-size: 1.25rem !important; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }

    /* Icon sizes - mobile only */
    svg, .icon {
      width: 1.25em !important;
      height: 1.25em !important;
      min-width: 1.25em;
      min-height: 1.25em;
    }
    .w-3, .h-3 { width: 1rem !important; height: 1rem !important; }
    .w-4, .h-4 { width: 1.15rem !important; height: 1.15rem !important; }
    .w-5, .h-5 { width: 1.35rem !important; height: 1.35rem !important; }
    .w-6, .h-6 { width: 1.5rem !important; height: 1.5rem !important; }
    .w-7, .h-7 { width: 1.75rem !important; height: 1.75rem !important; }
    .w-8, .h-8 { width: 2rem !important; height: 2rem !important; }
    .w-10, .h-10 { width: 2.5rem !important; height: 2.5rem !important; }
    .w-12, .h-12 { width: 3rem !important; height: 3rem !important; }
    .w-14, .h-14 { width: 3.5rem !important; height: 3.5rem !important; }
    .w-16, .h-16 { width: 3.75rem !important; height: 3.75rem !important; }

    /* Grid gap - mobile only */
    .gap-4 { gap: 0.75rem !important; }
    .gap-3 { gap: 0.5rem !important; }
    .gap-2 { gap: 0.4rem !important; }
    .gap-1 { gap: 0.25rem !important; }
    
    .space-y-3 > * + * { margin-top: 0.5rem !important; }
    .space-y-2 > * + * { margin-top: 0.4rem !important; }

    /* Margins - mobile only */
    .mb-3, .mb-4, .mb-6 { margin-bottom: 0.75rem !important; }
    .mb-2 { margin-bottom: 0.5rem !important; }
    .mt-3, .mt-4 { margin-top: 0.75rem !important; }
    .mt-2 { margin-top: 0.5rem !important; }
    .mt-1 { margin-top: 0.25rem !important; }
  }

  /* Desktop and tablet retain original sizes (640px and above) */
  @media (min-width: 640px) {
    /* Original sizes are preserved via Tailwind's sm: prefix */
  }

  /* Custom scrollbar for all devices */
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-slideUp {
    animation: slideUp 0.4s ease-out;
  }

  /* Smooth transitions */
  * {
    transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
</style>