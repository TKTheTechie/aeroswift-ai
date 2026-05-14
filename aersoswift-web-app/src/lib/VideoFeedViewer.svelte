<script>
  import { onMount, onDestroy } from 'svelte';
  import { APP_CONFIG } from './common/config';

  let { solaceClient, onBack } = $props();

  let imgElement;
  let isActive = $state(false);
  let hasReceivedFrame = $state(false);
  let connectionError = $state('');

  const VIDEO_TOPIC = APP_CONFIG.videoTopic;

  onMount(async () => {
    try {
      await solaceClient.subscribe(VIDEO_TOPIC, handleVideoMessage);
      isActive = true;
    } catch (error) {
      console.error('VideoFeedViewer: Failed to subscribe:', error);
      connectionError = 'Failed to connect to video feed';
      isActive = false;
    }
  });

  onDestroy(async () => {
    try {
      await solaceClient.unsubscribe(VIDEO_TOPIC);
    } catch (error) {
      console.error('VideoFeedViewer: Error during cleanup:', error);
    }
  });

  function handleVideoMessage(payload) {
    if (typeof payload === 'string' && payload.startsWith('data:image/')) {
      if (imgElement) {
        imgElement.src = payload;
        imgElement.style.display = 'block';
        hasReceivedFrame = true;
      }
      return;
    }

    if (typeof payload === 'object') {
      if (payload.type === 'frame_chunk' && payload.data?.startsWith('data:image/')) {
        if (imgElement) {
          imgElement.src = payload.data;
          imgElement.style.display = 'block';
          hasReceivedFrame = true;
        }
      } else if (payload.type === 'inactive') {
        isActive = false;
        hasReceivedFrame = false;
        if (imgElement) imgElement.style.display = 'none';
      }
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-aero-bg via-white to-aero-bg flex flex-col">
  <!-- Header -->
  <header class="bg-white shadow-md border-b-4 border-aero-teal">
    <div class="container mx-auto px-4 py-3 flex items-center gap-3">
      <button
        onclick={onBack}
        class="flex items-center gap-2 px-4 py-2 text-aero-dark font-semibold rounded-full border-2 border-aero-teal/30 hover:bg-aero-teal hover:text-white hover:border-aero-teal transition-all duration-200"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div class="flex items-center gap-2">
        <div class="w-9 h-9 bg-gradient-to-br from-aero-teal to-aero-dark rounded-full flex items-center justify-center">
          <span class="text-white text-lg font-bold">✈</span>
        </div>
        <h1 class="text-xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-aero-teal to-aero-dark">
          AeroSwift AI — Video Feed
        </h1>
      </div>

      <div class="flex items-center gap-2 ml-auto">
        {#if isActive && hasReceivedFrame}
          <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span class="text-sm font-medium text-gray-600">Live</span>
        {:else if connectionError}
          <div class="w-3 h-3 bg-red-400 rounded-full"></div>
          <span class="text-sm font-medium text-red-500">Error</span>
        {:else}
          <div class="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
          <span class="text-sm font-medium text-gray-600">Connecting</span>
        {/if}
      </div>
    </div>
  </header>

  <!-- Video Feed -->
  <main class="flex-1 container mx-auto px-4 py-6">
    <div class="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-aero-light/30">
      <!-- Feed Header -->
      <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-display font-bold text-white">Camera Feed</h2>
          {#if hasReceivedFrame}
            <span class="text-sm text-white/80 font-mono">{VIDEO_TOPIC}</span>
          {/if}
        </div>
        <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white flex items-center gap-1">
          {#if isActive && hasReceivedFrame}
            <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Active
          {:else if connectionError}
            <span class="w-2 h-2 bg-red-400 rounded-full"></span>
            Error
          {:else}
            <span class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
            Connecting...
          {/if}
        </span>
      </div>

      <!-- Video Area -->
      <div class="aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        <img
          bind:this={imgElement}
          class="absolute inset-0 w-full h-full object-cover"
          style="display: none;"
          alt="Live video feed"
        />

        {#if !hasReceivedFrame}
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center space-y-4">
              <div class="w-24 h-24 mx-auto bg-aero-teal/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-aero-teal/50">
                <svg class="w-12 h-12 text-aero-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              {#if connectionError}
                <p class="text-red-400 font-medium text-lg">{connectionError}</p>
                <p class="text-gray-400 text-sm">Check Solace connection settings</p>
              {:else if isActive}
                <p class="text-aero-light font-medium text-lg">Waiting for Video Feed</p>
                <p class="text-gray-400 text-sm font-mono text-xs">{VIDEO_TOPIC}</p>
              {:else}
                <p class="text-yellow-400 font-medium text-lg">Connecting to Feed...</p>
                <p class="text-gray-400 text-sm">Establishing Solace connection</p>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Scanning line -->
        <div class="absolute inset-0 pointer-events-none">
          <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-aero-teal to-transparent animate-pulse"></div>
        </div>

        <!-- Corner brackets -->
        <div class="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-aero-teal/60"></div>
        <div class="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-aero-teal/60"></div>
        <div class="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-aero-teal/60"></div>
        <div class="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-aero-teal/60"></div>
      </div>
    </div>
  </main>
</div>
