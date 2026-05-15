<script>
  import { onDestroy } from 'svelte';
  import { QDRANT_SERVICE_URL } from './common/config';

  let { onBack } = $props();

  let activeTab = $state('enroll');

  let flyerId = $state('');
  let enrolBase64 = $state('');
  let enrolPreviewSrc = $state('');
  let enrolResult = $state(null);
  let enrolError = $state('');
  let enrolLoading = $state(false);
  let enrolSteps = $state([false, false, false, false, false]);

  let enrolVideoEl = $state(null);
  let enrolStream = $state(null);
  let enrolCameraActive = $state(false);
  let enrolCaptureEnabled = $state(false);
  let enrolFaceState = $state('idle');
  let enrolFaceMsg = $state('');

  let searchBase64 = $state('');
  let searchPreviewSrc = $state('');
  let searchResult = $state(null);
  let searchError = $state('');
  let searchLoading = $state(false);
  let searchSteps = $state([false, false, false]);

  let searchVideoEl = $state(null);
  let searchStream = $state(null);
  let searchCameraActive = $state(false);
  let searchCaptureEnabled = $state(false);
  let searchFaceState = $state('idle');
  let searchFaceMsg = $state('');

  let modalOpen = $state(false);
  let modalTitle = $state('');
  let modalContent = $state('');

  let faceapi = null;
  let modelsLoaded = false;
  let enrolDetectionRunning = false;
  let searchDetectionRunning = false;

  const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

  async function loadModels() {
    if (modelsLoaded) return;
    faceapi = await import('@vladmandic/face-api');
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
    modelsLoaded = true;
  }

  function isFaceGood(detection) {
    const landmarks = detection.landmarks;
    const noseX = landmarks.getNose()[3].x;
    const leftEyeX = landmarks.getLeftEye()[0].x;
    const rightEyeX = landmarks.getRightEye()[0].x;
    const eyeCenterX = (leftEyeX + rightEyeX) / 2;
    const horizontalOffset = Math.abs(noseX - eyeCenterX);
    const leftEyeHeight = Math.abs(landmarks.getLeftEye()[1].y - landmarks.getLeftEye()[5].y);
    const rightEyeHeight = Math.abs(landmarks.getRightEye()[1].y - landmarks.getRightEye()[5].y);
    const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;
    const eyeTilt = Math.abs(landmarks.getLeftEye()[0].y - landmarks.getRightEye()[0].y);
    return horizontalOffset < 32 && avgEyeHeight > 6.5 && eyeTilt < 22;
  }

  async function runDetectionLoop(getVideo, getStream, setFaceState, setFaceMsg, setCaptureEnabled, getRunningFlag, setRunningFlag) {
    setRunningFlag(true);
    const detect = async () => {
      if (!getRunningFlag()) return;
      const video = getVideo();
      if (!video || !getStream()) return;
      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks(true);
        if (detection) {
          if (isFaceGood(detection)) {
            setFaceState('good');
            setFaceMsg('Good position — Looking straight at camera');
            setCaptureEnabled(true);
          } else {
            setFaceState('bad');
            setFaceMsg('Please look straight at the camera');
            setCaptureEnabled(false);
          }
        } else {
          setFaceState('bad');
          setFaceMsg('No face detected');
          setCaptureEnabled(false);
        }
      } catch {
        setFaceState('bad');
        setFaceMsg('Detection error');
        setCaptureEnabled(false);
      }
      if (getRunningFlag()) requestAnimationFrame(detect);
    };
    detect();
  }

  async function startEnrolCamera() {
    enrolError = '';
    enrolFaceState = 'info';
    enrolFaceMsg = 'Loading face detection models...';
    try {
      await loadModels();
      enrolFaceMsg = 'Starting camera...';
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      enrolStream = s;
      enrolVideoEl.srcObject = s;
      await enrolVideoEl.play();
      enrolCameraActive = true;
      enrolFaceMsg = 'Initializing face detection...';
      setTimeout(() => {
        runDetectionLoop(
          () => enrolVideoEl,
          () => enrolStream,
          (v) => { enrolFaceState = v; },
          (v) => { enrolFaceMsg = v; },
          (v) => { enrolCaptureEnabled = v; },
          () => enrolDetectionRunning,
          (v) => { enrolDetectionRunning = v; }
        );
      }, 1200);
    } catch (err) {
      enrolFaceState = 'bad';
      enrolFaceMsg = err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permissions.'
        : 'Could not access webcam: ' + err.message;
    }
  }

  function stopEnrolCamera() {
    enrolDetectionRunning = false;
    if (enrolStream) {
      enrolStream.getTracks().forEach(t => t.stop());
      enrolStream = null;
    }
    enrolCameraActive = false;
    enrolCaptureEnabled = false;
    enrolFaceState = 'idle';
    enrolFaceMsg = '';
  }

  function captureEnrolPhoto() {
    if (!enrolVideoEl || !enrolCaptureEnabled) return;
    const canvas = document.createElement('canvas');
    canvas.width = enrolVideoEl.videoWidth;
    canvas.height = enrolVideoEl.videoHeight;
    canvas.getContext('2d').drawImage(enrolVideoEl, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    enrolBase64 = dataUrl.split(',')[1];
    enrolPreviewSrc = dataUrl;
    enrolSteps = [true, false, false, false, false];
    enrolResult = null;
    enrolError = '';
  }

  async function startSearchCamera() {
    searchError = '';
    searchFaceState = 'info';
    searchFaceMsg = 'Loading face detection models...';
    try {
      await loadModels();
      searchFaceMsg = 'Starting camera...';
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      searchStream = s;
      searchVideoEl.srcObject = s;
      await searchVideoEl.play();
      searchCameraActive = true;
      searchFaceMsg = 'Initializing face detection...';
      setTimeout(() => {
        runDetectionLoop(
          () => searchVideoEl,
          () => searchStream,
          (v) => { searchFaceState = v; },
          (v) => { searchFaceMsg = v; },
          (v) => { searchCaptureEnabled = v; },
          () => searchDetectionRunning,
          (v) => { searchDetectionRunning = v; }
        );
      }, 1200);
    } catch (err) {
      searchFaceState = 'bad';
      searchFaceMsg = err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permissions.'
        : 'Could not access webcam: ' + err.message;
    }
  }

  function stopSearchCamera() {
    searchDetectionRunning = false;
    if (searchStream) {
      searchStream.getTracks().forEach(t => t.stop());
      searchStream = null;
    }
    searchCameraActive = false;
    searchCaptureEnabled = false;
    searchFaceState = 'idle';
    searchFaceMsg = '';
  }

  function captureSearchPhoto() {
    if (!searchVideoEl || !searchCaptureEnabled) return;
    const canvas = document.createElement('canvas');
    canvas.width = searchVideoEl.videoWidth;
    canvas.height = searchVideoEl.videoHeight;
    canvas.getContext('2d').drawImage(searchVideoEl, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    searchBase64 = dataUrl.split(',')[1];
    searchPreviewSrc = dataUrl;
    searchSteps = [true, false, false];
    searchResult = null;
    searchError = '';
  }

  function handleEnrolFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      enrolPreviewSrc = ev.target.result;
      enrolBase64 = ev.target.result.split(',')[1];
      enrolSteps = [true, false, false, false, false];
      enrolResult = null;
      enrolError = '';
    };
    reader.readAsDataURL(file);
  }

  function handleSearchFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      searchPreviewSrc = ev.target.result;
      searchBase64 = ev.target.result.split(',')[1];
      searchSteps = [true, false, false];
      searchResult = null;
      searchError = '';
    };
    reader.readAsDataURL(file);
  }

  async function pollVerification(id) {
    const maxAttempts = 25;
    let attempts = 0;
    return new Promise((resolve) => {
      const poll = async () => {
        attempts++;
        try {
          const res = await fetch(`${QDRANT_SERVICE_URL}/verify/${id}`);
          const data = await res.json();
          if (data.enrolled) {
            enrolSteps = [true, true, true, true, true];
            enrolResult = { ...enrolResult, verification: data };
            resolve(data);
            return;
          }
        } catch {}
        if (attempts < maxAttempts) setTimeout(poll, 500);
        else resolve(null);
      };
      poll();
    });
  }

  async function handleEnroll() {
    if (!enrolBase64) {
      enrolError = 'No image captured or uploaded.';
      return;
    }
    const id = flyerId.trim();
    if (!id) {
      enrolError = 'Flyer Name is required.';
      return;
    }
    enrolLoading = true;
    enrolError = '';
    enrolResult = null;
    try {
      const verifyRes = await fetch(`${QDRANT_SERVICE_URL}/verify/${id}`);
      const verifyData = await verifyRes.json();
      if (verifyData.enrolled === true) {
        enrolError = 'This Flyer ID is already registered. Please use a different Flyer ID.';
        enrolLoading = false;
        return;
      }

      enrolSteps = [true, true, false, false, false];

      const res = await fetch(`${QDRANT_SERVICE_URL}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flyerId: id, imageBase64: enrolBase64 })
      });
      const data = await res.json();
      enrolResult = data;

      enrolSteps = [true, true, true, true, false];

      await pollVerification(id);
      stopEnrolCamera();
    } catch (err) {
      enrolError = err.message || 'Enrollment failed.';
    } finally {
      enrolLoading = false;
    }
  }

  function resetEnrol() {
    flyerId = '';
    enrolBase64 = '';
    enrolPreviewSrc = '';
    enrolResult = null;
    enrolError = '';
    enrolSteps = [false, false, false, false, false];
    stopEnrolCamera();
  }

  async function handleSearch() {
    if (!searchBase64) {
      searchError = 'No image captured or uploaded.';
      return;
    }
    searchLoading = true;
    searchError = '';
    searchResult = null;
    try {
      searchSteps = [true, true, false];

      const res = await fetch(`${QDRANT_SERVICE_URL}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: searchBase64 })
      });
      const data = await res.json();
      searchResult = data;

      searchSteps = [true, true, true];
      stopSearchCamera();
    } catch (err) {
      searchError = err.message || 'Match request failed.';
    } finally {
      searchLoading = false;
    }
  }

  function resetSearch() {
    searchBase64 = '';
    searchPreviewSrc = '';
    searchResult = null;
    searchError = '';
    searchSteps = [false, false, false];
    stopSearchCamera();
  }

  function handleKeydown(e) {
    if (e.key === ' ' || e.key === 'Spacebar') {
      if (activeTab === 'enroll' && enrolCaptureEnabled) {
        e.preventDefault();
        captureEnrolPhoto();
      } else if (activeTab === 'search' && searchCaptureEnabled) {
        e.preventDefault();
        captureSearchPhoto();
      }
    }
    if (e.key === 'Escape' && modalOpen) {
      modalOpen = false;
    }
  }

  function openEnrolStepModal(step) {
    const id = flyerId.trim() || 'flyer_2026_042';
    if (step === 1) {
      modalTitle = 'Stage 1 – Upload/Capture Image';
      modalContent = 'Image selected or captured.\nBase64 data is ready for the API call.';
    } else if (step === 2) {
      modalTitle = 'Stage 2 – Enroll Request Sent';
      modalContent = `POST ${QDRANT_SERVICE_URL}/enroll\n\nPayload:\n{\n  "flyerId": "${id}",\n  "imageBase64": "[base64 string]"\n}`;
    } else if (step === 3) {
      modalTitle = 'Stage 3 – Enroll Request Queued';
      modalContent = 'Enroll API returned success.\nMessage is now in Solace queue.';
    } else if (step === 4) {
      modalTitle = 'Stage 4 – Waiting for Verification';
      modalContent = `GET ${QDRANT_SERVICE_URL}/verify/${id}\n\nPolling every 500ms (max 25 attempts)...`;
    } else if (step === 5) {
      modalTitle = 'Stage 5 – Enrolled';
      modalContent = 'Verification API confirmed success.\nFlyer is now stored in Qdrant.';
    }
    modalOpen = true;
  }

  function openSearchStepModal(step) {
    if (step === 1) {
      modalTitle = 'Stage 1 – Upload/Capture Image';
      modalContent = 'Image selected or captured.\nBase64 data is ready for the API call.';
    } else if (step === 2) {
      modalTitle = 'Stage 2 – Match Request Sent';
      modalContent = `POST ${QDRANT_SERVICE_URL}/match\n\nPayload:\n{\n  "imageBase64": "[base64 string]"\n}`;
    } else if (step === 3) {
      modalTitle = 'Stage 3 – Match Found';
      modalContent = 'Match API returned success.\nResults are displayed above.';
    }
    modalOpen = true;
  }

  onDestroy(() => {
    stopEnrolCamera();
    stopSearchCamera();
  });

  const enrolStepLabels = [
    'Upload/Capture Image',
    'Enroll Request Sent',
    'Enroll Request Queued',
    'Waiting for Verification',
    'Enrolled'
  ];

  const searchStepLabels = [
    'Upload/Capture Image',
    'Match Request Sent',
    'Match Found'
  ];
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen bg-gradient-to-br from-aero-bg via-white to-aero-bg flex flex-col">
  <header class="bg-white shadow-md border-b-4 border-aero-teal">
    <div class="container mx-auto px-4 py-3 flex items-center gap-3">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 bg-gradient-to-br from-aero-teal to-aero-dark rounded-full flex items-center justify-center">
          <span class="text-white text-lg font-bold">&#9992;</span>
        </div>
        <h1 class="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-aero-teal to-aero-dark">
          AeroSwift AI
        </h1>
        <span class="text-gray-400 text-sm font-body ml-1">/ Flyer Enrollment</span>
      </div>
      <button
        onclick={onBack}
        class="ml-auto text-sm text-aero-dark hover:text-aero-teal font-medium transition-colors"
      >
        &larr; Back
      </button>
    </div>
  </header>

  <div class="container mx-auto px-4 pt-4">
    <div class="flex border-b border-gray-200 gap-2">
      <button
        onclick={() => activeTab = 'enroll'}
        class="px-6 py-3 text-sm font-body transition-colors {activeTab === 'enroll'
          ? 'border-b-2 border-aero-teal text-aero-teal font-semibold'
          : 'text-gray-500 hover:text-aero-dark'}"
      >
        Enroll
      </button>
      <button
        onclick={() => activeTab = 'search'}
        class="px-6 py-3 text-sm font-body transition-colors {activeTab === 'search'
          ? 'border-b-2 border-aero-teal text-aero-teal font-semibold'
          : 'text-gray-500 hover:text-aero-dark'}"
      >
        Search / Match
      </button>
    </div>
  </div>

  <main class="flex-1 container mx-auto px-4 py-4">
    {#if activeTab === 'enroll'}
      <div class="flex gap-6 items-start">
        <div class="flex-1 bg-white rounded-2xl shadow-xl p-6">
          <div class="mb-4">
            <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-4 py-2 rounded-lg inline-block mb-4">
              <h2 class="text-white font-display font-semibold text-sm tracking-wide">Flyer Enrollment</h2>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1 font-body" for="flyerId">Flyer Name</label>
              <input
                id="flyerId"
                type="text"
                bind:value={flyerId}
                placeholder="e.g. TK"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aero-teal/50 focus:border-aero-teal font-body text-sm"
              />
            </div>
          </div>

          <div class="mb-5">
            <p class="text-sm font-medium text-gray-700 mb-2 font-body">Option 1: Upload Image</p>
            <label class="flex flex-col items-center justify-center w-full border-2 border-dashed border-aero-teal/30 rounded-xl p-4 cursor-pointer hover:border-aero-teal/60 hover:bg-aero-bg/30 transition-colors">
              <span class="text-aero-teal text-2xl mb-1">&#8679;</span>
              <span class="text-xs text-gray-500 font-body">Click to upload JPEG or PNG</span>
              <input type="file" accept="image/jpeg,image/png" class="hidden" onchange={handleEnrolFileChange} />
            </label>
            {#if enrolPreviewSrc && !enrolCameraActive}
              <div class="mt-3">
                <img src={enrolPreviewSrc} alt="Preview" class="max-w-xs max-h-56 rounded-xl border border-gray-200 object-contain" />
              </div>
            {/if}
          </div>

          <div class="flex items-center gap-3 my-4">
            <div class="flex-1 h-px bg-gray-200"></div>
            <span class="text-xs text-gray-400 font-body font-medium">OR</span>
            <div class="flex-1 h-px bg-gray-200"></div>
          </div>

          <div class="mb-5">
            <p class="text-sm font-medium text-gray-700 mb-2 font-body">Option 2: Capture with Webcam</p>
            <div class="rounded-xl overflow-hidden border-2 transition-all duration-300 {
              enrolFaceState === 'good'
                ? 'border-green-400 shadow-[0_0_0_4px_rgba(74,222,128,0.2)]'
                : enrolFaceState === 'bad'
                  ? 'border-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.2)]'
                  : 'border-dashed border-aero-teal/30'
            } p-3">
              <video
                bind:this={enrolVideoEl}
                autoplay
                playsinline
                class="w-full max-h-72 bg-black rounded-lg object-contain"
                style="transform: scaleX(-1)"
              ></video>
              <div class="flex gap-2 mt-3 flex-wrap">
                <button
                  onclick={startEnrolCamera}
                  disabled={enrolCameraActive}
                  class="bg-aero-teal hover:bg-aero-dark text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-body"
                >
                  Start Camera
                </button>
                <button
                  onclick={captureEnrolPhoto}
                  disabled={!enrolCaptureEnabled}
                  class="bg-aero-teal hover:bg-aero-dark text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-body"
                >
                  Capture Photo
                </button>
                <button
                  onclick={stopEnrolCamera}
                  disabled={!enrolCameraActive}
                  class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-body"
                >
                  Stop Camera
                </button>
              </div>
              {#if enrolFaceState !== 'idle'}
                <div class="mt-3 px-3 py-2 rounded-lg text-sm font-body font-medium text-center {
                  enrolFaceState === 'good'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : enrolFaceState === 'bad'
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-amber-50 border border-amber-200 text-amber-700'
                }">
                  {enrolFaceMsg}
                </div>
              {/if}
              {#if enrolCameraActive}
                <p class="text-xs text-gray-400 font-body mt-2 text-center">Tip: Press <kbd class="bg-gray-100 px-1 rounded text-gray-600">Space</kbd> to capture when ready</p>
              {/if}
              {#if enrolPreviewSrc && enrolCameraActive}
                <div class="mt-3">
                  <p class="text-xs text-gray-500 font-body mb-1">Last captured:</p>
                  <img src={enrolPreviewSrc} alt="Captured" class="max-w-xs max-h-40 rounded-lg border border-gray-200 object-contain" />
                </div>
              {/if}
            </div>
          </div>

          {#if enrolResult}
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm font-body mb-4">
              <p class="font-semibold text-blue-700 mb-1">Enrollment Response:</p>
              <pre class="text-xs text-blue-900 whitespace-pre-wrap overflow-auto">{JSON.stringify(enrolResult, null, 2)}</pre>
            </div>
          {/if}
          {#if enrolError}
            <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-body mb-4">
              {enrolError}
            </div>
          {/if}

          <div class="flex gap-3 mt-2">
            <button
              onclick={handleEnroll}
              disabled={enrolLoading || !enrolBase64 || !flyerId.trim()}
              class="bg-aero-teal hover:bg-aero-dark text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-body"
            >
              {enrolLoading ? 'Enrolling...' : 'Enroll Flyer'}
            </button>
            <button
              onclick={resetEnrol}
              class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors text-sm font-body"
            >
              Reset
            </button>
          </div>
        </div>

        <div class="w-64 shrink-0 bg-white rounded-2xl shadow-xl p-5">
          <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-4 py-2 rounded-lg mb-4">
            <h3 class="text-white font-display font-semibold text-sm tracking-wide">Enrollment Progress</h3>
          </div>
          <div class="flex flex-col gap-4">
            {#each enrolStepLabels as label, i}
              <button
                onclick={() => openEnrolStepModal(i + 1)}
                class="flex items-center gap-3 text-left w-full group"
              >
                <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors {
                  enrolSteps[i]
                    ? 'bg-aero-teal text-white'
                    : 'border-2 border-gray-300 text-gray-400 bg-white'
                }">
                  {i + 1}
                </div>
                <span class="text-sm font-body transition-colors {
                  enrolSteps[i] ? 'text-gray-800 font-medium' : 'text-gray-400'
                } group-hover:text-aero-dark">
                  {label}
                </span>
              </button>
            {/each}
          </div>
        </div>
      </div>

    {:else}
      <div class="flex gap-6 items-start">
        <div class="flex-1 bg-white rounded-2xl shadow-xl p-6">
          <div class="mb-4">
            <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-4 py-2 rounded-lg inline-block mb-4">
              <h2 class="text-white font-display font-semibold text-sm tracking-wide">Face Search / Match</h2>
            </div>
          </div>

          <div class="mb-5">
            <p class="text-sm font-medium text-gray-700 mb-2 font-body">Option 1: Upload Image</p>
            <label class="flex flex-col items-center justify-center w-full border-2 border-dashed border-aero-teal/30 rounded-xl p-4 cursor-pointer hover:border-aero-teal/60 hover:bg-aero-bg/30 transition-colors">
              <span class="text-aero-teal text-2xl mb-1">&#8679;</span>
              <span class="text-xs text-gray-500 font-body">Click to upload JPEG or PNG</span>
              <input type="file" accept="image/jpeg,image/png" class="hidden" onchange={handleSearchFileChange} />
            </label>
            {#if searchPreviewSrc && !searchCameraActive}
              <div class="mt-3">
                <img src={searchPreviewSrc} alt="Preview" class="max-w-xs max-h-56 rounded-xl border border-gray-200 object-contain" />
              </div>
            {/if}
          </div>

          <div class="flex items-center gap-3 my-4">
            <div class="flex-1 h-px bg-gray-200"></div>
            <span class="text-xs text-gray-400 font-body font-medium">OR</span>
            <div class="flex-1 h-px bg-gray-200"></div>
          </div>

          <div class="mb-5">
            <p class="text-sm font-medium text-gray-700 mb-2 font-body">Option 2: Capture with Webcam</p>
            <div class="rounded-xl overflow-hidden border-2 transition-all duration-300 {
              searchFaceState === 'good'
                ? 'border-green-400 shadow-[0_0_0_4px_rgba(74,222,128,0.2)]'
                : searchFaceState === 'bad'
                  ? 'border-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.2)]'
                  : 'border-dashed border-aero-teal/30'
            } p-3">
              <video
                bind:this={searchVideoEl}
                autoplay
                playsinline
                class="w-full max-h-72 bg-black rounded-lg object-contain"
                style="transform: scaleX(-1)"
              ></video>
              <div class="flex gap-2 mt-3 flex-wrap">
                <button
                  onclick={startSearchCamera}
                  disabled={searchCameraActive}
                  class="bg-aero-teal hover:bg-aero-dark text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-body"
                >
                  Start Camera
                </button>
                <button
                  onclick={captureSearchPhoto}
                  disabled={!searchCaptureEnabled}
                  class="bg-aero-teal hover:bg-aero-dark text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-body"
                >
                  Capture Photo
                </button>
                <button
                  onclick={stopSearchCamera}
                  disabled={!searchCameraActive}
                  class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-body"
                >
                  Stop Camera
                </button>
              </div>
              {#if searchFaceState !== 'idle'}
                <div class="mt-3 px-3 py-2 rounded-lg text-sm font-body font-medium text-center {
                  searchFaceState === 'good'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : searchFaceState === 'bad'
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-amber-50 border border-amber-200 text-amber-700'
                }">
                  {searchFaceMsg}
                </div>
              {/if}
              {#if searchCameraActive}
                <p class="text-xs text-gray-400 font-body mt-2 text-center">Tip: Press <kbd class="bg-gray-100 px-1 rounded text-gray-600">Space</kbd> to capture when ready</p>
              {/if}
              {#if searchPreviewSrc && searchCameraActive}
                <div class="mt-3">
                  <p class="text-xs text-gray-500 font-body mb-1">Last captured:</p>
                  <img src={searchPreviewSrc} alt="Captured" class="max-w-xs max-h-40 rounded-lg border border-gray-200 object-contain" />
                </div>
              {/if}
            </div>
          </div>

          {#if searchResult}
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm font-body mb-4">
              <p class="font-semibold text-blue-700 mb-1">Match Response:</p>
              <pre class="text-xs text-blue-900 whitespace-pre-wrap overflow-auto">{JSON.stringify(searchResult, null, 2)}</pre>
            </div>
          {/if}
          {#if searchError}
            <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-body mb-4">
              {searchError}
            </div>
          {/if}

          <div class="flex gap-3 mt-2">
            <button
              onclick={handleSearch}
              disabled={searchLoading || !searchBase64}
              class="bg-aero-teal hover:bg-aero-dark text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-body"
            >
              {searchLoading ? 'Searching...' : 'Search / Match'}
            </button>
            <button
              onclick={resetSearch}
              class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors text-sm font-body"
            >
              Reset
            </button>
          </div>
        </div>

        <div class="w-64 shrink-0 bg-white rounded-2xl shadow-xl p-5">
          <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-4 py-2 rounded-lg mb-4">
            <h3 class="text-white font-display font-semibold text-sm tracking-wide">Search Progress</h3>
          </div>
          <div class="flex flex-col gap-4">
            {#each searchStepLabels as label, i}
              <button
                onclick={() => openSearchStepModal(i + 1)}
                class="flex items-center gap-3 text-left w-full group"
              >
                <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors {
                  searchSteps[i]
                    ? 'bg-aero-teal text-white'
                    : 'border-2 border-gray-300 text-gray-400 bg-white'
                }">
                  {i + 1}
                </div>
                <span class="text-sm font-body transition-colors {
                  searchSteps[i] ? 'text-gray-800 font-medium' : 'text-gray-400'
                } group-hover:text-aero-dark">
                  {label}
                </span>
              </button>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>

{#if modalOpen}
  <div
    class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    onclick={(e) => { if (e.target === e.currentTarget) modalOpen = false; }}
  >
    <div class="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl relative">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-display font-semibold text-gray-800">{modalTitle}</h3>
        <button
          onclick={() => modalOpen = false}
          class="text-gray-400 hover:text-gray-600 text-2xl leading-none font-bold transition-colors"
          aria-label="Close modal"
        >
          &times;
        </button>
      </div>
      <pre class="bg-gray-50 rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-64 font-mono">{modalContent}</pre>
    </div>
  </div>
{/if}
