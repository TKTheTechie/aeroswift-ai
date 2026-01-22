<script>
  import { onMount, onDestroy } from 'svelte';
  import { SolaceVideoClient } from './common/solace';
  import { APP_CONFIG } from './common/config';
  
  let isActive = $state(false);
  let videoElement;
  let canvasElement;
  let mediaSource = null;
  let sourceBuffer = null;
  let isConnected = $state(false);
  let connectionError = $state('');
  let hasReceivedFrame = $state(false);
  let analyticsData = $state(null);
  
  const VIDEO_TOPIC = APP_CONFIG.videoTopic;
  const ANALYTICS_TOPIC = APP_CONFIG.analyticsTopic;
  const solaceClient = new SolaceVideoClient(APP_CONFIG.solace);
  
  onMount(async () => {
    try {
      // Connect to Solace
      await solaceClient.connect();
      isConnected = true;
      console.log('Connected to Solace');
      
      // Subscribe to video feed topic
      await solaceClient.subscribe(VIDEO_TOPIC, handleVideoMessage);
      isActive = true;
      console.log(`Subscribed to ${VIDEO_TOPIC}`);
      
      // Subscribe to analytics topic for bounding boxes
      solaceClient.subscribeToTopic(ANALYTICS_TOPIC, handleAnalyticsMessage);
      console.log(`Subscribed to ${ANALYTICS_TOPIC}`);
      
    } catch (error) {
      console.error('Failed to connect to Solace:', error);
      connectionError = 'Failed to connect to video feed';
      isActive = false;
    }
  });
  
  onDestroy(async () => {
    try {
      if (isConnected) {
        await solaceClient.unsubscribe(VIDEO_TOPIC);
        await solaceClient.disconnect();
        console.log(`Unsubscribed from ${VIDEO_TOPIC}`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });
  
  function handleAnalyticsMessage(payload) {
    analyticsData = payload;
    drawBoundingBoxes();
  }
  
  function getEmotionColor(emotion) {
    const colors = {
      happy: '#10b981',      // green
      neutral: '#6b7280',    // gray
      sad: '#3b82f6',        // blue
      angry: '#ef4444',      // red
      surprised: '#f59e0b',  // amber
      fearful: '#8b5cf6',    // purple
      disgusted: '#ec4899'   // pink
    };
    return colors[emotion] || '#00d4ff';
  }
  
  function getEmotionEmoji(emotion) {
    const emojis = {
      happy: '😊',
      neutral: '😐',
      sad: '😢',
      angry: '😠',
      surprised: '😲',
      fearful: '😨',
      disgusted: '🤢'
    };
    return emojis[emotion] || '👤';
  }
  
  function drawBoundingBoxes() {
    if (!canvasElement || !videoElement || !analyticsData) return;
    
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Set canvas size to match video element
    canvasElement.width = videoElement.width;
    canvasElement.height = videoElement.height;
    
    // Get scale factors
    const scaleX = videoElement.width / analyticsData.frameSize.width;
    const scaleY = videoElement.height / analyticsData.frameSize.height;
    
    // Draw each detection
    analyticsData.detections.forEach((detection, index) => {
      const { x, y, width, height } = detection.bbox;
      const confidence = detection.confidence;
      const hasEmotions = detection.emotions && detection.dominantEmotion;
      
      // Scale coordinates to match displayed video size
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;
      
      // Choose color based on emotion if available
      const boxColor = hasEmotions ? getEmotionColor(detection.dominantEmotion) : '#00d4ff';
      
      // Draw bounding box
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
      
      // Prepare labels
      const labels = [];
      labels.push(`Person ${index + 1}: ${(confidence * 100).toFixed(1)}%`);
      
      if (hasEmotions) {
        const emoji = getEmotionEmoji(detection.dominantEmotion);
        const emotionLabel = `${emoji} ${detection.dominantEmotion} (${(detection.dominantScore * 100).toFixed(0)}%)`;
        labels.push(emotionLabel);
      }
      
      // Draw labels
      ctx.font = '14px Arial';
      const lineHeight = 22;
      const padding = 4;
      
      labels.forEach((label, labelIndex) => {
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width + (padding * 2);
        const textHeight = 20;
        const yOffset = scaledY - ((labels.length - labelIndex) * lineHeight);
        
        // Draw label background
        ctx.fillStyle = labelIndex === 0 ? 'rgba(0, 212, 255, 0.9)' : `${boxColor}dd`;
        ctx.fillRect(scaledX, yOffset, textWidth, textHeight);
        
        // Draw label text
        ctx.fillStyle = '#fff';
        ctx.fillText(label, scaledX + padding, yOffset + 15);
      });
    });
  }
  
  function handleVideoMessage(payload) {
    // Check if payload is a base64 image data URL
    if (typeof payload === 'string' && payload.startsWith('data:image/')) {
      // Display the image directly
      if (videoElement) {
        videoElement.src = payload;
        videoElement.style.display = 'block';
        hasReceivedFrame = true;
        // Redraw bounding boxes when new frame arrives
        videoElement.onload = () => drawBoundingBoxes();
      }
      return;
    }
    
    // Handle structured message types
    if (typeof payload === 'object') {
      if (payload.type === 'frame_start') {
        console.log('Frame start:', payload.frameId, 'Total chunks:', payload.totalChunks);
      } else if (payload.type === 'frame_chunk') {
        console.log('Frame chunk:', payload.chunkIndex, 'of', payload.totalChunks);
        if (payload.data) {
          // Display chunk data if it's a complete image
          if (videoElement && payload.data.startsWith('data:image/')) {
            videoElement.src = payload.data;
            videoElement.style.display = 'block';
            hasReceivedFrame = true;
          }
        }
      } else if (payload.type === 'frame_end') {
        console.log('Frame end:', payload.frameId);
      } else if (payload.type === 'inactive') {
        console.log('Stream inactive');
        isActive = false;
        hasReceivedFrame = false;
        if (videoElement) {
          videoElement.style.display = 'none';
        }
      } else {
        console.log('Unknown message type:', payload);
      }
    }
  }
</script>

<div class="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-aero-light/30">
  <div class="bg-gradient-to-r from-aero-teal to-aero-dark px-6 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-display font-bold text-white">Camera Feed</h2>
      {#if hasReceivedFrame}
        <span class="text-sm text-white/80 font-mono">{VIDEO_TOPIC}</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium text-white/90">Status:</span>
      <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white flex items-center gap-1">
        {#if isActive}
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
  </div>
  
  <div class="aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
    <!-- Image element for actual feed -->
    <img 
      bind:this={videoElement}
      class="absolute inset-0 w-full h-full object-cover"
      style="display: none;"
      alt="Camera feed"
    />
    
    <!-- Canvas overlay for bounding boxes -->
    <canvas 
      bind:this={canvasElement}
      class="absolute inset-0 w-full h-full object-cover pointer-events-none"
      style="display: {hasReceivedFrame ? 'block' : 'none'};"
    ></canvas>
    
    <!-- Placeholder overlay - only show when no frame received -->
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
    
    <!-- Scanning animation overlay -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-aero-teal to-transparent animate-pulse"></div>
    </div>
    
    <!-- Corner brackets for tech feel -->
    <div class="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-aero-teal/60"></div>
    <div class="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-aero-teal/60"></div>
    <div class="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-aero-teal/60"></div>
    <div class="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-aero-teal/60"></div>
  </div>
</div>
