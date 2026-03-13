<script>
  import { onMount } from 'svelte';
  import {
    FACE_MATCH_REQUEST_TOPIC,
    FACE_MATCH_RESULT_TOPIC,
    PASSENGER_LOOKUP_RESPONSE_TOPIC
  } from './common/config';

  let { solaceClient } = $props();

  let scanState = $state('idle');
  let flyerId = $state('');
  let passengerDetails = $state('');

  onMount(() => {
    try {
      solaceClient.subscribeToTopic(FACE_MATCH_REQUEST_TOPIC, (_payload) => {
        scanState = 'matching';
        flyerId = '';
        passengerDetails = '';
      });

      solaceClient.subscribeToTopic(FACE_MATCH_RESULT_TOPIC, (payload) => {
        flyerId = payload.flyerId;
        scanState = 'looking_up';
      });

      solaceClient.subscribeToTopic(PASSENGER_LOOKUP_RESPONSE_TOPIC, (payload) => {
        passengerDetails = payload.passengerDetails;
        scanState = 'found';
      });
    } catch (error) {
      console.error('PassengerInfo: Failed to subscribe to Solace topics:', error);
    }
  });
</script>

<div class="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-aero-light/30">
  <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-6 py-3">
    <h2 class="text-xl font-display font-bold text-white">Passenger Information</h2>
  </div>

  <div class="p-6 min-h-[120px] flex items-center justify-center">

    {#if scanState === 'idle'}
      <div class="flex items-center gap-3 text-gray-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-base font-medium">Waiting for passenger scan...</span>
      </div>

    {:else if scanState === 'matching'}
      <div class="flex items-center gap-4">
        <svg class="w-8 h-8 text-aero-teal animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        <span class="text-base font-semibold text-gray-700">Person detected. Matching...</span>
      </div>

    {:else if scanState === 'looking_up'}
      <div class="flex items-center gap-4">
        <svg class="w-8 h-8 text-aero-teal animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        <span class="text-base font-semibold text-gray-700">
          Frequent Flyer <span class="text-aero-teal">{flyerId}</span> detected... looking up passenger details...
        </span>
      </div>

    {:else if scanState === 'found'}
      <div class="w-full space-y-3">
        <div class="flex items-center gap-2 text-aero-dark">
          <svg class="w-5 h-5 text-aero-teal flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd" />
          </svg>
          <span class="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Frequent Flyer {flyerId}
          </span>
        </div>
        <div class="p-4 bg-gradient-to-br from-aero-bg to-white rounded-xl border border-aero-light/30">
          <p class="text-gray-800 text-base whitespace-pre-wrap leading-relaxed">{passengerDetails}</p>
        </div>
      </div>
    {/if}

  </div>
</div>
