<script>
  import { onMount, onDestroy } from 'svelte';
  import CameraFeed from './lib/CameraFeed.svelte';
  import WebcamPublisher from './lib/WebcamPublisher.svelte';
  import PassengerInfo from './lib/PassengerInfo.svelte';
  import SplashScreen from './lib/SplashScreen.svelte';
  import { SolaceVideoClient } from './lib/common/solace';
  import { APP_CONFIG, WEBCAM_MODE } from './lib/common/config';

  let currentView = $state('splash');
  let WebcamFeed = $state(null);
  let faceMatchPending = $state(false);

  const solaceClient = new SolaceVideoClient(APP_CONFIG.solace);

  onMount(async () => {
    try {
      await solaceClient.connect();
    } catch (error) {
      console.error('App: Failed to connect to Solace:', error);
    }
  });

  onDestroy(() => {
    solaceClient.disconnect();
  });

  function handleEnter() {
    currentView = 'main';
  }

  async function handleWebcam() {
    if (!WebcamFeed) {
      const mod = await import('./lib/WebcamFeed.svelte');
      WebcamFeed = mod.default;
    }
    currentView = 'webcam';
  }

</script>

{#if currentView === 'splash'}
  <SplashScreen onEnter={handleEnter} onWebcam={handleWebcam} />
{:else if currentView === 'webcam' && WebcamFeed}
  <WebcamFeed onBack={() => currentView = 'splash'} />
{:else}
  <div class="min-h-screen bg-gradient-to-br from-aero-bg via-white to-aero-bg flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-md border-b-4 border-aero-teal">
      <div class="container mx-auto px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div class="flex items-center gap-2 shrink-0">
          <div class="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-aero-teal to-aero-dark rounded-full flex items-center justify-center">
            <span class="text-white text-lg sm:text-2xl font-bold">✈</span>
          </div>
          <h1 class="text-xl sm:text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-aero-teal to-aero-dark">
            AeroSwift AI
          </h1>
        </div>
        <div class="flex items-center gap-2 ml-auto shrink-0">
          <div class="w-3 h-3 bg-aero-teal rounded-full animate-pulse"></div>
          <span class="text-sm font-medium text-gray-600">Live</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 container mx-auto px-4 py-6 flex flex-col gap-6">

      <div class="w-full">
        {#if WEBCAM_MODE}
          <WebcamPublisher {solaceClient}
            onMatchRequest={() => faceMatchPending = true}
            onMatchReset={() => faceMatchPending = false}
          />
        {:else}
          <CameraFeed {solaceClient} />
        {/if}
      </div>

      <PassengerInfo {faceMatchPending} onMatchReset={() => faceMatchPending = false} />
    </main>
  </div>
{/if}
