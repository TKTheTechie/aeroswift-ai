<script>
  import { onMount, onDestroy } from 'svelte';

  const PASSPORT_SERVICE_URL = 'http://localhost:3003';

  let { onEnrolled } = $props();

  // Webcam
  let videoElement = $state(null);
  let canvasElement = $state(null);
  let stream = null;

  // Flow state
  let step = $state('capture'); // capture | confirm | nfc_ready | nfc | enrolling | done
  let message = $state('');
  let error = $state('');
  let ocrData = $state(null);
  let nfcData = $state(null);
  let passportPhoto = $state(null);
  let nfcPollInterval = null;

  onMount(async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoElement) videoElement.srcObject = stream;
    } catch (e) {
      error = 'Could not access webcam';
    }
  });

  onDestroy(() => {
    stopWebcam();
    if (nfcPollInterval) clearInterval(nfcPollInterval);
  });

  function stopWebcam() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  async function captureAndOCR() {
    error = '';
    message = 'Reading passport info...';

    // Capture frame from webcam
    const canvas = canvasElement;
    canvas.width  = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    canvas.getContext('2d').drawImage(videoElement, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

    try {
      const res = await fetch(`${PASSPORT_SERVICE_URL}/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      });

      if (!res.ok) {
        const data = await res.json();
        error = data.error || 'Could not read passport info';
        message = '';
        return;
      }

      ocrData = await res.json();
      step = 'confirm';
      message = '';
    } catch (e) {
      error = 'Could not reach passport service on port 3003';
      message = '';
    }
  }

  function confirmAndNFC() {
    error = '';
    step = 'nfc_ready';
    stopWebcam();
  }

  async function startNFC() {
    step = 'nfc';
    message = 'Reading NFC chip...';
    error = '';

    try {
      const res = await fetch(`${PASSPORT_SERVICE_URL}/nfc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ocrData)
      });

      if (!res.ok) {
        const data = await res.json();
        error = data.error || 'NFC read failed';
        step = 'nfc_ready';
        return;
      }

      // Poll for NFC status
      nfcPollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${PASSPORT_SERVICE_URL}/nfc/status`);
          const status = await statusRes.json();
          message = status.message || '';

          if (status.status === 'complete') {
            clearInterval(nfcPollInterval);
            nfcData = status.data;
            passportPhoto = status.photoBase64 ? `data:image/jpeg;base64,${status.photoBase64}` : null;
            step = 'enrolling';
            message = 'Enrolling passport photo into facial recognition...';
            await new Promise(resolve => setTimeout(resolve, 2000));
            await enrollPassenger();
          } else if (status.status === 'error') {
            clearInterval(nfcPollInterval);
            error = status.error || 'NFC read failed — make sure passport is flat on the reader';
            step = 'nfc_ready';
          }
        } catch (e) {
          clearInterval(nfcPollInterval);
          error = 'Lost connection to passport service';
        }
      }, 2000);

    } catch (e) {
      error = 'Could not reach passport service';
      step = 'nfc_ready';
    }
  }

  async function enrollPassenger() {
    error = '';

    try {
      const res = await fetch(`${PASSPORT_SERVICE_URL}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const data = await res.json();
        error = data.error || 'Enroll failed';
        step = 'nfc';
        return;
      }

      step = 'done';
      message = '✅ Identity enrolled — please approach the gate camera';
      setTimeout(() => onEnrolled(), 3000);
    } catch (e) {
      error = 'Enroll failed — check enroll service is running';
      step = 'nfc';
    }
  }

  function retry() {
    error = '';
    message = '';
    step = 'capture';
    ocrData = null;
    // Restart webcam
    navigator.mediaDevices.getUserMedia({ video: true }).then(s => {
      stream = s;
      if (videoElement) videoElement.srcObject = s;
    });
  }

  function formatDOB(d) {
    if (!d || d.length !== 6) return d;
    const year = parseInt(d.slice(0, 2));
    const currentYear = new Date().getFullYear() % 100;
    const prefix = year <= currentYear ? '20' : '19';
    return `${d.slice(4,6)}/${d.slice(2,4)}/${prefix}${d.slice(0,2)}`;
  }

  function formatExpiry(d) {
    if (!d || d.length !== 6) return d;
    return `${d.slice(4,6)}/${d.slice(2,4)}/20${d.slice(0,2)}`;
  }
</script>

<div class="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-amber-400 flex flex-col h-full">
  <!-- Header -->
  <div class="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 flex items-center gap-3">
    <svg class="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
    </svg>
    <h2 class="text-xl font-display font-bold text-white">Passport Scanner</h2>
    <span class="ml-auto text-xs text-amber-100 font-medium uppercase tracking-wider">Identity Verification</span>
  </div>

  <!-- Step: Capture -->
  {#if step === 'capture'}
    <div class="relative bg-amber-50">
      <div class="absolute inset-2 border-2 border-dashed border-amber-400 rounded-lg z-10 pointer-events-none flex items-end justify-center pb-3">
        <span class="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
          Hold the main page of your passport to the camera
        </span>
      </div>
      <!-- svelte-ignore a11y_media_has_caption -->
      <video bind:this={videoElement} autoplay playsinline class="w-full aspect-video object-cover"></video>
      <canvas bind:this={canvasElement} class="hidden"></canvas>
    </div>

    <div class="p-4 flex flex-col gap-3">
      {#if error}
        <div class="text-sm bg-red-50 text-red-600 px-3 py-2 rounded-lg">{error}</div>
      {/if}
      {#if message}
        <div class="text-sm bg-amber-50 text-amber-700 px-3 py-2 rounded-lg">{message}</div>
      {/if}
      <button
        onclick={captureAndOCR}
        class="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Capture Passport Info
      </button>
    </div>

  <!-- Step: Confirm OCR data -->
  {:else if step === 'confirm'}
    <div class="p-5 flex flex-col gap-4 flex-1">
      <p class="text-sm text-gray-600">Please verify the information extracted from your passport:</p>

      <div class="bg-amber-50 rounded-xl p-4 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">Name</span>
          <span class="font-semibold text-gray-800">{ocrData?.givenNames} {ocrData?.surname}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Passport No.</span>
          <span class="font-semibold text-gray-800">{ocrData?.passportNumber}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Date of Birth</span>
          <span class="font-semibold text-gray-800">{formatDOB(ocrData?.dateOfBirth)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Expiry Date</span>
          <span class="font-semibold text-gray-800">{formatExpiry(ocrData?.expiryDate)}</span>
        </div>
      </div>

      {#if error}
        <div class="text-sm bg-red-50 text-red-600 px-3 py-2 rounded-lg">{error}</div>
      {/if}

      <div class="flex gap-3">
        <button
          onclick={retry}
          class="flex-1 border border-amber-400 text-amber-600 font-semibold py-3 rounded-xl hover:bg-amber-50 transition-colors"
        >
          Retake
        </button>
        <button
          onclick={confirmAndNFC}
          class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Confirm & Read Chip
        </button>
      </div>
    </div>

  <!-- Step: NFC ready — waiting for user to place passport -->
  {:else if step === 'nfc_ready'}
    <div class="p-6 flex flex-col items-center justify-center gap-5 flex-1">
      <div class="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
        <svg class="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      </div>
      <p class="text-base font-semibold text-gray-700 text-center">Place your passport flat on the NFC reader</p>
      <p class="text-sm text-gray-400 text-center">When ready, click the button below</p>
      {#if error}
        <div class="text-sm bg-red-50 text-red-600 px-3 py-2 rounded-lg w-full text-center">{error}</div>
      {/if}
      <button
        onclick={startNFC}
        class="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Read NFC Chip
      </button>
    </div>

  <!-- Step: NFC reading -->
  {:else if step === 'nfc'}
    <div class="p-6 flex flex-col items-center justify-center gap-4 flex-1">
      <div class="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
        <svg class="w-10 h-10 text-amber-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      </div>
      <p class="text-base font-semibold text-gray-700 text-center">Place your passport flat on the NFC reader</p>
      {#if message}
        <p class="text-sm text-amber-600 text-center">{message}</p>
      {/if}
      {#if error}
        <div class="text-sm bg-red-50 text-red-600 px-3 py-2 rounded-lg w-full text-center">{error}</div>
        <button onclick={() => { error = ''; step = 'confirm'; }}
          class="bg-amber-500 text-white px-6 py-2 rounded-xl font-semibold">Retry</button>
      {/if}
    </div>

  <!-- Step: Enrolling — show photo + field comparison -->
  {:else if step === 'enrolling'}
    <div class="p-5 flex flex-col gap-4 flex-1">
      <div class="flex gap-4 items-start">
        {#if passportPhoto}
          <img src={passportPhoto} alt="" class="w-24 h-32 object-cover rounded-lg border-2 border-amber-300 flex-shrink-0" />
        {/if}
        <div class="flex-1 space-y-2 text-sm">
          {#if nfcData}
            {#each [
              { label: 'Name', ocr: `${ocrData?.givenNames} ${ocrData?.surname}`, nfc: `${nfcData?.givenNames} ${nfcData?.surname}` },
              { label: 'Date of Birth', ocr: ocrData?.dateOfBirth, nfc: nfcData?.dateOfBirth },
              { label: 'Expiry Date', ocr: ocrData?.expiryDate, nfc: nfcData?.expiryDate },
            ] as field}
              {@const match = field.ocr?.trim() === field.nfc?.trim()}
              <div class="flex items-center justify-between gap-2 py-1 border-b border-gray-100">
                <span class="text-gray-500 w-24">{field.label}</span>
                <span class="font-medium text-gray-700 flex-1">{field.nfc || field.ocr}</span>
                <span class={match ? 'text-green-500' : 'text-red-400'}>
                  {match ? '✅' : '⚠️'}
                </span>
              </div>
            {/each}
          {/if}
        </div>
      </div>
      <div class="flex items-center gap-2 text-amber-600 text-sm">
        <svg class="w-5 h-5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        {message}
      </div>
    </div>

  <!-- Step: Done — keep photo visible -->
  {:else if step === 'done'}
    <div class="p-5 flex flex-col gap-4 flex-1">
      <div class="flex gap-4 items-start">
        {#if passportPhoto}
          <img src={passportPhoto} alt="" class="w-24 h-32 object-cover rounded-lg border-2 border-green-300 flex-shrink-0" />
        {/if}
        <div class="flex-1 space-y-2 text-sm">
          {#if nfcData}
            {#each [
              { label: 'Name', ocr: `${ocrData?.givenNames} ${ocrData?.surname}`, nfc: `${nfcData?.givenNames} ${nfcData?.surname}` },
              { label: 'Date of Birth', ocr: ocrData?.dateOfBirth, nfc: nfcData?.dateOfBirth },
              { label: 'Expiry Date', ocr: ocrData?.expiryDate, nfc: nfcData?.expiryDate },
            ] as field}
              {@const match = field.ocr?.trim() === field.nfc?.trim()}
              <div class="flex items-center justify-between gap-2 py-1 border-b border-gray-100">
                <span class="text-gray-500 w-24">{field.label}</span>
                <span class="font-medium text-gray-700 flex-1">{field.nfc || field.ocr}</span>
                <span class={match ? 'text-green-500' : 'text-red-400'}>
                  {match ? '✅' : '⚠️'}
                </span>
              </div>
            {/each}
          {/if}
        </div>
      </div>
      <div class="flex items-center gap-2 text-green-600 text-sm font-semibold">
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd" />
        </svg>
        {message}
      </div>
    </div>
  {/if}
</div>