<script>
  import { onMount, onDestroy } from 'svelte';
  import { APP_CONFIG, FACE_MATCH_REQUEST_TOPIC, FACE_SCAN_RESET_TOPIC } from './common/config';

  let { solaceClient, onMatchRequest, onMatchReset } = $props();

  let faceapi = null;

  let videoEl = $state(null);
  let canvasEl = $state(null);
  let stream = $state(null);
  let modelsLoaded = $state(false);
  let isActive = $state(false);
  let faceCount = $state(0);
  let publishedCount = $state(0);
  let loadingMessage = $state('Loading face detection models...');
  let errorMessage = $state(null);
  let status = $state('loading');

  let detectionIntervalId = null;
  let faceDetectionActive = true;
  const DETECTION_INTERVAL_MS = 500;
  const MODEL_URL = '/face-api-models';

  async function loadModels() {
    try {
      loadingMessage = 'Loading face detection models...';
      faceapi = await import('@vladmandic/face-api');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      modelsLoaded = true;
      loadingMessage = 'Starting camera...';
    } catch (err) {
      console.error('Failed to load face-api models:', err);
      errorMessage = 'Failed to load face detection models. Run npm run setup-faceapi first.';
      status = 'error';
    }
  }

  async function startCamera() {
    errorMessage = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      videoEl.srcObject = stream;
      await videoEl.play();
      isActive = true;
      status = 'active';
      startDetectionLoop();
    } catch (err) {
      console.error('Camera access error:', err);
      errorMessage = err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permissions and try again.'
        : 'Could not access webcam: ' + err.message;
      status = 'error';
    }
  }

  function stopCamera() {
    isActive = false;
    if (detectionIntervalId) {
      clearInterval(detectionIntervalId);
      detectionIntervalId = null;
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (videoEl) videoEl.srcObject = null;
    if (canvasEl) {
      canvasEl.getContext('2d').clearRect(0, 0, canvasEl.width, canvasEl.height);
    }
    faceCount = 0;
    status = 'ready';
  }

  function startDetectionLoop() {
    detectionIntervalId = setInterval(async () => {
      if (!isActive || !videoEl || videoEl.readyState < 2) return;

      if (canvasEl.width !== videoEl.videoWidth || canvasEl.height !== videoEl.videoHeight) {
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
      }

      const detections = await faceapi.detectAllFaces(
        videoEl,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
      );

      faceCount = detections.length;
      drawDetections(detections);

      if (detections.length > 0) {
        await captureAndPublish(detections);
      }
    }, DETECTION_INTERVAL_MS);
  }

  async function captureAndPublish(detections) {
    if (!videoEl || videoEl.videoWidth === 0) return;

    // Snapshot and close the gate synchronously before any async work so
    // subsequent intervals that fire before toBlob resolves cannot slip through.
    const sendMatchRequest = faceDetectionActive;
    faceDetectionActive = false;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = videoEl.videoWidth;
    captureCanvas.height = videoEl.videoHeight;
    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0);

    captureCanvas.toBlob(async (blob) => {
      if (!blob) return;
      const arrayBuffer = await blob.arrayBuffer();

      solaceClient.publishVideoFrame(APP_CONFIG.videoTopic, arrayBuffer);

      if (sendMatchRequest) {
        const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        solaceClient.publishControl(FACE_MATCH_REQUEST_TOPIC, {
          imageBase64,
          source: 'webcam',
          timestamp: new Date().toISOString()
        });
        onMatchRequest?.();
      }

      publishedCount++;
    }, 'image/jpeg', 0.85);
  }

  function drawDetections(detections) {
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    detections.forEach(det => {
      const { x: rawX, y, width, height } = det.box;
      // Mirror x to match the CSS-flipped video
      const x = canvasEl.width - rawX - width;
      const score = Math.round(det.score * 100);
      const bracketLen = Math.min(width, height) * 0.18;

      ctx.fillStyle = 'rgba(26, 188, 156, 0.08)';
      ctx.fillRect(x, y, width, height);

      ctx.strokeStyle = '#1abc9c';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);

      ctx.strokeStyle = '#1abc9c';
      ctx.lineWidth = 4;
      const corners = [
        [[x, y + bracketLen], [x, y], [x + bracketLen, y]],
        [[x + width - bracketLen, y], [x + width, y], [x + width, y + bracketLen]],
        [[x, y + height - bracketLen], [x, y + height], [x + bracketLen, y + height]],
        [[x + width - bracketLen, y + height], [x + width, y + height], [x + width, y + height - bracketLen]],
      ];
      corners.forEach(pts => {
        ctx.beginPath();
        ctx.moveTo(...pts[0]);
        ctx.lineTo(...pts[1]);
        ctx.lineTo(...pts[2]);
        ctx.stroke();
      });

      const label = `Face  ${score}%`;
      ctx.font = 'bold 13px Inter, sans-serif';
      const textW = ctx.measureText(label).width + 14;
      ctx.fillStyle = '#1abc9c';
      ctx.beginPath();
      ctx.roundRect(x, y - 26, textW, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 7, y - 9);
    });
  }

  onMount(async () => {
    solaceClient.subscribeToTopic(FACE_SCAN_RESET_TOPIC, (payload) => {
      if (payload?.reset === true) {
        faceDetectionActive = true;
        onMatchReset?.();
      }
    });
    await loadModels();
    await startCamera();
  });

  onDestroy(() => {
    stopCamera();
  });
</script>

<div class="relative">
  <div class="bg-white rounded-2xl shadow-xl overflow-hidden border-2 {faceCount > 0 && status === 'active' ? 'border-green-400' : 'border-aero-light/30'}">

    <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-display font-bold text-white">Webcam Feed</h2>
        {#if status === 'active'}
          <span class="text-sm text-white/80 font-mono">{APP_CONFIG.videoTopic}</span>
        {/if}
      </div>
      <div class="flex items-center gap-3">
        {#if status === 'active' && publishedCount > 0}
          <span class="text-xs text-white/70 font-mono">{publishedCount} frames sent</span>
        {/if}
        <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white flex items-center gap-1">
          {#if status === 'active'}
            <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Active
          {:else if status === 'error'}
            <span class="w-2 h-2 bg-red-400 rounded-full"></span>
            Error
          {:else if status === 'loading'}
            <span class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
            Loading
          {:else}
            <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
            Ready
          {/if}
        </span>
      </div>
    </div>

    <div class="aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">

      <video
        bind:this={videoEl}
        autoplay
        playsinline
        muted
        class="absolute inset-0 w-full h-full object-cover"
        style="transform: scaleX(-1); opacity: {status === 'active' ? 1 : 0};"
      ></video>

      <canvas
        bind:this={canvasEl}
        class="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style="opacity: {status === 'active' ? 1 : 0};"
      ></canvas>

      {#if status !== 'active'}
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center space-y-4">
            {#if status === 'loading'}
              <div class="w-16 h-16 mx-auto border-4 border-aero-teal/30 border-t-aero-teal rounded-full animate-spin"></div>
              <p class="text-gray-400 text-sm">{loadingMessage}</p>
            {:else if status === 'error'}
              <div class="w-24 h-24 mx-auto bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500/50">
                <svg class="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <p class="text-red-400 font-medium">{errorMessage}</p>
              {#if modelsLoaded}
                <button
                  onclick={startCamera}
                  class="px-6 py-2 bg-aero-teal text-white font-semibold rounded-full hover:bg-aero-dark transition-colors text-sm"
                >
                  Retry
                </button>
              {/if}
            {:else}
              <div class="w-24 h-24 mx-auto bg-aero-teal/20 rounded-full flex items-center justify-center border-2 border-aero-teal/50">
                <svg class="w-12 h-12 text-aero-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p class="text-aero-light font-medium text-lg">Ready</p>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Scanning animation -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-aero-teal to-transparent animate-pulse"></div>
      </div>

      <!-- Corner brackets -->
      <div class="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-aero-teal/60"></div>
      <div class="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-aero-teal/60"></div>
      <div class="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-aero-teal/60"></div>
      <div class="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-aero-teal/60"></div>

      <!-- Face detection glow -->
      {#if faceCount > 0 && status === 'active'}
        <div class="absolute inset-0 border-2 border-aero-teal pointer-events-none animate-pulse"></div>
      {/if}
    </div>
  </div>

  {#if faceCount > 0 && status === 'active'}
    <div class="absolute -inset-2 rounded-3xl border-8 border-green-400 animate-pulse pointer-events-none"></div>
  {/if}
</div>
