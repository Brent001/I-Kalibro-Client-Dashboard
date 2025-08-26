<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Layout from "$lib/components/ui/layout.svelte";
  
  let errorMsg = "";
  let scanResult: string | null = null;
  let isScanning = false;
  let html5QrCode: any = null;
  let cameraPermission: 'granted' | 'denied' | 'pending' | 'checking' = 'pending';
  let cameraId: string | null = null;
  let cameras: Array<{ id: string; label: string }> = [];
  let isMobile = false;
  let permissionRequested = false;
  let scanHistory: Array<{text: string, timestamp: Date, type: 'time-in' | 'time-out'}> = [];

  function isAndroid() {
    return /android/i.test(navigator.userAgent);
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  // Dynamically import html5-qrcode
  async function loadHtml5Qrcode() {
    // @ts-ignore
    const { Html5Qrcode } = await import("html5-qrcode");
    return Html5Qrcode;
  }

  function checkMediaDevicesSupport() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  function getLegacyGetUserMedia() {
    // Fallback for older browsers
    return (
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia
    );
  }

  async function checkCameraPermission() {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return result.state;
      }
      return 'prompt';
    } catch (err) {
      return 'prompt';
    }
  }

  async function requestCameraPermission() {
    if (permissionRequested) return cameraPermission === 'granted';
    
    cameraPermission = 'checking';
    errorMsg = "";
    permissionRequested = true;

    // Check if running on HTTPS or localhost
    const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecureContext) {
      cameraPermission = 'denied';
      errorMsg = "Camera access requires HTTPS. Please use a secure connection.";
      return false;
    }

    // Check if mediaDevices is supported
    if (!checkMediaDevicesSupport()) {
      const legacyGetUserMedia = getLegacyGetUserMedia();
      if (!legacyGetUserMedia) {
        cameraPermission = 'denied';
        errorMsg = "Camera access is not supported in this browser. Please try a modern browser like Chrome, Firefox, or Safari.";
        return false;
      }
    }

    try {
      // For mobile devices, be more explicit about camera access
      const constraints = {
        video: {
          facingMode: isMobile ? 'environment' : 'user', // Use back camera on mobile
          width: { ideal: isMobile ? 1280 : 640 },
          height: { ideal: isMobile ? 720 : 480 }
        }
      };

      let stream;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        // Fallback for older browsers
        const legacyGetUserMedia = getLegacyGetUserMedia();
        stream = await new Promise((resolve, reject) => {
          legacyGetUserMedia.call(navigator, constraints, resolve, reject);
        });
      }
      
      // Stop the stream immediately as we just needed permission
      if (stream && stream.getTracks) {
        stream.getTracks().forEach(track => track.stop());
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
        errorMsg = "Camera access is not supported on this browser. Try Chrome, Firefox, or Safari.";
      } else if (err.name === 'NotReadableError') {
        errorMsg = "Camera is already in use by another application.";
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = "Camera constraints cannot be satisfied. Try refreshing the page.";
      } else {
        errorMsg = `Camera error: ${err.message || 'Unknown camera error'}`;
      }
      return false;
    }
  }

  async function getCameraDevices() {
    try {
      const Html5Qrcode = await loadHtml5Qrcode();
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        throw new Error("No camera devices found");
      }
      
      cameras = devices.map((d: any) => ({ 
        id: d.id, 
        label: d.label || `Camera ${d.id ? d.id.substring(0, 8) + '...' : 'Unknown'}` 
      }));
      
      // Prefer back camera on mobile
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

  async function startScanner() {
    if (cameraPermission !== 'granted') {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;
    }

    errorMsg = "";
    isScanning = true;

    try {
      const Html5Qrcode = await loadHtml5Qrcode();
      html5QrCode = new Html5Qrcode("qr-reader");
      
      await getCameraDevices();
      
      if (!cameraId) {
        throw new Error("No camera available");
      }

      const config = {
        fps: isMobile ? 8 : 10,
        qrbox: function(viewfinderWidth: number, viewfinderHeight: number) {
          const minEdgePercentage = 0.6;
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
          scanResult = decodedText;
          const isTimeOut = decodedText.toLowerCase().includes('out') || 
                           decodedText.toLowerCase().includes('exit') ||
                           scanHistory.length > 0 && scanHistory[scanHistory.length - 1].type === 'time-in';
          
          scanHistory = [...scanHistory, {
            text: decodedText,
            timestamp: new Date(),
            type: isTimeOut ? 'time-out' : 'time-in'
          }];
          
          stopScanner();
        },
        (error: string) => {
          // Ignore frequent scan errors
        }
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      errorMsg = `Scanner error: ${err.message || 'Unable to start camera'}`;
      isScanning = false;
      cameraPermission = 'denied';
    }
  }

  async function stopScanner() {
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

  function handleCameraChange(event: Event) {
    const id = (event.target as HTMLSelectElement).value;
    cameraId = id;
    if (isScanning) {
      stopScanner().then(startScanner);
    }
  }

  function handleRescan() {
    scanResult = null;
    startScanner();
  }

  function clearHistory() {
    scanHistory = [];
  }

  onMount(async () => {
    isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
    
    // Check initial permission state
    const permissionState = await checkCameraPermission();
    if (permissionState === 'granted') {
      cameraPermission = 'granted';
      startScanner();
    }
  });

  onDestroy(() => {
    stopScanner();
  });
</script>

<svelte:head>
  <title>Library Visit Scanner | i/Kalibro Library</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
</svelte:head>

<Layout>
  <div class="min-h-screen bg-gray-50 py-4 px-3 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-6">
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Library Visit Scanner</h1>
        <p class="text-gray-600 text-sm sm:text-base">Scan QR codes for time-in and time-out tracking</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Scanner Section -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <!-- Scanner Controls -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-slate-100 rounded-lg">
                  <svg class="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01m-5.01 0H12m0 0V9.01M12 20v.01" />
                  </svg>
                </div>
                <div>
                  <h2 class="font-semibold text-slate-900">QR Scanner</h2>
                  <p class="text-sm text-gray-500">Position QR code within the frame</p>
                </div>
              </div>
              
              <div class="flex items-center gap-2 w-full sm:w-auto">
                {#if cameras.length > 1}
                  <select
                    class="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm bg-white"
                    on:change={handleCameraChange}
                    bind:value={cameraId}
                    disabled={!cameraPermission || isScanning}
                  >
                    {#each cameras as cam}
                      <option value={cam.id}>{cam.label}</option>
                    {/each}
                  </select>
                {/if}
                
                <button
                  class="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors duration-200 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  on:click={handleRescan}
                  disabled={isScanning && cameraPermission !== 'granted'}
                >
                  {#if isScanning}
                    Scanning...
                  {:else if scanResult}
                    Scan Again
                  {:else}
                    Start Scan
                  {/if}
                </button>
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

            <!-- Camera Permission Request -->
            {#if cameraPermission === 'pending' || cameraPermission === 'denied'}
              <div class="text-center py-12 px-4">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                  <svg class="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 class="text-lg font-medium text-slate-900 mb-2">Camera Access Required</h3>
                <p class="text-gray-600 mb-6 max-w-sm mx-auto">
                  To scan QR codes, please allow camera access when prompted by your browser.
                </p>
                {#if !checkMediaDevicesSupport()}
                  <div class="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 text-sm">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                      <span>This browser may not support camera access. Please try Chrome, Firefox, or Safari.</span>
                    </div>
                  </div>
                {/if}
                {#if !window.isSecureContext && location.hostname !== 'localhost'}
                  <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd" />
                      </svg>
                      <span>HTTPS is required for camera access. Please use a secure connection.</span>
                    </div>
                  </div>
                {/if}
                <button
                  class="px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  on:click={requestCameraPermission}
                  disabled={cameraPermission === 'checking' || !checkMediaDevicesSupport() || (!window.isSecureContext && location.hostname !== 'localhost')}
                >
                  {cameraPermission === 'checking' ? 'Requesting...' : 'Allow Camera Access'}
                </button>
              </div>
            {:else}
              <!-- Scanner Display -->
              <div class="relative">
                <div
                  id="qr-reader"
                  class="w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden"
                  style="height: {isMobile ? '280px' : '320px'}; min-height: 250px;"
                ></div>
                
                {#if isScanning}
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div class="bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm font-medium">
                      Scanning for QR codes...
                    </div>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Scan Result -->
            {#if scanResult}
              <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex items-center gap-2 mb-2">
                  <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <span class="font-semibold text-green-800">QR Code Scanned Successfully!</span>
                </div>
                <div class="bg-white p-3 rounded border border-green-200 font-mono text-sm text-slate-900 break-all">
                  {scanResult}
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Visit History Sidebar -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-slate-900">Visit History</h3>
              {#if scanHistory.length > 0}
                <button
                  class="text-sm text-gray-500 hover:text-red-600 transition-colors"
                  on:click={clearHistory}
                >
                  Clear
                </button>
              {/if}
            </div>

            <div class="space-y-3 max-h-96 overflow-y-auto">
              {#each scanHistory.slice().reverse() as entry, i}
                <div class="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div class="flex items-center justify-between mb-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {entry.type === 'time-in' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}">
                      {entry.type === 'time-in' ? 'Time In' : 'Time Out'}
                    </span>
                    <span class="text-xs text-gray-500">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div class="text-sm font-mono text-gray-700 break-all">
                    {entry.text.length > 30 ? `${entry.text.substring(0, 30)}...` : entry.text}
                  </div>
                </div>
              {:else}
                <div class="text-center py-6 text-gray-500">
                  <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-sm">No scans yet</p>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</Layout>

<style>
  /* Enhanced mobile responsiveness */
  :global(#qr-reader) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  :global(#qr-reader > div) {
    width: 100% !important;
    max-width: 100% !important;
  }

  :global(#qr-reader video) {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    border-radius: 0.5rem !important;
  }

  :global(#qr-reader canvas) {
    max-width: 100% !important;
    height: auto !important;
  }

  @media (max-width: 768px) {
    :global(#qr-reader) {
      height: 280px !important;
    }
    
    :global(#qr-reader video) {
      height: 280px !important;
    }
  }

  @media (max-width: 640px) {
    :global(#qr-reader) {
      height: 250px !important;
    }
    
    :global(#qr-reader video) {
      height: 250px !important;
    }
  }
</style>