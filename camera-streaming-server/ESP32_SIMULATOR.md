# ESP32 Camera Simulator

Simulate ESP32 camera without physical hardware using a static image as MJPEG stream.

## Purpose

Test the full AeroSwift pipeline without requiring ESP32-CAM hardware.

## Setup

1. Place test image in camera-streaming-server folder:
```bash
   # Use any JPEG image
   cp your-image.jpg camera-streaming-server/test-image.jpg
```

2. Start the simulator:
```bash
   cd camera-streaming-server
   node image-to-mjpeg.js
```

3. Update camera server .env to use simulator:
```bash
   ESP32_CAMERA_IP=localhost
   ESP32_STREAM_PORT=8081
```

4. Start camera server:
```bash
   npm start
```

The simulator serves the image at `http://localhost:8081/stream` mimicking ESP32's MJPEG endpoint.

## Switch Back to Real ESP32

Update .env:
```bash
ESP32_CAMERA_IP=192.168.1.100
ESP32_STREAM_PORT=81
```

Stop simulator and restart camera server.
