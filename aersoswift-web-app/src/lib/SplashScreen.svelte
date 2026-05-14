<script>
  import { Canvas } from '@threlte/core';
  import Scene from './Scene.svelte';
  import { DEMO_MODE, WEBCAM_MODE } from './common/config';

  let { onEnter, onWebcam, onVideoFeed } = $props();
  let isLoading = $state(true);
</script>

<div class="fixed inset-0 bg-gradient-to-br from-aero-teal via-aero-dark to-aero-teal z-50 flex flex-col">
  <!-- Top Section - Title -->
  <div class="text-center space-y-1 pt-6 pb-4 px-6">
    <h1 class="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white drop-shadow-2xl">
      AeroSwift AI
    </h1>
    <p class="text-base md:text-lg text-white/90 font-medium drop-shadow-lg">
      Next-Generation Passenger Recognition
    </p>
  </div>
  
  <!-- Middle Section - 3D Model (Fills remaining space) -->
  <div class="flex-1 w-full relative">
    <!-- Loading Indicator -->
    {#if isLoading}
      <div class="absolute inset-0 flex items-center justify-center z-10">
        <div class="text-center space-y-4">
          <div class="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
          <p class="text-white text-lg font-medium">Loading 3D Models</p>
        </div>
      </div>
    {/if}
    
    <div class="absolute inset-0">
      <Canvas>
        <Scene bind:isLoading />
      </Canvas>
    </div>
  </div>
  
  <!-- Bottom Section - Buttons (Fixed at bottom) -->
  <div class="space-y-3 pb-6 px-6 text-center">
    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
      {#if DEMO_MODE && !WEBCAM_MODE}
        <button
          onclick={onWebcam}
          class="group relative px-8 py-4 bg-white text-aero-dark font-bold text-lg rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 hover:bg-aero-teal hover:text-white"
        >
          <span class="relative z-10">Webcam Demo</span>
        </button>
      {:else}
        <button
          onclick={onEnter}
          class="group relative px-8 py-4 bg-white text-aero-dark font-bold text-lg rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 hover:bg-aero-teal hover:text-white"
        >
          <span class="relative z-10">Enter Experience</span>
        </button>
      {/if}
      <button
        onclick={onVideoFeed}
        class="group relative px-8 py-4 bg-white/20 backdrop-blur-sm text-white font-bold text-lg rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 hover:bg-white hover:text-aero-dark border-2 border-white/50"
      >
        <span class="relative z-10 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Video Feed
        </span>
      </button>
    </div>
    <p class="text-white/70 text-sm">Drag to rotate • Scroll to zoom</p>
  </div>
</div>
