<script>
  import { onMount } from 'svelte';
  import {
    FACE_MATCH_REQUEST_TOPIC,
    FACE_MATCH_RESULT_TOPIC,
    FACE_MATCH_ERROR_TOPIC,
    PASSENGER_LOOKUP_RESPONSE_TOPIC
  } from './common/config';

  const PASSPORT_SERVICE_URL  = 'http://localhost:3003';
  const FACE_NO_MATCH_TOPIC   = 'aeroswift/passenger/unrecognized';

  let { onNoMatch } = $props();
  let scanState = $state('idle');
  let flyerId = $state('');
  let passengerDetails = $state('');
  let passportScanState = $state('idle'); // idle | scanning | complete | error
  let passportScanMessage = $state('');
  let passportPollInterval = null;

  const solaceClient = new SolaceVideoClient(APP_CONFIG.solace);

  onMount(() => {
    try {
      await solaceClient.connect();

      // Face detected at gate — matching in progress
      solaceClient.subscribeToTopic(FACE_MATCH_REQUEST_TOPIC, (_payload) => {
        scanState = 'matching';
        flyerId = '';
        passengerInfo = '';
        flightInfo = '';
        flightStatus = '';
        recommendation = null;
        airportMap = null;
        errorMessage = '';
      });

      solaceClient.subscribeToTopic(FACE_MATCH_ERROR_TOPIC, (payload) => {
        errorMessage = payload.error ?? 'Face match failed';
        scanState = 'error';
      });

      // Reset face detection on app load
      solaceClient.publishControl('aeroswift/terminal1/v1/face/scan/reset', {
        reset: true,
        timestamp: new Date().toISOString()
      });

      // Match found — look up passenger details via agent mesh
      solaceClient.subscribeToTopic(FACE_MATCH_RESULT_TOPIC, (payload) => {
        flyerId = payload.flyerId;
        scanState = 'looking_up';
      });

      // No match — unknown passenger, prompt passport scan
      solaceClient.subscribeToTopic(FACE_NO_MATCH_TOPIC, (_payload) => {
        scanState = 'no_match';
        flyerId = '';
        passengerDetails = '';
        passportScanState = 'idle';
        passportScanMessage = '';
        onNoMatch();
      });

      // Agent mesh responded with passenger details
      solaceClient.subscribeToTopic(PASSENGER_LOOKUP_RESPONSE_TOPIC, (payload) => {
        passengerInfo = payload.passenger_info ?? '';
        flightInfo = payload.flight_info ?? '';
        flightStatus = payload.flight_status ?? '';
        recommendation = payload.recommendation ?? null;
        airportMap = payload.airport_map ?? null;
        scanState = 'found';
      });
    } catch (error) {
      console.error('PassengerInfo: Failed to subscribe to Solace topics:', error);
    }
  });

  onDestroy(() => {
    solaceClient.disconnect();
    if (passportPollInterval) clearInterval(passportPollInterval);
  });

  async function startPassportScan() {
    passportScanState = 'scanning';
    passportScanMessage = 'Starting passport scan...';

    try {
      const res = await fetch(`${PASSPORT_SERVICE_URL}/scan`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        passportScanState = 'error';
        passportScanMessage = data.error || 'Failed to start scan';
        return;
      }

      // Poll for status every 2 seconds
      passportPollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${PASSPORT_SERVICE_URL}/scan/status`);
          const status = await statusRes.json();
          passportScanMessage = status.message || '';

          if (status.status === 'complete') {
            passportScanState = 'complete';
            passportScanMessage = `✅ ${status.message}`;
            clearInterval(passportPollInterval);
          } else if (status.status === 'error') {
            passportScanState = 'error';
            passportScanMessage = status.error || 'Scan failed';
            clearInterval(passportPollInterval);
          }
        } catch (e) {
          passportScanState = 'error';
          passportScanMessage = 'Lost connection to passport service';
          clearInterval(passportPollInterval);
        }
      }, 2000);

    } catch (e) {
      passportScanState = 'error';
      passportScanMessage = 'Could not reach passport service on port 3003';
    }
  }

  function resetPassportScan() {
    passportScanState = 'idle';
    passportScanMessage = '';
    if (passportPollInterval) clearInterval(passportPollInterval);
  }
</script>

<div class="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-aero-light/30">
  <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-6 py-3 flex items-center justify-between">
    <h2 class="text-xl font-display font-bold text-white">Passenger Information</h2>
  </div>

  <!-- Passport scan status bar (only shown during/after scan) -->
  {#if passportScanState !== 'idle'}
    <div class="px-6 py-2 text-sm border-b border-aero-light/20
      {passportScanState === 'error' ? 'bg-red-50 text-red-600' :
       passportScanState === 'complete' ? 'bg-green-50 text-green-700' :
       'bg-aero-bg text-aero-dark'}">
      {passportScanMessage}
      {#if passportScanState === 'error'}
        <button onclick={resetPassportScan} class="ml-2 underline">Retry</button>
      {/if}
    </div>
  {/if}

  <div class="p-6 min-h-[120px] flex items-center justify-center">

    {#if scanState === 'idle'}
      <!-- Waiting: camera watching for faces -->
      <div class="flex items-center gap-3 text-gray-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="flex flex-col">
          <span class="text-base font-medium">Waiting for passenger to approach gate...</span>
          <span class="text-sm text-gray-300 mt-1">🎥 Camera is active and monitoring</span>
        </div>
      </div>

    {:else if scanState === 'matching'}
      <!-- Face detected by YOLO, sending to match service -->
      <div class="flex items-center gap-4">
        <svg class="w-8 h-8 text-aero-teal animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        <div class="flex flex-col">
          <span class="text-base font-semibold text-gray-700">Face detected — verifying against passport database...</span>
          <span class="text-sm text-gray-400 mt-1">🔍 Comparing live face with enrolled passport photo via vector search</span>
        </div>
      </div>

    {:else if scanState === 'no_match'}
      <div class="w-full flex flex-col items-center gap-4 text-center">
        <div class="flex items-center gap-3 text-amber-600">
          <svg class="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div class="flex flex-col text-left">
            <span class="text-base font-semibold">Passenger not recognised</span>
            <span class="text-sm text-amber-500 mt-1">Face detected but no matching passport found in database</span>
          </div>
        </div>
        <span class="text-sm text-amber-600 font-medium">👉 Please scan your passport in the panel on the right</span>
      </div>
      
    {:else if scanState === 'looking_up'}
      <!-- Match confirmed, agent mesh looking up passenger -->
      <div class="flex items-center gap-4">
        <svg class="w-8 h-8 text-aero-teal animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        <div class="flex flex-col">
          <span class="text-base font-semibold text-gray-700">
            ✅ Identity verified — Frequent Flyer <span class="text-aero-teal">{flyerId}</span>
          </span>
          <span class="text-sm text-gray-400 mt-1">🤖 Contacting agent mesh for passenger profile & flight details...</span>
        </div>
      </div>

    {:else if scanState === 'error'}
      <div class="flex items-center gap-3 text-red-500">
        <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <span class="text-base font-medium">{errorMessage}</span>
      </div>

    {:else if scanState === 'found'}
      <!-- Agent mesh responded with full passenger details -->
      <div class="w-full space-y-3">
        <div class="flex items-center gap-2 text-aero-dark">
          <svg class="w-5 h-5 text-aero-teal flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd" />
          </svg>
          <span class="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            ✅ Passport verified · Frequent Flyer {flyerId}
          </span>
        </div>

        <!-- Flight info + status badge -->
        <div class="p-3 bg-gradient-to-br from-aero-bg to-white rounded-xl border border-aero-light/30 flex items-start gap-3">
          <svg class="w-5 h-5 text-aero-teal flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <div class="flex-1">
            <p class="text-gray-800 text-sm leading-relaxed">{flightInfo}</p>
          </div>
          {#if flightStatus}
            <span class="text-xs font-bold uppercase px-2 py-1 rounded-full border {statusBadgeClass(flightStatus)} flex-shrink-0">
              {flightStatus}
            </span>
          {/if}
        </div>

        <!-- Recommendation -->
        {#if recommendation}
          <div class="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p class="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Recommendation</p>
            <div class="flex items-start gap-2">
              <p class="text-gray-800 text-sm leading-relaxed flex-1">{recommendation['flight-info'] ?? ''}</p>
              {#if recommendation.status}
                <span class="text-xs font-bold uppercase px-2 py-1 rounded-full border {statusBadgeClass(recommendation.status)} flex-shrink-0">
                  {recommendation.status}
                </span>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Airport map -->
        {#if airportMap}
          <div class="space-y-2">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Airport Map</p>
            {#if airportMap['map-location']}
              <img
                src="/{airportMap['map-location'].split('/').pop()}"
                alt="Airport map"
                class="w-full rounded-xl border border-aero-light/30 object-contain max-h-64"
              />
            {/if}
            {#if airportMap['map-description']}
              <div class="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none">{@html airportMap['map-description']}</div>
            {/if}
          </div>
        {/if}

      </div>
    {/if}

  </div>
</div>