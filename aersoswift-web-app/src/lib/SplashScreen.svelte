<script>
  import { Canvas } from '@threlte/core';
  import Scene from './Scene.svelte';
  
  let { onEnter } = $props();
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
  
  <!-- Bottom Section - Button (Fixed at bottom) -->
  <div class="space-y-3 pb-6 px-6 text-center">
    <button
      onclick={onEnter}
      class="group relative px-8 py-4 bg-white text-aero-dark font-bold text-lg rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 hover:bg-aero-teal hover:text-white"
    >
      <span class="relative z-10">Enter Experience</span>
    </button>
    <p class="text-white/70 text-sm">Drag to rotate • Scroll to zoom</p>
  </div>
</div>
