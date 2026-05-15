<script>
  import { Canvas } from '@threlte/core';
  import Scene from './Scene.svelte';

  let { onEnroll, onEnter, onWebcam, onVideoFeed } = $props();
  let isLoading = $state(true);

  const steps = [
    {
      number: 1,
      label: 'Enroll',
      title: 'Register Your Identity',
      description: 'Enroll your face in the AeroSwift biometric database to enable instant recognition at the gate.',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />`,
      actions: [{ label: 'Start Enrollment', handler: () => onEnroll?.() }],
    },
    {
      number: 2,
      label: 'Check In',
      title: 'Camera Check-In',
      description: 'Verify your identity using a live camera feed or your device webcam.',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />`,
      actions: [
        { label: 'Webcam Feed', handler: () => onWebcam?.() },
        { label: 'Camera Feed', handler: () => onEnter?.(), disabled: true, tooltip: 'Camera Feed Requires an ESP32 WiFi Camera to function' },
        { label: 'Passport Check In', handler: () => {}, disabled: true, tooltip: 'Passport Checkin requires a connected NFC Reader to function' },
      ],
    },
  ];
</script>

<div class="fixed inset-0 bg-gradient-to-br from-aero-dark via-[#0d2b26] to-aero-dark z-50 flex flex-col overflow-hidden">

  <!-- Header -->
  <div class="text-center pt-6 pb-2 px-6 shrink-0">
    <h1 class="text-4xl md:text-5xl font-display font-bold text-white drop-shadow-2xl tracking-tight">
      AeroSwift <span class="text-aero-teal">AI</span>
    </h1>
    <p class="mt-1 text-sm md:text-base text-white/70 font-medium tracking-widest uppercase">
      Next-Generation Passenger Recognition
    </p>
  </div>

  <!-- 3D Model -->
  <div class="flex-1 w-full relative min-h-0">
    {#if isLoading}
      <div class="absolute inset-0 flex items-center justify-center z-10">
        <div class="text-center space-y-3">
          <div class="w-12 h-12 border-4 border-white/20 border-t-aero-teal rounded-full animate-spin mx-auto"></div>
          <p class="text-white/60 text-sm">Loading 3D Scene</p>
        </div>
      </div>
    {/if}
    <div class="absolute inset-0 bottom-6">
      <Canvas>
        <Scene bind:isLoading />
      </Canvas>
    </div>
    <p class="absolute bottom-0 inset-x-0 text-center text-white/30 text-xs">Drag to rotate · Scroll to zoom</p>
  </div>

  <!-- Three-Step Process -->
  <div class="shrink-0 px-4 pb-4 pt-2">
    <p class="text-center text-white/50 text-xs uppercase tracking-widest mb-2 font-medium">How it works</p>

    <div class="flex flex-col sm:flex-row items-stretch justify-center gap-2 max-w-4xl mx-auto">
      {#each steps as step, i}
        <!-- Step Card -->
        <div class="group flex-1 relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-aero-teal/60 backdrop-blur-sm rounded-xl p-3 transition-all duration-300 hover:shadow-[0_0_24px_rgba(26,188,156,0.25)] hover:-translate-y-1 flex flex-col">
          <!-- Step number badge -->
          <div class="flex items-center gap-2 mb-2">
            <span class="w-6 h-6 rounded-full bg-aero-teal/20 group-hover:bg-aero-teal/40 text-aero-teal font-bold text-xs flex items-center justify-center transition-colors duration-300 shrink-0">
              {step.number}
            </span>
            <span class="text-white/40 text-xs uppercase tracking-widest font-medium">{step.label}</span>
          </div>

          <!-- Icon -->
          <div class="w-7 h-7 mb-2 text-aero-teal/70 group-hover:text-aero-teal transition-colors duration-300">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
              {@html step.icon}
            </svg>
          </div>

          <!-- Title & description -->
          <h3 class="text-white font-semibold text-sm mb-0.5 group-hover:text-aero-teal transition-colors duration-300">
            {step.title}
          </h3>
          <p class="text-white/50 text-xs leading-relaxed mb-2 flex-1">
            {step.description}
          </p>

          <!-- Action buttons -->
          <div class="flex flex-col gap-1.5">
            {#each step.actions as action}
              <div class="relative group/tooltip">
                <button
                  onclick={action.disabled ? undefined : action.handler}
                  disabled={action.disabled}
                  class="w-full inline-flex items-center justify-between gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1.5 transition-all duration-200 border
                    {action.disabled
                      ? 'text-white/30 bg-white/5 border-white/10 cursor-not-allowed'
                      : 'text-aero-teal bg-aero-teal/10 hover:bg-aero-teal/20 border-aero-teal/20 hover:border-aero-teal/50 group/btn'}"
                >
                  {action.label}
                  <svg class="w-3 h-3 {action.disabled ? '' : 'transition-transform duration-200 group-hover/btn:translate-x-0.5'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {#if action.tooltip}
                  <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 text-center text-xs text-white/80 bg-aero-dark border border-white/15 rounded-lg px-2.5 py-1.5 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 z-10 shadow-lg">
                    {action.tooltip}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Connector arrow -->
        {#if i < steps.length - 1}
          <div class="hidden sm:flex items-center justify-center text-white/20 shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>
