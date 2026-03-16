<script>
  import { onMount, onDestroy } from 'svelte';
  import { SolaceVideoClient } from './common/solace';
  import {
    APP_CONFIG,
    FACE_MATCH_REQUEST_TOPIC,
    FACE_MATCH_RESULT_TOPIC,
    PASSENGER_LOOKUP_REQUEST_TOPIC,
    PASSENGER_LOOKUP_RESPONSE_TOPIC
  } from './common/config';

  const PASSPORT_SERVICE_URL  = 'http://localhost:3003';
  const FACE_NO_MATCH_TOPIC   = 'aeroswift/passenger/unrecognized';

  let scanState = $state('idle');
  let flyerId = $state('');
  let passengerDetails = $state('');
  let passportScanState = $state('idle'); // idle | scanning | complete | error
  let passportScanMessage = $state('');
  let passportPollInterval = null;

  const solaceClient = new SolaceVideoClient(APP_CONFIG.solace);

  onMount(async () => {
    try {
      await solaceClient.connect();

      // Face detected at gate — matching in progress
      solaceClient.subscribeToTopic(FACE_MATCH_REQUEST_TOPIC, (_payload) => {
        scanState = 'matching';
        flyerId = '';
        passengerDetails = '';
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
        solaceClient.publishControl(PASSENGER_LOOKUP_REQUEST_TOPIC, {
          flyerId: payload.flyerId,
          timestamp: new Date().toISOString()
        });
      });

      // No match — unknown passenger, prompt passport scan
      solaceClient.subscribeToTopic(FACE_NO_MATCH_TOPIC, (_payload) => {
        scanState = 'no_match';
        flyerId = '';
        passengerDetails = '';
        passportScanState = 'idle';
        passportScanMessage = '';
      });

      // Agent mesh responded with passenger details
      solaceClient.subscribeToTopic(PASSENGER_LOOKUP_RESPONSE_TOPIC, (payload) => {
        passengerDetails = payload.passengerDetails;
        scanState = 'found';
      });
    } catch (error) {
      console.error('PassengerInfo: Failed to connect to Solace:', error);
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
      <!-- Unknown passenger — prompt passport scan -->
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

        <!-- Scan Passport button only appears here -->
        {#if passportScanState === 'idle'}
          <button
            onclick={startPassportScan}
            class="flex items-center gap-2 bg-aero-teal text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-aero-dark transition-colors shadow-md"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
            </svg>
            Scan Passport to Enroll
          </button>
        {:else if passportScanState === 'scanning'}
          <div class="flex items-center gap-2 text-aero-teal text-sm font-medium">
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
            </svg>
            Scanning passport — check terminal...
          </div>
        {:else if passportScanState === 'complete'}
          <div class="text-green-600 text-sm font-medium">
            ✅ Passport enrolled — please look at the camera again
          </div>
        {/if}
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
        <div class="p-4 bg-gradient-to-br from-aero-bg to-white rounded-xl border border-aero-light/30">
          <p class="text-gray-800 text-base whitespace-pre-wrap leading-relaxed">{passengerDetails}</p>
        </div>
      </div>
    {/if}

  </div>
</div>