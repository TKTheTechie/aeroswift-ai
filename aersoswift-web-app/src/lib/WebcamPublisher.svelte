<script>
  import { onMount, onDestroy } from 'svelte';
  import { v4 as uuidv4 } from 'uuid';
  import QRCode from 'qrcode';
  import {
    APP_CONFIG, QDRANT_SERVICE_URL,
    FACE_MATCH_RESULT_TOPIC, FACE_MATCH_ERROR_TOPIC, FACE_SCAN_RESET_TOPIC,
    WEBCAM_SESSION_ID_ENABLED, DEMO_MODE,
    BOARDING_BOARDED_TOPIC, BOARDING_NOT_BOARDED_TOPIC
  } from './common/config';

  let { solaceClient, onMatchRequest, onMatchReset } = $props();

  let faceapi = null;

  const sessionId = WEBCAM_SESSION_ID_ENABLED ? uuidv4() : null;
  const sessionVideoTopic = sessionId ? `${APP_CONFIG.videoTopic}/${sessionId}` : APP_CONFIG.videoTopic;

  // Camera state
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
  let qrCodeDataUrl = $state(null);
  let jpegQuality = $state(0.5);
  let videoAspectRatio = $state(null);

  let detectionIntervalId = null;
  let faceDetectionActive = true;
  let framePublishInFlight = false;
  const DETECTION_INTERVAL_MS = 500;
  const MODEL_URL = '/face-api-models';

  // Boarding session state
  let scanState = $state('idle'); // 'idle' | 'scanning' | 'result'
  let countdownSeconds = $state(60);
  let boardedCount = $state(0);
  let notBoardedCount = $state(0);
  let floatingItems = $state([]);
  let countdownIntervalId = null;
  let boardingSubscriptionsActive = false;

  const boardingVerdict = $derived(
    boardedCount > notBoardedCount ? 'allow' :
    notBoardedCount > boardedCount ? 'deny' :
    'tie'
  );

  const countdownColor = $derived(
    countdownSeconds > 10 ? 'text-green-400 border-green-400' :
    countdownSeconds > 5  ? 'text-yellow-400 border-yellow-400' :
                            'text-red-400 border-red-400'
  );

  $effect(() => {
    if (faceCount > 0 && scanState === 'idle' && status === 'active') {
      startBoardingSession();
    }
  });

  function startBoardingSession() {
    scanState = 'scanning';
    countdownSeconds = 60;

    if (!DEMO_MODE) {
      solaceClient.subscribeToTopic(BOARDING_BOARDED_TOPIC, () => handleBoardingEvent('boarded'));
      solaceClient.subscribeToTopic(BOARDING_NOT_BOARDED_TOPIC, () => handleBoardingEvent('not-boarded'));
      boardingSubscriptionsActive = true;
    }

    countdownIntervalId = setInterval(() => {
      countdownSeconds--;
      if (countdownSeconds <= 0) {
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
        scanState = 'result';
      }
    }, 1000);
  }

  function handleBoardingEvent(type) {
    if (scanState !== 'scanning') return;
    if (type === 'boarded') {
      boardedCount++;
    } else {
      notBoardedCount++;
    }
    const id = Date.now() + Math.random();
    const x = 15 + Math.random() * 70;
    floatingItems = [...floatingItems, { id, type, x }];
    setTimeout(() => {
      floatingItems = floatingItems.filter(item => item.id !== id);
    }, 2000);
  }

  function resetBoardingSession() {
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
    if (boardingSubscriptionsActive) {
      solaceClient.unsubscribeFromTopic(BOARDING_BOARDED_TOPIC);
      solaceClient.unsubscribeFromTopic(BOARDING_NOT_BOARDED_TOPIC);
      boardingSubscriptionsActive = false;
    }
    scanState = 'idle';
    countdownSeconds = 60;
    boardedCount = 0;
    notBoardedCount = 0;
    floatingItems = [];
    solaceClient.publishControl(FACE_SCAN_RESET_TOPIC, { reset: true, timestamp: new Date().toISOString() });
  }

  function onBoardButtonClick(type) {
    if (DEMO_MODE) {
      handleBoardingEvent(type);
    } else {
      const topic = type === 'boarded' ? BOARDING_BOARDED_TOPIC : BOARDING_NOT_BOARDED_TOPIC;
      solaceClient.publishControl(topic, { type });
    }
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

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
      videoAspectRatio = videoEl.videoWidth / videoEl.videoHeight;
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
    if (framePublishInFlight) return;

    const sendMatchRequest = faceDetectionActive;
    faceDetectionActive = false;
    framePublishInFlight = true;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = videoEl.videoWidth;
    captureCanvas.height = videoEl.videoHeight;
    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0);

    captureCanvas.toBlob(async (blob) => {
      if (!blob) { framePublishInFlight = false; return; }
      const arrayBuffer = await blob.arrayBuffer();

      if (sendMatchRequest) {
        const imageBase64 = arrayBufferToBase64(arrayBuffer);
        onMatchRequest?.();
        try {
          const res = await fetch(`${QDRANT_SERVICE_URL}/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64 })
          });
          const data = await res.json();
          if (data.MATCH === false && data.confidence === 0) {
            solaceClient.publishControl(FACE_MATCH_ERROR_TOPIC, { error: 'Passenger Not Found' });
          } else {
            solaceClient.publishControl(FACE_MATCH_RESULT_TOPIC, data);
          }
        } catch (err) {
          console.error('Face match HTTP request failed:', err);
        }
      } else {
        solaceClient.publishVideoFrame(sessionVideoTopic, arrayBuffer);
      }

      framePublishInFlight = false;
      publishedCount++;
    }, 'image/jpeg', jpegQuality);
  }

  function drawDetections(detections) {
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    detections.forEach(det => {
      const { x: rawX, y, width, height } = det.box;
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

    const viewerUrl = sessionId
      ? `${window.location.origin}/VideoFeed?sessionId=${sessionId}`
      : `${window.location.origin}/VideoFeed`;
    qrCodeDataUrl = await QRCode.toDataURL(viewerUrl, { width: 300, margin: 1, color: { dark: '#0d3b34', light: '#ffffff' } });

    await loadModels();
    await startCamera();
  });

  onDestroy(() => {
    stopCamera();
    resetBoardingSession();
  });
</script>

<div class="h-full flex items-center justify-center gap-4">

  <!-- QR Code panel — left side -->
  {#if qrCodeDataUrl}
    <div class="shrink-0 self-center bg-white rounded-2xl shadow-xl border-2 border-aero-light/30 p-4 flex flex-col items-center gap-2">
      <p class="text-xs font-semibold text-aero-dark uppercase tracking-widest">Scan to Watch</p>
      <img src={qrCodeDataUrl} alt="QR code to view this feed" class="w-48 h-48 rounded-lg block" />
      <p class="text-[10px] text-gray-400 font-mono text-center">{sessionId ? `/VideoFeed?sessionId=${sessionId.slice(0, 8)}…` : '/VideoFeed'}</p>
    </div>
  {/if}

  <!-- Video Feed Card — square, height-constrained -->
  <div class="flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden border-2 {faceCount > 0 && status === 'active' ? 'border-green-400' : 'border-aero-light/30'} transition-colors duration-300" style="height: 100%; aspect-ratio: 1 / 1;">

    <!-- Header bar -->
    <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-4 py-2 flex items-center gap-3 min-w-0 shrink-0">
      <h2 class="text-base font-display font-bold text-white shrink-0">Webcam Feed</h2>
      <div class="flex items-center gap-2 ml-auto shrink-0">
        {#if status === 'active' && publishedCount > 0}
          <span class="text-xs text-white/70 font-mono shrink-0">{publishedCount} frames</span>
        {/if}
        <label for="jpeg-quality" class="text-xs text-white/70 font-mono shrink-0">Q: {Math.round(jpegQuality * 100)}%</label>
        <input
          id="jpeg-quality"
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          bind:value={jpegQuality}
          class="w-16 accent-aero-teal shrink-0"
        />
        <span class="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white flex items-center gap-1 shrink-0">
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

    <!-- Video area -->
    <div class="flex-1 min-h-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      <div class="absolute inset-0">

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

        <!-- NOT BOARD counter overlay (bottom-left) -->
        {#if scanState !== 'idle'}
          <div class="absolute bottom-12 left-4 z-10 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 text-center border border-red-500/40 transition-all duration-300">
            <div class="text-2xl font-bold text-red-400 font-mono leading-none">{notBoardedCount}</div>
            <div class="text-[9px] text-red-400/80 uppercase tracking-widest mt-0.5">NOT BOARD</div>
          </div>

          <!-- BOARD counter overlay (bottom-right) -->
          <div class="absolute bottom-12 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 text-center border border-green-500/40 transition-all duration-300">
            <div class="text-2xl font-bold text-green-400 font-mono leading-none">{boardedCount}</div>
            <div class="text-[9px] text-green-400/80 uppercase tracking-widest mt-0.5">BOARD</div>
          </div>
        {/if}

        <!-- Face detection glow -->
        {#if faceCount > 0 && status === 'active'}
          <div class="absolute inset-0 border-2 border-aero-teal pointer-events-none animate-pulse"></div>
        {/if}

        <!-- Countdown timer overlay -->
        {#if scanState === 'scanning'}
          <div class="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
            <div class="w-16 h-16 rounded-full border-4 {countdownColor} bg-black/60 flex items-center justify-center backdrop-blur-sm transition-colors duration-500">
              <span class="font-mono font-bold text-xl {countdownColor.split(' ')[0]}">{countdownSeconds}</span>
            </div>
          </div>
        {/if}

        <!-- Floating boarding event emojis -->
        {#each floatingItems as item (item.id)}
          <div
            class="absolute pointer-events-none z-20 text-5xl floating-emoji"
            style="left: {item.x}%; bottom: 35%;"
          >
            {item.type === 'boarded' ? '👍' : '👎'}
          </div>
        {/each}

        <!-- Result overlay -->
        {#if scanState === 'result'}
          <div class="absolute inset-0 bg-black/70 flex items-center justify-center z-30 backdrop-blur-sm">
            <div class="text-center bg-gray-900/95 rounded-2xl p-8 border-2 {boardingVerdict === 'allow' ? 'border-green-500' : boardingVerdict === 'deny' ? 'border-red-500' : 'border-yellow-500'} shadow-2xl mx-4">

              <!-- Verdict banner -->
              {#if boardingVerdict === 'allow'}
                <div class="text-5xl mb-3">✅</div>
                <p class="text-2xl font-bold text-green-400 uppercase tracking-widest mb-1">Allow Boarding</p>
              {:else if boardingVerdict === 'deny'}
                <div class="text-5xl mb-3">🚫</div>
                <p class="text-2xl font-bold text-red-400 uppercase tracking-widest mb-1">Deny Boarding</p>
              {:else}
                <div class="text-5xl mb-3">⚖️</div>
                <p class="text-2xl font-bold text-yellow-400 uppercase tracking-widest mb-1">Tied Vote</p>
              {/if}

              <!-- Vote tally -->
              <div class="flex gap-10 justify-center my-5">
                <div class="text-center">
                  <div class="text-3xl mb-1">👍</div>
                  <div class="text-3xl font-bold text-green-400 font-mono">{boardedCount}</div>
                  <div class="text-[10px] text-green-400/70 uppercase tracking-widest mt-1">BOARD</div>
                </div>
                <div class="w-px bg-gray-700 self-stretch"></div>
                <div class="text-center">
                  <div class="text-3xl mb-1">👎</div>
                  <div class="text-3xl font-bold text-red-400 font-mono">{notBoardedCount}</div>
                  <div class="text-[10px] text-red-400/70 uppercase tracking-widest mt-1">NOT BOARD</div>
                </div>
              </div>

              <button
                onclick={resetBoardingSession}
                class="px-8 py-3 bg-aero-teal text-white font-semibold rounded-full hover:bg-aero-dark transition-colors text-sm tracking-wide"
              >
                Scan Next Passenger
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>

  </div>

  <!-- QR Code panel — right side (mirror of left) -->
  {#if qrCodeDataUrl}
    <div class="shrink-0 self-center bg-white rounded-2xl shadow-xl border-2 border-aero-light/30 p-4 flex flex-col items-center gap-2">
      <p class="text-xs font-semibold text-aero-dark uppercase tracking-widest">Scan to Watch</p>
      <img src={qrCodeDataUrl} alt="QR code to view this feed" class="w-48 h-48 rounded-lg block" />
      <p class="text-[10px] text-gray-400 font-mono text-center">{sessionId ? `/VideoFeed?sessionId=${sessionId.slice(0, 8)}…` : '/VideoFeed'}</p>
    </div>
  {/if}

</div>

<style>
  @keyframes floatUp {
    0%   { transform: translateY(0)    scale(1);    opacity: 1; }
    60%  { transform: translateY(-50px) scale(1.2); opacity: 0.9; }
    100% { transform: translateY(-100px) scale(0.8); opacity: 0; }
  }

  .floating-emoji {
    animation: floatUp 2s ease-out forwards;
  }
</style>
