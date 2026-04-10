<script>
  import CameraFeed from './lib/CameraFeed.svelte';
  import PassengerInfo from './lib/PassengerInfo.svelte';
  import PassportScanner from './lib/PassportScanner.svelte';
  import SplashScreen from './lib/SplashScreen.svelte';

  let showSplash = $state(true);
  let showScanner = $state(false);

  function handleEnter() {
    showSplash = false;
  }

  function handleNoMatch() {
    showScanner = true;
  }

  function handleEnrolled() {
    showScanner = false;
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
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-aero-teal rounded-full animate-pulse"></div>
          <span class="text-sm font-medium text-gray-600">Live</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 container mx-auto px-4 py-6 flex flex-col gap-6">

      <!-- Camera row: ESP32 feed + optional passport scanner side by side -->
      <div class="flex gap-6 {showScanner ? 'flex-row' : 'flex-col'}">
        <div class="{showScanner ? 'w-1/2' : 'w-full'}">
          <CameraFeed />
        </div>

        {#if showScanner}
          <div class="w-1/2">
            <PassportScanner onEnrolled={handleEnrolled} />
          </div>
        {/if}
      </div>

      <PassengerInfo onNoMatch={handleNoMatch} />
    </main>
  </div>
{/if}
