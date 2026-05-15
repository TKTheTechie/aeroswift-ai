<script>
  import { onMount, onDestroy } from 'svelte';
  import { SolaceVideoClient } from './common/solace';
  import {
    APP_CONFIG,
    FACE_MATCH_RESULT_TOPIC,
    FACE_MATCH_ERROR_TOPIC,
    FACE_SCAN_RESET_TOPIC,
    PASSENGER_LOOKUP_RESPONSE_TOPIC
  } from './common/config';

  let { faceMatchPending = false, onMatchReset, onEnroll } = $props();

  let isMatching = $state(false);

  $effect(() => {
    if (faceMatchPending) {
      isMatching = true;
      flyerId = '';
      passengerInfo = '';
      flightInfo = '';
      flightStatus = '';
      recommendation = null;
      airportMap = null;
      errorMessage = '';
    }
  });
  let flyerId = $state('');
  let passengerInfo = $state('');
  let flightInfo = $state('');
  let flightStatus = $state('');
  let recommendation = $state(null);
  let airportMap = $state(null);
  let errorMessage = $state('');

  const solaceClient = new SolaceVideoClient(APP_CONFIG.solace);

  onMount(async () => {
    try {
      await solaceClient.connect();

      solaceClient.subscribeToTopic(FACE_MATCH_ERROR_TOPIC, (payload) => {
        errorMessage = payload?.error || '';
        isMatching = false;
      });

      solaceClient.subscribeToTopic(FACE_MATCH_RESULT_TOPIC, (payload) => {
        flyerId = payload.flyerId;
      });

      solaceClient.subscribeToTopic(PASSENGER_LOOKUP_RESPONSE_TOPIC, (payload) => {
        passengerInfo = payload.passenger_info ?? '';
        flightInfo = payload.flight_info ?? '';
        flightStatus = payload.flight_status ?? '';
        recommendation = payload.recommendation ?? null;
        airportMap = payload.airport_map ?? null;
        isMatching = false;
        // faceDetectionActive stays false until an explicit FACE_SCAN_RESET arrives
      });
    } catch (error) {
      console.error('PassengerInfo: Failed to subscribe to Solace topics:', error);
    }
  });

  onDestroy(() => {
    solaceClient.disconnect();
  });

  function scanNextPassenger() {
    isMatching = false;
    flyerId = '';
    passengerInfo = '';
    flightInfo = '';
    flightStatus = '';
    recommendation = null;
    airportMap = null;
    errorMessage = '';
    onMatchReset?.();
    solaceClient.publishControl(FACE_SCAN_RESET_TOPIC, {
      reset: true,
      timestamp: new Date().toISOString()
    });
  }

  function statusBadgeClass(status) {
    const s = status?.toLowerCase();
    if (s === 'on time') return 'bg-green-100 text-green-700 border-green-200';
    if (s === 'delayed') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (s === 'cancelled') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  }
</script>

<div class="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-aero-light/30">
  <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-6 py-3 flex items-center justify-between">
    <h2 class="text-xl font-display font-bold text-white">Passenger Information</h2>
    {#if faceMatchPending || isMatching || flightInfo || errorMessage}
      <button
        onclick={scanNextPassenger}
        class="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-full transition-colors"
      >
        Scan Next Passenger
      </button>
    {/if}
  </div>

  <div class="p-6 min-h-[120px] flex items-center justify-center">

    {#if errorMessage}
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="flex items-center gap-3 text-red-500">
          <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span class="text-base font-medium">{errorMessage}</span>
        </div>
        {#if errorMessage === 'Passenger Not Found'}
          <p class="text-sm text-gray-500">This passenger is not enrolled in the system.</p>
          <button
            onclick={() => onEnroll?.()}
            class="px-5 py-2 bg-aero-teal hover:bg-aero-dark text-white text-sm font-semibold rounded-full transition-colors"
          >
            Enroll Passenger
          </button>
        {/if}
      </div>

    {:else if flightInfo}
      <div class="w-full space-y-3">
        <div class="flex items-center gap-2 text-aero-dark">
          <svg class="w-5 h-5 text-aero-teal flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd" />
          </svg>
          <span class="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            ✅ Passenger verified · Frequent Flyer {flyerId}
          </span>
        </div>

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

    {:else if flyerId}
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

    {:else if faceMatchPending || isMatching}
      <div class="flex flex-col items-center gap-4 py-2">
        <div class="relative w-16 h-16">
          <svg class="w-16 h-16 text-aero-teal/20" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
          </svg>
          <svg class="absolute inset-0 w-16 h-16 text-aero-teal animate-spin" fill="none" viewBox="0 0 24 24">
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
        <div class="text-center">
          <span class="text-base font-semibold text-gray-700">Passenger Matching In Progress</span>
          <p class="text-sm text-gray-400 mt-1">🔍 Comparing live face with enrolled passengers</p>
        </div>
      </div>

    {:else}
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
    {/if}

  </div>
</div>
