<script>
  import { onMount, onDestroy } from 'svelte';
  import * as faceapi from '@vladmandic/face-api';

  let { onBack } = $props();

  let videoEl = $state(null);
  let canvasEl = $state(null);
  let stream = $state(null);
  let animationFrameId = null;
  let modelsLoaded = $state(false);
  let isActive = $state(false);
  let faceCount = $state(0);
  let loadingMessage = $state('Loading face detection models...');
  let errorMessage = $state(null);

  // Status: 'loading' | 'ready' | 'active' | 'error'
  let status = $state('loading');

  const MODEL_URL = '/face-api-models';

  async function loadModels() {
    try {
      loadingMessage = 'Loading face detection models...';
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
      runDetectionLoop();
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
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
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

  function drawDetections(detections) {
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    detections.forEach(det => {
      const { x: rawX, y, width, height } = det.box;
      // Mirror x to match the CSS-flipped video (canvas itself is not flipped)
      const x = canvasEl.width - rawX - width;
      const score = Math.round(det.score * 100);
      const bracketLen = Math.min(width, height) * 0.18;

      // Semi-transparent fill
      ctx.fillStyle = 'rgba(26, 188, 156, 0.08)';
      ctx.fillRect(x, y, width, height);

      // Main border
      ctx.strokeStyle = '#1abc9c';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);

      // Corner brackets (solid, thicker)
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

      // Label background
      const label = `Face  ${score}%`;
      ctx.font = 'bold 13px Inter, sans-serif';
      const textW = ctx.measureText(label).width + 14;
      ctx.fillStyle = '#1abc9c';
      ctx.beginPath();
      ctx.roundRect(x, y - 26, textW, 22, 4);
      ctx.fill();

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 7, y - 9);
    });
  }

  function runDetectionLoop() {
    const detect = async () => {
      if (!isActive || !videoEl || videoEl.readyState < 2) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }

      // Sync canvas intrinsic size to video
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

      animationFrameId = requestAnimationFrame(detect);
    };
    animationFrameId = requestAnimationFrame(detect);
  }

  onMount(async () => {
    await loadModels();
    await startCamera();
  });

  onDestroy(() => {
    stopCamera();
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-aero-bg via-white to-aero-bg flex flex-col">
  <!-- Header -->
  <header class="bg-white shadow-md border-b-4 border-aero-teal">
    <div class="container mx-auto px-4 py-3 flex items-center gap-3">
      <button
        onclick={onBack}
        class="flex items-center gap-2 px-4 py-2 rounded-full border border-aero-teal text-aero-teal font-semibold text-sm hover:bg-aero-teal hover:text-white transition-colors"
      >
        ← Back
      </button>
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 bg-gradient-to-br from-aero-teal to-aero-dark rounded-full flex items-center justify-center">
          <span class="text-white text-lg font-bold">✈</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-aero-teal to-aero-dark">
          AeroSwift AI — Webcam Demo
        </h1>
      </div>
      <div class="ml-auto flex items-center gap-2">
        {#if status === 'active'}
          <div class="w-3 h-3 bg-aero-teal rounded-full animate-pulse"></div>
          <span class="text-sm font-medium text-gray-600">Live</span>
        {/if}
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 container mx-auto px-4 py-6 flex flex-col items-center gap-6 max-w-3xl">

    <!-- Camera Card -->
    <div class="w-full rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white">
      <!-- Card Header -->
      <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full {status === 'active' ? 'bg-white animate-pulse' : 'bg-white/40'}"></div>
          <span class="text-white font-semibold text-sm tracking-wide">WEBCAM FEED</span>
        </div>
        <div class="flex items-center gap-3">
          {#if status === 'active'}
            <span class="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium">
              {faceCount === 0 ? 'No faces' : faceCount === 1 ? '1 face detected' : `${faceCount} faces detected`}
            </span>
          {/if}
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold
            {status === 'active' ? 'bg-green-400 text-white' :
             status === 'error' ? 'bg-red-400 text-white' :
             status === 'loading' ? 'bg-yellow-300 text-gray-800' :
             'bg-white/20 text-white'}">
            {status === 'active' ? 'Active' :
             status === 'error' ? 'Error' :
             status === 'loading' ? 'Loading' : 'Ready'}
          </span>
        </div>
      </div>

      <!-- Video + Canvas area -->
      <div class="relative bg-gray-950 w-full" style="aspect-ratio: 4/3;">
        <!-- Corner decorations (always visible) -->
        <div class="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-aero-teal/60 z-10"></div>
        <div class="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-aero-teal/60 z-10"></div>
        <div class="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-aero-teal/60 z-10"></div>
        <div class="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-aero-teal/60 z-10"></div>

        <!-- Video element — always in the DOM so bind:this is stable -->
        <video
          bind:this={videoEl}
          autoplay
          playsinline
          muted
          class="absolute inset-0 w-full h-full object-cover"
          style="transform: scaleX(-1); opacity: {status === 'active' ? 1 : 0};"
        ></video>

        <!-- Canvas overlay — always in the DOM, not CSS-mirrored so text renders correctly -->
        <canvas
          bind:this={canvasEl}
          class="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style="opacity: {status === 'active' ? 1 : 0};"
        ></canvas>

        <!-- Placeholder overlay — shown when camera is not active -->
        {#if status !== 'active'}
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6 z-10">
            {#if status === 'loading'}
              <div class="w-12 h-12 border-4 border-aero-teal/30 border-t-aero-teal rounded-full animate-spin"></div>
              <p class="text-gray-400 text-sm">{loadingMessage}</p>
            {:else if status === 'error'}
              <div class="text-red-400 text-4xl">⚠</div>
              <p class="text-red-400 text-sm">{errorMessage}</p>
              {#if modelsLoaded}
                <button
                  onclick={startCamera}
                  class="px-6 py-2 bg-aero-teal text-white font-semibold rounded-full hover:bg-aero-dark transition-colors text-sm"
                >
                  Retry
                </button>
              {/if}
            {:else}
              <div class="text-aero-teal/40 text-6xl">◎</div>
              <p class="text-gray-400 text-sm">Click "Start Camera" to begin face detection</p>
            {/if}
          </div>
        {/if}

        <!-- Scanning line animation -->
        {#if status === 'active'}
          <div class="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-aero-teal to-transparent opacity-60 z-10"
            style="animation: scan 3s ease-in-out infinite; top: 0;">
          </div>
        {/if}

        <!-- Face-detected glow border -->
        {#if faceCount > 0 && status === 'active'}
          <div class="absolute inset-0 border-2 border-aero-teal pointer-events-none animate-pulse z-20"></div>
        {/if}
      </div>

      <!-- Card Footer -->
      <div class="px-4 py-3 flex items-center justify-between bg-gray-50 border-t border-gray-100">
        <div class="flex gap-2">
          {#if status === 'ready' || status === 'error'}
            <button
              onclick={startCamera}
              disabled={!modelsLoaded}
              class="px-5 py-2 bg-gradient-to-r from-aero-teal to-aero-dark text-white font-semibold rounded-full shadow hover:opacity-90 transition-opacity text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Camera
            </button>
          {:else if status === 'active'}
            <button
              onclick={stopCamera}
              class="px-5 py-2 bg-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-300 transition-colors text-sm"
            >
              Stop Camera
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Info card -->
    <div class="w-full rounded-xl border border-aero-teal/30 bg-aero-teal/5 px-5 py-4">
      <h3 class="text-sm font-semibold text-aero-dark mb-1">About this demo</h3>
      <p class="text-xs text-gray-500 leading-relaxed">
        This page uses your browser's webcam and runs face detection entirely on-device. 
        No frames are sent to any server.
        Detected faces are outlined with bounding boxes in real time.
      </p>
    </div>
  </main>
</div>

<style>
  @keyframes scan {
    0%   { top: 0%; opacity: 0; }
    10%  { opacity: 0.6; }
    90%  { opacity: 0.6; }
    100% { top: 100%; opacity: 0; }
  }
</style>
