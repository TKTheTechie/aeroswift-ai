<script>
  import { onMount, onDestroy } from 'svelte';
  import CameraFeed from './lib/CameraFeed.svelte';
  import WebcamPublisher from './lib/WebcamPublisher.svelte';
  import PassengerInfo from './lib/PassengerInfo.svelte';
  import SplashScreen from './lib/SplashScreen.svelte';
  import VideoFeedViewer from './lib/VideoFeedViewer.svelte';
  import EnrollmentForm from './lib/EnrollmentForm.svelte';
  import { SolaceVideoClient } from './lib/common/solace';
  import { APP_CONFIG } from './lib/common/config';

  const urlParams = new URLSearchParams(window.location.search);
  const urlSessionId = urlParams.get('sessionId');
  const isVideoFeedRoute = window.location.pathname === '/VideoFeed';

  let currentView = $state(isVideoFeedRoute ? 'videoFeed' : 'splash');
  let faceMatchPending = $state(false);
  let solaceReady = $state(false);

  const solaceClient = new SolaceVideoClient(APP_CONFIG.solace);

  onMount(async () => {
    try {
      await solaceClient.connect();
      solaceReady = true;
    } catch (error) {
      console.error('App: Failed to connect to Solace:', error);
      solaceReady = true; // unblock the UI even on error so the viewer can show its error state
    }
  });

  onDestroy(() => {
    solaceClient.disconnect();
  });

  function handleEnroll() {
    currentView = 'enrollment';
  }

  function handleEnter() {
    currentView = 'main';
  }

  function handleWebcamPublisher() {
    currentView = 'webcamPublisher';
  }

  function handleVideoFeed() {
    currentView = 'videoFeed';
  }

</script>

{#if currentView === 'splash'}
  <SplashScreen onEnroll={handleEnroll} onEnter={handleEnter} onWebcam={handleWebcamPublisher} onVideoFeed={handleVideoFeed} />
{:else if currentView === 'enrollment'}
  <EnrollmentForm onBack={() => currentView = 'splash'} />
{:else if currentView === 'videoFeed'}
  {#if solaceReady}
    <VideoFeedViewer {solaceClient} onBack={() => currentView = 'splash'} sessionId={urlSessionId} />
  {:else}
    <div class="min-h-screen bg-gradient-to-br from-aero-bg via-white to-aero-bg flex items-center justify-center">
      <div class="text-center space-y-4">
        <div class="w-16 h-16 border-4 border-aero-teal/30 border-t-aero-teal rounded-full animate-spin mx-auto"></div>
        <p class="text-aero-dark font-medium">Connecting to Solace...</p>
      </div>
    </div>
  {/if}
{:else if currentView === 'webcamPublisher'}
  <div class="h-screen bg-gradient-to-br from-aero-bg via-white to-aero-bg flex flex-col overflow-hidden">
    <header class="shrink-0 bg-white shadow-md border-b-4 border-aero-teal">
      <div class="container mx-auto px-4 py-3 flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 bg-gradient-to-br from-aero-teal to-aero-dark rounded-full flex items-center justify-center">
            <span class="text-white text-lg font-bold">✈</span>
          </div>
          <h1 class="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-aero-teal to-aero-dark">
            AeroSwift AI
          </h1>
        </div>
        <button onclick={() => currentView = 'splash'} class="ml-auto text-sm text-aero-dark hover:text-aero-teal font-medium transition-colors">← Back</button>
      </div>
    </header>
    <main class="flex-1 min-h-0 flex flex-col gap-3 p-4 overflow-hidden">
      <div class="flex-[3] min-h-0 flex flex-col">
        <WebcamPublisher {solaceClient}
          onMatchRequest={() => faceMatchPending = true}
          onMatchReset={() => faceMatchPending = false}
        />
      </div>
      <div class="flex-[2] min-h-0 overflow-y-auto">
        <PassengerInfo {faceMatchPending} onMatchReset={() => faceMatchPending = false} />
      </div>
    </main>
  </div>
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
        <CameraFeed {solaceClient} />
      </div>

      <PassengerInfo {faceMatchPending} onMatchReset={() => faceMatchPending = false} />
    </main>
  </div>
{/if}
