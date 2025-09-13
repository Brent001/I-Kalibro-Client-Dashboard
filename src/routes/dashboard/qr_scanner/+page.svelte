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
  let scanHistory: Array<{text: string, timestamp: Date}> = [];
  let scanResult: string | null = null;
  let errorMsg = "";
  let cameraPermission: 'granted' | 'denied' | 'pending' | 'checking' = 'pending';
  let isStopping = false;
  
  // Add processing state to prevent duplicate scans
  let isProcessing = false;
  let processingQrCode: string | null = null;
  let lastProcessedTime = 0;

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
      stream.getTracks().forEach(track => track.stop()); // Stop test stream
      
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
      
      // Smart camera selection based on server-side device detection
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
      
      // Reset processing state when starting scanner
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
          // Enhanced duplicate prevention
          const now = Date.now();
          
          // Prevent processing the same QR code multiple times in quick succession
          if (isProcessing || 
              (processingQrCode === decodedText && now - lastProcessedTime < 5000)) {
            return;
          }
          
          // Set processing state immediately
          isProcessing = true;
          processingQrCode = decodedText;
          lastProcessedTime = now;
          
          try {
            await processQRCode(decodedText);
            // Stop scanner after successful scan and processing
            await stopScanner();
          } catch (error) {
            console.error('Error processing QR code:', error);
            // Reset processing state on error so user can try again
            isProcessing = false;
            processingQrCode = null;
          }
        },
        () => {} // Error callback - do nothing for scan errors
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
        errorMsg = 'Error stopping scanner: ' + (err?.message || err);
        console.error('Error stopping scanner:', err);
      }
      // Extra: Stop all video tracks to turn off webcam light
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

  async function processQRCode(content: string) {
    try {
      errorMsg = "";

      // Enhanced duplicate prevention with shorter cooldown for different QR codes
      const now = new Date();
      const cooldownMs = 2 * 60 * 1000;
      const recentScan = scanHistory.find(
        entry => entry.text === content && now.getTime() - entry.timestamp.getTime() < cooldownMs
      );
      
      if (recentScan) {
        errorMsg = "This QR code was already scanned recently.";
        isProcessing = false;
        processingQrCode = null;
        setTimeout(() => {
          errorMsg = "";
          // Resume scanning after error disappears
          isProcessing = false;
          processingQrCode = null;
        }, 10000);
        return;
      }

      // 1. Validate QR code
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
          // Resume scanning after error disappears
          isProcessing = false;
          processingQrCode = null;
        }, 10000);
        return;
      }

      // 2. Save time in with user info
      const saveRes = await fetch('/api/process-qr/db_save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'time_in',
          username: user.username,
          fullName: user.name
        })
      });
      const saveData = await saveRes.json();

      if (!saveRes.ok || !saveData.success) {
        errorMsg = saveData.error || saveData.message || "Failed to save time in";
        return;
      }

      // Success - update UI and history
      scanResult = content;
      scanHistory = [
        { text: content, timestamp: now },
        ...scanHistory
      ];
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        scanResult = null;
        isProcessing = false;
        processingQrCode = null;
      }, 3000);
      
    } catch (error) {
      console.error('Error in processQRCode:', error);
      errorMsg = "An error occurred while processing the QR code";
      isProcessing = false;
      processingQrCode = null;
    }
  }

  function clearHistory() {
    scanHistory = [];
  }

  // Enhanced cleanup function
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

  // Handle page visibility changes and navigation
  function handleVisibilityChange() {
    if (document.hidden && isScanning) {
      cleanup();
    }
  }

  function handleBeforeUnload() {
    cleanup();
  }

  onMount(() => {
    // Auto-start if everything is ready
    if (!hasRequirementErrors && scanner.capabilities.supportsCamera) {
      requestCameraAccess();
    }

    // Add event listeners for cleanup
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    // Stop camera when navigating away from this page
    afterNavigate((nav) => {
      if (nav.from?.url.pathname === '/dashboard/qr_scanner' && nav.to?.url.pathname !== '/dashboard/qr_scanner') {
        cleanup();
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-4 py-6">
      <div class="max-w-7xl mx-auto text-center">
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          QR Scanner
        </h1>
        <p class="text-gray-600 text-sm sm:text-base">
          Welcome, {user.name}
        </p>
      </div>
    </div>

    <div class="px-4 py-6">
      {#if hasRequirementErrors}
        <!-- Requirements Error -->
        <div class="max-w-2xl mx-auto">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div class="text-center">
              <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M6 9l6-6 6 6" />
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-4">QR Scanner Not Available</h2>
              
              {#if scanner.errors.httpsRequired}
                <p class="text-red-600 mb-4">{scanner.errors.httpsRequired}</p>
              {/if}
              
              {#if scanner.errors.unsupportedBrowser}
                <p class="text-red-600 mb-4">{scanner.errors.unsupportedBrowser}</p>
              {/if}
              
              <button 
                class="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                on:click={() => window.location.reload()}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>

      {:else if cameraPermission === 'pending'}
        <!-- Permission Request -->
        <div class="max-w-2xl mx-auto">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div class="text-center">
              <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-4">Camera Access Required</h2>
              <p class="text-gray-600 mb-6">
                We need camera access to scan QR codes. Click below to grant permission.
              </p>
              
              <button
                class="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                on:click={startScanner}
                disabled={cameraPermission === 'checking'}
              >
                {cameraPermission === 'checking' ? 'Requesting Access...' : 'Allow Camera Access'}
              </button>
            </div>
          </div>
        </div>

      {:else}
        <!-- Scanner Interface -->
        <div class="max-w-2xl mx-auto">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            
            <!-- Camera Selection -->
            {#if cameras.length > 1}
              <div class="mb-6">
                <label for="camera-select" class="block text-sm font-medium text-gray-700 mb-2">Select Camera</label>
                <select
                  id="camera-select"
                  class="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                  on:change={handleCameraChange}
                  bind:value={cameraId}
                >
                  {#each cameras as cam}
                    <option value={cam.id}>{cam.label}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <!-- Error Display -->
            {#if errorMsg}
              <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 text-sm">
                {errorMsg}
              </div>
            {/if}

            <!-- Scanner Status -->
            {#if isScanning && !errorMsg}
              <div class="w-full flex justify-center mb-4">
                <div class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-green-200 rounded-full animate-pulse"></div>
                    {#if isProcessing}
                      Processing QR code...
                    {:else}
                      Scanning for QR codes...
                    {/if}
                  </div>
                </div>
              </div>
            {:else if !isScanning && cameraPermission === 'granted'}
              <div class="w-full flex justify-center mb-4">
                <button
                  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  on:click={startScanner}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Start Scanner'}
                </button>
              </div>
            {/if}

            <!-- QR Reader Container -->
            <div class="relative flex justify-center">
              <div
                id="qr-reader"
                class="rounded-lg bg-slate-100 overflow-hidden shadow-inner"
                style="width: 100%; max-width: 500px; aspect-ratio: 1 / 1;"
              ></div>

              <!-- Processing Overlay -->
              {#if isProcessing && !scanResult}
                <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg">
                  <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900">Processing...</h3>
                    <p class="text-sm text-gray-600">Please wait while we save your entry</p>
                  </div>
                </div>
              {/if}

              <!-- Success Overlay -->
              {#if scanResult}
                <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg">
                  <div class="bg-white p-6 rounded-lg shadow-xl text-center max-w-sm mx-4">
                    <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Success!</h3>
                    <p class="text-sm text-gray-600 break-all">QR Code: {scanResult}</p>
                    <p class="text-xs text-green-600 mt-2">Time in recorded successfully</p>
                  </div>
                </div>
              {/if}
            </div>

            <!-- Scanner Controls -->
            {#if isScanning}
              <div class="mt-4 flex justify-center">
                <button
                  class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-60"
                  on:click={stopScanner}
                  disabled={isStopping || isProcessing}
                >
                  {isStopping ? 'Stopping...' : isProcessing ? 'Processing...' : 'Stop Scanner'}
                </button>
              </div>
            {/if}
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
    background: #f1f5f9 !important;
    border: 2px dashed #cbd5e1;
  }

  :global(#qr-reader > div) {
    width: 100% !important;
    height: 100% !important;
    border-radius: 0.5rem !important;
  }

  :global(#qr-reader video) {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    border-radius: 0.5rem !important;
  }
</style>