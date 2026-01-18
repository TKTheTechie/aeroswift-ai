<script>
  let { data } = $props();
</script>

<div class="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-aero-light/30">
  <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-6 py-3">
    <h2 class="text-xl font-display font-bold text-white">Passenger Information</h2>
  </div>
  
  <div class="p-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Name -->
      <div class="space-y-2">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Passenger Name</label>
        <div class="flex items-center gap-3 p-4 bg-gradient-to-br from-aero-bg to-white rounded-xl border border-aero-light/30">
          <div class="w-10 h-10 bg-gradient-to-br from-aero-teal to-aero-dark rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-white font-bold text-lg">{data.name.charAt(0)}</span>
          </div>
          <span class="text-lg font-semibold text-gray-800">{data.name}</span>
        </div>
      </div>
      
      <!-- Loyalty Status -->
      <div class="space-y-2">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Loyalty Status</label>
        <div class="p-4 bg-gradient-to-br from-aero-teal/10 to-aero-dark/10 rounded-xl border border-aero-teal/30">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-aero-teal" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span class="text-lg font-bold text-aero-dark">{data.loyaltyStatus}</span>
          </div>
        </div>
      </div>
      
      <!-- Flight Number -->
      <div class="space-y-2">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Flight Number</label>
        <div class="p-4 bg-gradient-to-br from-aero-bg to-white rounded-xl border border-aero-light/30">
          <span class="text-lg font-bold text-gray-800">{data.flightNumber}</span>
        </div>
      </div>
      
      <!-- Seat -->
      <div class="space-y-2">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Seat Assignment</label>
        <div class="p-4 bg-gradient-to-br from-aero-bg to-white rounded-xl border border-aero-light/30">
          <span class="text-lg font-bold text-gray-800">{data.seat}</span>
        </div>
      </div>
      
      <!-- Destination -->
      <div class="space-y-2">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Destination</label>
        <div class="p-4 bg-gradient-to-br from-aero-bg to-white rounded-xl border border-aero-light/30">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-aero-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="text-lg font-bold text-gray-800">{data.destination}</span>
          </div>
        </div>
      </div>
      
      <!-- Boarding Group -->
      <div class="space-y-2">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Boarding Group</label>
        <div class="p-4 bg-gradient-to-br from-aero-teal to-aero-dark rounded-xl border border-aero-dark">
          <span class="text-lg font-bold text-white">Group {data.boardingGroup}</span>
        </div>
      </div>
    </div>
  </div>
</div>
