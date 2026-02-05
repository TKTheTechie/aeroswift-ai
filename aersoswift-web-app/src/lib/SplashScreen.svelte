<script>
  import { Canvas } from '@threlte/core';
  import SollyModel from './SollyModel.svelte';
  
  let { onEnter } = $props();
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
    <div class="absolute inset-0">
      <Canvas>
        <SollyModel />
      </Canvas>
    </div>
  </div>
  
  <!-- Bottom Section - Button (Fixed at bottom) -->
  <div class="space-y-3 pb-6 px-6 text-center">
    <button
      onclick={onEnter}
      class="group relative px-8 py-4 bg-white text-aero-dark font-bold text-lg rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
    >
      <span class="relative z-10">Enter Experience</span>
      <div class="absolute inset-0 bg-gradient-to-r from-aero-teal to-aero-dark opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-300"></div>
      <span class="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-bold">
        Enter Experience
      </span>
    </button>
    <p class="text-white/70 text-sm">Drag to rotate • Scroll to zoom</p>
  </div>
</div>
