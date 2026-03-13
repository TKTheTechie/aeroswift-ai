<script>
  import { onMount, onDestroy } from 'svelte';
  import CameraFeed from './lib/CameraFeed.svelte';
  import PassengerInfo from './lib/PassengerInfo.svelte';
  import SplashScreen from './lib/SplashScreen.svelte';
  import { SolaceVideoClient } from './lib/common/solace';
  import { APP_CONFIG, FACE_SCAN_RESET_TOPIC } from './lib/common/config';

  function scanNextPassenger() {
    solaceClient?.publishControl(FACE_SCAN_RESET_TOPIC, { action: 'reset', timestamp: new Date().toISOString() });
  }

  let showSplash = $state(true);
  let solaceClient = $state(null);

  onMount(async () => {
    try {
      const client = new SolaceVideoClient(APP_CONFIG.solace);
      await client.connect();
      solaceClient = client;
    } catch (error) {
      console.error('Failed to connect to Solace:', error);
    }
  });

  onDestroy(() => {
    solaceClient?.disconnect();
  });

  function handleEnter() {
    showSplash = false;
  }
</script>

{#if showSplash}
  <SplashScreen onEnter={handleEnter} />
{:else}
  <div class="min-h-screen bg-gradient-to-br from-aero-bg via-white to-aero-bg flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-md border-b-4 border-aero-teal">
      <div class="container mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-aero-teal to-aero-dark rounded-full flex items-center justify-center">
            <span class="text-white text-2xl font-bold">✈</span>
          </div>
          <h1 class="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-aero-teal to-aero-dark">
            AeroSwift AI
          </h1>
        </div>
        <button
          onclick={scanNextPassenger}
          disabled={!solaceClient}
          class="px-5 py-2 bg-gradient-to-r from-aero-teal to-aero-dark text-white font-semibold rounded-full shadow hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          Scan Next Passenger
        </button>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-aero-teal rounded-full animate-pulse"></div>
          <span class="text-sm font-medium text-gray-600">Live</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 container mx-auto px-4 py-6 flex flex-col gap-6">
      {#if solaceClient}
        <CameraFeed {solaceClient} />
        <PassengerInfo {solaceClient} />
      {:else}
        <div class="flex items-center justify-center flex-1 gap-3 text-gray-400">
          <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>Connecting to Solace...</span>
        </div>
      {/if}
    </main>
  </div>
{/if}
