<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import Layout from "$lib/components/ui/layout.svelte";
  
  // Type declarations for legacy getUserMedia
  interface ExtendedNavigator extends Navigator {
    getUserMedia?: (constraints: MediaStreamConstraints, successCallback: (stream: MediaStream) => void, errorCallback: (error: any) => void) => void;
    webkitGetUserMedia?: (constraints: MediaStreamConstraints, successCallback: (stream: MediaStream) => void, errorCallback: (error: any) => void) => void;
    mozGetUserMedia?: (constraints: MediaStreamConstraints, successCallback: (stream: MediaStream) => void, errorCallback: (error: any) => void) => void;
    msGetUserMedia?: (constraints: MediaStreamConstraints, successCallback: (stream: MediaStream) => void, errorCallback: (error: any) => void) => void;
  }
  
  // State variables with safer defaults
  let errorMsg = "";
  let scanResult: string | null = null;
  let isScanning = false;
  let html5QrCode: any = null;
  let cameraPermission: 'granted' | 'denied' | 'pending' | 'checking' = 'pending';
  let cameraId: string | null = null;
  let cameras: Array<{ id: string; label: string }> = [];
  let isMobile = false;
  let scanHistory: Array<{text: string, timestamp: Date}> = [];
  let scanTimeout: NodeJS.Timeout | null = null;
  let isSecureContext = false;
  let browserSupported = false;
  let isInitialized = false;
  let isDestroyed = false;
  let qrReaderElement: HTMLElement | null = null;
  let retryCount = 0;
  let maxRetries = 3;

  // Safe device detection functions
  function isAndroid(): boolean {
    try {
      return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    } catch {
      return false;
    }
  }

  function isIOS(): boolean {
    try {
      return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    } catch {
      return false;
    }
  }

  // Dynamically import html5-qrcode with better error handling
  async function loadHtml5Qrcode() {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('Not running in browser environment');
      }
      
      // @ts-ignore
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!Html5Qrcode) {
        throw new Error('Html5Qrcode not available');
      }
      return Html5Qrcode;
    } catch (error) {
      console.error('Failed to load html5-qrcode:', error);
      throw new Error(`QR scanner library failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function checkMediaDevicesSupport(): boolean {
    try {
      return !!(
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices && 
        navigator.mediaDevices.getUserMedia
      );
    } catch {
      return false;
    }
  }

  function getLegacyGetUserMedia() {
    try {
      if (typeof navigator === 'undefined') return null;
      const nav = navigator as ExtendedNavigator;
      return (
        nav.getUserMedia ||
        nav.webkitGetUserMedia ||
        nav.mozGetUserMedia ||
        nav.msGetUserMedia
      );
    } catch {
      return null;
    }
  }

  async function checkCameraPermission(): Promise<string> {
    try {
      if (typeof navigator === 'undefined' || !('permissions' in navigator)) {
        return 'prompt';
      }
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    } catch (err) {
      console.warn('Permission check failed:', err);
      return 'prompt';
    }
  }

  async function requestCameraPermission(): Promise<boolean> {
    if (isDestroyed) return false;
    
    cameraPermission = 'checking';
    errorMsg = "";
    retryCount = 0;

    if (!isSecureContext) {
      cameraPermission = 'denied';
      errorMsg = "Camera access requires HTTPS. Please use a secure connection.";
      return false;
    }

    if (!browserSupported) {
      cameraPermission = 'denied';
      errorMsg = "Camera access is not supported in this browser. Please try a modern browser.";
      return false;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: isMobile ? 'environment' : 'user',
          width: { ideal: isMobile ? 1280 : 640 },
          height: { ideal: isMobile ? 720 : 480 }
        }
      };

      let stream: MediaStream;
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        const legacyGetUserMedia = getLegacyGetUserMedia();
        if (!legacyGetUserMedia) {
          throw new Error('getUserMedia is not supported');
        }
        stream = await new Promise<MediaStream>((resolve, reject) => {
          legacyGetUserMedia.call(navigator, constraints, resolve, reject);
        });
      }
      
      // Safely stop tracks
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track: MediaStreamTrack) => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Failed to stop track:', e);
          }
        });
      }
      
      cameraPermission = 'granted';
      return true;
    } catch (err: any) {
      cameraPermission = 'denied';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = "Camera access denied. Please allow camera permission and refresh the page.";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "No camera found on this device.";
      } else if (err.name === 'NotSupportedError') {
        errorMsg = "Camera access is not supported on this browser.";
      } else if (err.name === 'NotReadableError') {
        errorMsg = "Camera is already in use by another application.";
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = "Camera constraints cannot be satisfied.";
      } else {
        errorMsg = `Camera error: ${err.message || 'Unknown camera error'}`;
      }
      console.error('Camera permission error:', err);
      return false;
    }
  }

  async function getCameraDevices(): Promise<void> {
    if (isDestroyed) return;
    
    try {
      const Html5Qrcode = await loadHtml5Qrcode();
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        throw new Error("No camera devices found");
      }
      
      cameras = devices.map((d: any) => ({ 
        id: d.id || `camera-${Math.random().toString(36).substr(2, 9)}`, 
        label: d.label || `Camera ${d.id ? d.id.substring(0, 8) + '...' : 'Unknown'}` 
      }));
      
      if (isMobile) {
        const backCamera = cameras.find(cam => 
          cam.label.toLowerCase().includes('back') || 
          cam.label.toLowerCase().includes('rear') ||
          cam.label.toLowerCase().includes('environment')
        );
        cameraId = backCamera?.id || cameras[0]?.id || null;
      } else {
        cameraId = cameras[0]?.id || null;
      }
      
      if (!cameraId) {
        throw new Error("No valid camera ID found");
      }
    } catch (err: any) {
      console.error('Error getting cameras:', err);
      errorMsg = `Unable to access camera devices: ${err.message || 'Unknown error'}`;
      cameras = [];
      cameraId = null;
    }
  }

  async function startScanner(): Promise<void> {
    if (isDestroyed) return;
    
    // Ensure DOM element exists
    await tick();
    qrReaderElement = document.getElementById("qr-reader");
    
    if (!qrReaderElement) {
      console.error('QR reader element not found');
      errorMsg = "Scanner interface not ready. Please refresh the page.";
      return;
    }

    if (cameraPermission !== 'granted') {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission || isDestroyed) return;
    }

    errorMsg = "";
    isScanning = true;

    try {
      // Clean up any existing scanner
      await stopScanner();
      
      const Html5Qrcode = await loadHtml5Qrcode();
      html5QrCode = new Html5Qrcode("qr-reader");
      
      await getCameraDevices();
      
      if (!cameraId || isDestroyed) {
        throw new Error("No camera available");
      }

      const config = {
        fps: isMobile ? 8 : 10,
        qrbox: function(viewfinderWidth: number, viewfinderHeight: number) {
          const minEdgePercentage = 0.7;
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return {
            width: qrboxSize,
            height: qrboxSize
          };
        },
        aspectRatio: isMobile ? 1.0 : 1.777778,
        disableFlip: false,
        rememberLastUsedCamera: true
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText: string) => {
          if (isDestroyed) return;
          
          try {
            processQRCode(decodedText);

            scanResult = "QR_CODE_DETECTED";
            scanHistory = [...scanHistory, {
              text: decodedText,
              timestamp: new Date()
            }];

            if (scanTimeout) clearTimeout(scanTimeout);
            scanTimeout = setTimeout(() => {
              if (!isDestroyed) {
                scanResult = null;
              }
            }, 2000);
          } catch (e) {
            console.error('Error processing QR code:', e);
          }
        },
        (error: string) => {
          // Ignore frequent scan errors - this is normal
        }
      );
      
      retryCount = 0; // Reset retry count on success
    } catch (err: any) {
      console.error('Scanner error:', err);
      isScanning = false;
      
      // Implement retry logic for transient errors
      if (retryCount < maxRetries && !isDestroyed) {
        retryCount++;
        errorMsg = `Starting scanner (attempt ${retryCount}/${maxRetries})...`;
        setTimeout(() => {
          if (!isDestroyed) {
            startScanner();
          }
        }, 1000 * retryCount); // Exponential backoff
      } else {
        errorMsg = `Scanner error: ${err.message || 'Unable to start camera'}`;
        if (err.name === 'NotAllowedError') {
          cameraPermission = 'denied';
        }
      }
    }
  }

  async function stopScanner(): Promise<void> {
    if (html5QrCode) {
      try {
        if (html5QrCode.isScanning) {
          await html5QrCode.stop();
        }
        await html5QrCode.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      html5QrCode = null;
    }
    isScanning = false;
  }

  async function handleCameraChange(event: Event): Promise<void> {
    if (isDestroyed) return;
    
    try {
      const id = (event.target as HTMLSelectElement).value;
      cameraId = id;
      if (isScanning) {
        await stopScanner();
        await startScanner();
      }
    } catch (err) {
      console.error('Error changing camera:', err);
      errorMsg = "Failed to switch camera. Please try again.";
    }
  }

  function processQRCode(qrContent: string): void {
    try {
      console.log('Processing QR code securely...', qrContent.substring(0, 10) + '...');
      // Add your QR code processing logic here
    } catch (err) {
      console.error('Error processing QR code:', err);
    }
  }

  function clearHistory(): void {
    scanHistory = [];
  }

  // Safe initialization
  async function initializeScanner(): Promise<void> {
    if (isDestroyed || isInitialized) return;
    
    try {
      // Check browser environment
      if (typeof window === 'undefined') {
        throw new Error('Not running in browser environment');
      }
      
      isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
      isSecureContext = window.isSecureContext || 
                       location.hostname === 'localhost' || 
                       location.hostname === '127.0.0.1' ||
                       location.protocol === 'https:';
      browserSupported = checkMediaDevicesSupport() || !!getLegacyGetUserMedia();
      
      const permissionState = await checkCameraPermission();
      if (permissionState === 'granted') {
        cameraPermission = 'granted';
      }
      
      isInitialized = true;
      
      // Only auto-start if everything is supported
      if (isSecureContext && browserSupported && !isDestroyed) {
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
          if (!isDestroyed) {
            startScanner();
          }
        }, 100);
      } else {
        cameraPermission = 'denied';
      }
    } catch (err) {
      console.error('Initialization error:', err);
      errorMsg = `Initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      isInitialized = true; // Mark as initialized even if failed to prevent retry loops
    }
  }

  onMount(() => {
    initializeScanner();
  });

  onDestroy(() => {
    isDestroyed = true;
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
    stopScanner();
  });

  // Computed properties with safe defaults
  $: canScan = isInitialized && isSecureContext && browserSupported && cameraPermission === 'granted';
  $: hasIssues = isInitialized && (!isSecureContext || !browserSupported || errorMsg !== "");
</script>

<svelte:head>
  <title>Library Visit Scanner | i/Kalibro Library</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
</svelte:head>

<Layout>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-4 py-6">
      <div class="max-w-7xl mx-auto">
        <div class="text-center">
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">QR Scanner</h1>
          <p class="text-gray-600 text-sm sm:text-base">
            {hasIssues ? 'Scanner requirements not met' : 'Position QR code within the frame to scan'}
          </p>
        </div>
      </div>
    </div>

    <div class="px-4 py-6">
      {#if !isInitialized}
        <!-- Loading State -->
        <div class="max-w-2xl mx-auto">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div class="text-center">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <svg class="w-8 h-8 text-slate-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 class="text-lg font-medium text-slate-900 mb-2">Initializing Scanner...</h3>
              <p class="text-gray-600">Please wait while we prepare the QR scanner.</p>
            </div>
          </div>
        </div>
      {:else if hasIssues}
        <!-- Error State Layout - Single Column Centered -->
        <div class="max-w-2xl mx-auto">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <!-- System Requirements Check -->
            <div class="text-center mb-8">
              <div class="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-4">QR Scanner Not Available</h2>
              <p class="text-gray-600 mb-8">Your current setup doesn't support QR code scanning. Here's what we found:</p>
            </div>

            <!-- Requirements List -->
            <div class="space-y-4 mb-8">
              <!-- HTTPS Check -->
              <div class="flex items-center gap-4 p-4 rounded-lg border {isSecureContext ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
                <div class="flex-shrink-0">
                  {#if isSecureContext}
                    <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                  {:else}
                    <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                  {/if}
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold {isSecureContext ? 'text-green-800' : 'text-red-800'}">Secure Connection (HTTPS)</h3>
                  <p class="text-sm {isSecureContext ? 'text-green-700' : 'text-red-700'}">
                    {isSecureContext ? 'Your connection is secure' : 'Camera access requires a secure HTTPS connection'}
                  </p>
                </div>
              </div>

              <!-- Browser Support Check -->
              <div class="flex items-center gap-4 p-4 rounded-lg border {browserSupported ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
                <div class="flex-shrink-0">
                  {#if browserSupported}
                    <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                  {:else}
                    <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                  {/if}
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold {browserSupported ? 'text-green-800' : 'text-red-800'}">Browser Support</h3>
                  <p class="text-sm {browserSupported ? 'text-green-700' : 'text-red-700'}">
                    {browserSupported ? 'Your browser supports camera access' : 'Your browser doesn\'t support camera access. Try Chrome, Firefox, or Safari.'}
                  </p>
                </div>
              </div>
            </div>

            <!-- Error Message -->
            {#if errorMsg}
              <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 text-sm">
                <div class="flex items-center gap-2">
                  <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              </div>
            {/if}

            <!-- Solutions -->
            <div class="text-center">
              <h3 class="font-semibold text-gray-900 mb-3">What can I do?</h3>
              <div class="text-sm text-gray-600 space-y-2">
                {#if !isSecureContext}
                  <p>• Access this page using HTTPS (secure connection)</p>
                {/if}
                {#if !browserSupported}
                  <p>• Use a modern browser like Chrome, Firefox, or Safari</p>
                  <p>• Update your current browser to the latest version</p>
                {/if}
                <p>• Try refreshing the page after making changes</p>
                <p>• Contact your system administrator if issues persist</p>
              </div>
              
              <!-- Retry Button -->
              {#if errorMsg && retryCount < maxRetries}
                <button
                  class="mt-4 px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors duration-200"
                  on:click={() => {
                    errorMsg = "";
                    startScanner();
                  }}
                >
                  Try Again
                </button>
              {/if}
            </div>
          </div>
        </div>

      {:else}
        <!-- Working State Layout - Scanner + History Side by Side -->
        <div class="max-w-7xl mx-auto">
          <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <!-- Scanner Section - Takes most space -->
            <div class="xl:col-span-3">
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <!-- Camera Selection -->
                {#if cameras.length > 1}
                  <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Select Camera</label>
                    <div class="relative w-full max-w-xs">
                      <select
                        class="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm bg-white pr-10 cursor-pointer transition-all"
                        on:change={handleCameraChange}
                        bind:value={cameraId}
                        disabled={!isScanning && cameraPermission !== 'granted'}
                      >
                        {#each cameras as cam}
                          <option value={cam.id}>{cam.label}</option>
                        {/each}
                      </select>
                      <!-- Custom dropdown arrow -->
                      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg class="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                {/if}

                <!-- Scanner Display -->
                {#if cameraPermission === 'pending' || cameraPermission === 'denied'}
                  <div class="text-center py-16 px-4">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                      <svg class="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 class="text-lg font-medium text-slate-900 mb-2">Camera Access Required</h3>
                    <p class="text-gray-600 mb-6 max-w-sm mx-auto">
                      Please allow camera access to start scanning QR codes.
                    </p>
                    <button
                      class="px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      on:click={requestCameraPermission}
                      disabled={cameraPermission === 'checking'}
                    >
                      {cameraPermission === 'checking' ? 'Requesting...' : 'Allow Camera Access'}
                    </button>
                  </div>
                {:else}
                  <div class="relative flex flex-col items-center justify-center">
                    <!-- Scanning indicator moved above the camera view -->
                    {#if isScanning && !scanResult}
                      <div class="w-full flex justify-center mb-4">
                        <div class="bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium text-center">
                          <div class="flex items-center justify-center gap-2">
                            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            Scanning for QR codes...
                          </div>
                        </div>
                      </div>
                    {/if}

                    <div
                      id="qr-reader"
                      class="rounded-lg bg-slate-100 overflow-hidden"
                      style="width: 100%; max-width: 500px; aspect-ratio: 1 / 1;"
                    ></div>

                    <!-- Scan Success Overlay (centered, but smaller and less opaque) -->
                    {#if scanResult}
                      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg pointer-events-none">
                        <div class="bg-white p-4 rounded-lg shadow-lg text-center max-w-xs mx-2">
                          <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                          </div>
                          <h3 class="text-base font-semibold text-gray-900 mb-1">QR Code Scanned!</h3>
                          <p class="text-xs text-gray-600">Visit recorded at {new Date().toLocaleTimeString()}</p>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>

            <!-- History Sidebar - Fixed width -->
            <div class="xl:col-span-1">
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-slate-900">Recent Scans</h3>
                  {#if scanHistory.length > 0}
                    <button
                      class="text-sm text-gray-500 hover:text-red-600 transition-colors"
                      on:click={clearHistory}
                    >
                      Clear
                    </button>
                  {/if}
                </div>

                <div class="space-y-3 max-h-[500px] overflow-y-auto">
                  {#each scanHistory.slice().reverse() as entry}
                    <div class="p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div class="flex items-center justify-between mb-2">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
                          </svg>
                          Scanned
                        </span>
                        <span class="text-xs text-gray-500">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div class="text-sm text-gray-700 font-medium break-all">
                        {entry.text}
                      </div>
                      <div class="text-xs text-gray-500 mt-1">
                        {entry.timestamp.toLocaleDateString()}
                      </div>
                    </div>
                  {:else}
                    <div class="text-center py-8 text-gray-500">
                      <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01m-5.01 0H12m0 0V9.01M12 20v.01" />
                      </svg>
                      <p class="text-sm">No QR codes scanned yet</p>
                      <p class="text-xs mt-1">Position a QR code in front of your camera</p>
                    </div>
                  {/each}
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
  :global(#qr-reader) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    max-width: 500px !important;
    aspect-ratio: 1 / 1 !important;
    min-width: 250px !important;
    min-height: 250px !important;
    background: #f1f5f9 !important;
    position: relative;
  }

  :global(#qr-reader > div) {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
  }

  :global(#qr-reader video) {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    border-radius: 0.5rem !important;
    aspect-ratio: 1 / 1 !important;
  }

  :global(#qr-reader canvas) {
    max-width: 100% !important;
    height: auto !important;
    aspect-ratio: 1 / 1 !important;
  }

  @media (max-width: 768px) {
    :global(#qr-reader) {
      max-width: 350px !important;
      min-width: 200px !important;
      min-height: 200px !important;
    }
    :global(#qr-reader video) {
      max-width: 350px !important;
      min-width: 200px !important;
      min-height: 200px !important;
    }
  }

  /* Additional styles for better error handling */
  :global(#qr-reader .qr-reader-error) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: #f8fafc;
    color: #64748b;
    font-size: 14px;
    text-align: center;
    padding: 20px;
  }
</style>