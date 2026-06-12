<script>
  import { onMount } from 'svelte';
  import QRCode from 'qrcode';

  let { onEnroll, onEnter, onWebcam, onVideoFeed, onPassportScan } = $props();
  let qrCodeDataUrl = $state(null);

  onMount(async () => {
    const url = `${window.location.origin}/VideoFeed`;
    qrCodeDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1, color: { dark: '#00205b', light: '#ffffff' } });
  });

  const steps = [
    {
      number: 1,
      label: 'Enroll',
      title: 'Register Your Identity',
      description: 'Enroll your face or passport in the Royal Caribbean database to enable seamless guest recognition at boarding.',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />`,
      actions: [
        { label: 'Manual Enrollment', handler: () => onEnroll?.() },
        { label: 'Passport Registration', handler: () => onPassportScan?.(), icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c0 1.306.835 2.417 2 2.83M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />` },
      ],
    },
    {
      number: 2,
      label: 'Check In',
      title: 'Camera Check-In',
      description: 'Verify your identity via webcam or an ESP32 camera feed.',
      icons: [
        `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />`,
      ],
      actions: [
        { label: 'Webcam Feed', handler: () => onWebcam?.(), icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />` },
      ],
    },
  ];
</script>

<div class="fixed inset-0 bg-gradient-to-br from-aero-dark via-[#001a4d] to-aero-dark z-50 overflow-hidden">

  <!-- Royal Caribbean logo — center -->
  <div class="absolute inset-0 flex flex-col items-center justify-center px-6 pb-44 pointer-events-none">
    <img
      src="/rc-logo.webp"
      alt="Royal Caribbean"
      class="w-72 md:w-[26rem] max-w-[85vw] drop-shadow-[0_0_45px_rgba(45,156,255,0.4)]"
      onerror={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'block'; }}
    />
    <div style="display:none" class="text-center font-display font-extrabold text-white tracking-tight text-4xl md:text-6xl drop-shadow-2xl">
      Royal <span class="text-aero-teal">Caribbean</span>
    </div>
    <p class="mt-8 text-xs md:text-sm text-white/70 font-medium tracking-[0.25em] uppercase">
      Seamless Guest Recognition
    </p>
  </div>

  <!-- Step cards overlay — bottom -->
  <div class="absolute bottom-0 inset-x-0 z-10 px-4 pb-3 pt-10 bg-gradient-to-t from-aero-dark/95 via-aero-dark/60 to-transparent">
    <div class="flex flex-col sm:flex-row items-stretch justify-center gap-2 max-w-4xl mx-auto">

      {#each steps as step, i}
        <!-- Compact step card -->
        <div class="group flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-aero-teal/60 backdrop-blur-sm rounded-xl p-2.5 transition-all duration-300 hover:shadow-[0_0_20px_rgba(45,156,255,0.2)] flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-white/20 group-hover:bg-white/30 text-white font-bold text-[10px] flex items-center justify-center transition-colors shrink-0">
              {step.number}
            </span>
            <span class="text-white font-semibold text-xs">{step.title}</span>
          </div>
          <div class="flex flex-col gap-1">
            {#each step.actions as action}
              <button
                onclick={action.handler}
                class="w-full inline-flex items-center justify-between gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1.5 transition-all duration-200 border text-white bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/50 group/btn"
              >
                <span class="flex items-center gap-1.5">
                  {#if action.icon}
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 shrink-0">
                      {@html action.icon}
                    </svg>
                  {/if}
                  {action.label}
                </span>
                <svg class="w-3 h-3 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>
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

      <!-- Connector to Watch card -->
      <div class="hidden sm:flex items-center justify-center text-white/20 shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <!-- Step 3 — Watch -->
      <div class="group flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-aero-teal/60 backdrop-blur-sm rounded-xl p-2.5 transition-all duration-300 hover:shadow-[0_0_20px_rgba(45,156,255,0.2)] flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-white/20 group-hover:bg-white/30 text-white font-bold text-[10px] flex items-center justify-center transition-colors shrink-0">3</span>
          <span class="text-white font-semibold text-xs">Watch on Another Device</span>
        </div>
        {#if qrCodeDataUrl}
          <div class="flex justify-center py-1">
            <img src={qrCodeDataUrl} alt="QR code for video feed" class="w-20 h-20 rounded-lg border border-white/10" />
          </div>
        {/if}
        <button
          onclick={() => onVideoFeed?.()}
          class="w-full inline-flex items-center justify-between gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1.5 transition-all duration-200 border text-white bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/50 group/btn"
        >
          <span class="flex items-center gap-1.5">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-3.5 h-3.5 shrink-0">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Open Video Feed
          </span>
          <svg class="w-3 h-3 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

    </div>
  </div>
</div>
