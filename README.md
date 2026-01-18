
# AeroSwift AI - Airport Passenger Recognition System

<p align="center">
  <img src="logo.jpg" alt="AeroSwift AI" width="200"/>
</p>

A complete real-time airport passenger recognition and boarding assistance system consisting of a camera streaming server with AI-powered people detection and a modern web application for displaying live feeds and passenger information.

## System Overview

This project provides an end-to-end solution for airport boarding operations:

1. **Camera Streaming Server**: Captures video from ESP32 cameras, performs real-time people detection using YOLOv8, and publishes frames and analytics via Solace PubSub+
2. **Web Application**: Displays live camera feeds and passenger information in a modern, responsive interface

## Architecture

```
┌─────────────────┐
│  ESP32 Camera   │
│   (Hardware)    │
└────────┬────────┘
         │ HTTP Stream
         ▼
┌─────────────────────────────┐
│  Camera Streaming Server    │
│  - Frame Processing         │
│  - YOLOv8 People Detection  │
│  - MQTT Publishing          │
└────────┬────────────────────┘
         │ Solace PubSub+ (MQTT)
         ▼
┌─────────────────────────────┐
│   Solace PubSub+ Broker     │
│   (Message Router)          │
└────────┬────────────────────┘
         │ WebSocket
         ▼
┌─────────────────────────────┐
│   AeroSwift Web App         │
│   - Live Camera Feed        │
│   - Passenger Info          │
│   - People Analytics        │
└─────────────────────────────┘
```

## Projects

### 1. Camera Streaming Server

Node.js server that connects to ESP32 cameras and provides:
- Real-time video frame processing and streaming
- YOLOv8-based people detection and counting
- MQTT publishing via Solace PubSub+
- RESTful API for stream control
- Frame rate limiting and optimization

**Location**: `camera-streaming-server/`

**Key Features**:
- Automatic YOLOv8 model download and initialization
- Configurable detection intervals and confidence thresholds
- Binary frame transmission for optimal performance
- Dynamic topic control
- Request-response pattern for client queries

[View Camera Server Documentation →](./camera-streaming-server/README.md)

### 2. AeroSwift Web Application

Modern Svelte 5 web application that displays:
- Live camera feeds from multiple gates
- Real-time passenger information
- People detection analytics
- Boarding status and flight details

**Location**: `aersoswift-web-app/`

**Key Features**:
- Real-time video streaming via Solace WebSocket
- Responsive design with Tailwind CSS
- Demo mode for development without hardware
- Automatic reconnection handling
- Custom airline-themed UI

[View Web App Documentation →](./aersoswift-web-app/README.md)

## Quick Start

### Prerequisites

- Node.js v16 or higher
- Python 3.8+ (for YOLOv8 model export)
- ESP32 camera module (or use demo mode)
- Solace PubSub+ broker (cloud or local)

### 1. Setup Camera Streaming Server

```bash
cd camera-streaming-server

# Install dependencies
npm install

# Install Python dependencies for YOLOv8
pip install ultralytics

# Export YOLOv8 model to ONNX format
python export-yolo-model.py

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the server
npm start
```

### 2. Setup Web Application

```bash
cd aersoswift-web-app

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Solace settings

# Start development server
npm run dev
```

### 3. Access the Application

Open your browser to `http://localhost:5173` to view the web application.

## Configuration

### Solace PubSub+ Setup

Both projects require a Solace PubSub+ broker. You can:

1. **Use Solace Cloud** (Free tier available):
   - Sign up at https://solace.com/cloud/
   - Create a messaging service
   - Note your connection details (URL, VPN, credentials)

2. **Run Local Broker**:
   ```bash
   docker run -d -p 8008:8008 -p 1883:1883 -p 8080:8080 \
     --name=solace solace/solace-pubsub-standard
   ```

### Environment Variables

**Camera Server** (`.env`):
```env
SOLACE_MQTT_HOST=tcp://localhost:1883
ESP32_CAMERA_IP=192.168.1.100
ENABLE_PEOPLE_DETECTION=true
DETECTION_INTERVAL_MS=2000
MAX_FPS=10
```

**Web App** (`.env`):
```env
VITE_SOLACE_URL=ws://localhost:8008
VITE_SOLACE_VPN=default
VITE_VIDEO_TOPIC=aeroswift/camera/feed
VITE_DEMO_MODE=false
```

## Topics and Message Flow

### Video Stream Topic
- **Topic**: `aeroswift/camera/feed`
- **Format**: Binary (frameId|timestamp|size|JPEG data)
- **QoS**: 0 (best effort)
- **Publisher**: Camera Server
- **Subscriber**: Web App

### Analytics Topic
- **Topic**: `aeroswift/camera/analytics/gate1`
- **Format**: JSON
- **QoS**: 1 (at least once)
- **Publisher**: Camera Server
- **Subscriber**: Web App

### Control Topic
- **Topic**: `aeroswift/camera/control`
- **Format**: JSON
- **QoS**: 1
- **Publisher**: Web App
- **Subscriber**: Camera Server

## Demo Mode

Both projects support demo mode for development without hardware:

**Camera Server**: Publishes test patterns and simulated analytics
**Web App**: Generates animated video feed and random people counts

Enable demo mode by setting:
- Camera Server: Run without ESP32 connection
- Web App: `VITE_DEMO_MODE=true`

## Development

### Camera Server Development

```bash
cd camera-streaming-server
npm run dev  # Uses nodemon for auto-restart
```

### Web App Development

```bash
cd aersoswift-web-app
npm run dev  # Vite dev server with HMR
```

## Production Deployment

### Camera Server

```bash
cd camera-streaming-server
npm start
# Or use PM2 for process management:
pm2 start server.js --name camera-server
```

### Web App

```bash
cd aersoswift-web-app
npm run build
npm run preview  # Test production build
# Deploy dist/ folder to your web server
```

## Hardware Requirements

### ESP32 Camera Module

Recommended models:
- ESP32-CAM
- AI-Thinker ESP32-CAM
- M5Stack Camera

The ESP32 should serve MJPEG stream on `/stream` endpoint.

### Server Requirements

**Camera Server**:
- CPU: 2+ cores (for YOLOv8 inference)
- RAM: 2GB minimum, 4GB recommended
- Network: Stable connection to ESP32 and Solace broker

**Web App**:
- Any static web server (Nginx, Apache, Vercel, Netlify)
- Or serve via Node.js

## Performance Optimization

### Frame Rate Control

Adjust in camera server `.env`:
```env
MAX_FPS=10                    # Limit to 10 fps
MIN_FRAME_INTERVAL_MS=100     # Or set interval directly
```

### Detection Optimization

```env
DETECTION_INTERVAL_MS=2000    # Run detection every 2 seconds
YOLO_MODEL_SIZE=yolov8n       # Use smaller model for speed
DETECTION_CONFIDENCE_THRESHOLD=0.5  # Adjust for accuracy vs speed
```

### Network Optimization

- Use QoS 0 for video frames (best effort)
- Use QoS 1 for analytics (guaranteed delivery)
- Enable compression on Solace broker
- Use binary format for video (no base64 overhead)

## Troubleshooting

### Camera Server Issues

**ESP32 Connection Failed**:
- Verify ESP32 IP address and network connectivity
- Check ESP32 is serving stream on correct port/path
- Test with browser: `http://<ESP32_IP>:81/stream`

**YOLOv8 Model Issues**:
- Ensure Python and ultralytics are installed
- Run `python export-yolo-model.py` manually
- Check `models/` directory for .onnx file

**Solace Connection Failed**:
- Verify broker URL and credentials
- Check firewall rules for MQTT port (1883)
- Test with MQTT client (mosquitto_pub/sub)

### Web App Issues

**Video Not Displaying**:
- Check browser console for errors
- Verify Solace WebSocket connection (port 8008)
- Confirm video topic matches server configuration
- Try demo mode to isolate issue

**Build Errors**:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Monitoring

### Camera Server Logs

The server provides detailed logging:
- Connection status
- Frame rate statistics
- Detection results
- MQTT publish status

### Web App Console

Open browser DevTools to see:
- Solace connection events
- Received messages
- Frame processing logs

## Security Considerations

1. **Credentials**: Never commit `.env` files to version control
2. **Network**: Use TLS/SSL for production Solace connections
3. **Authentication**: Implement proper authentication for web app
4. **Camera Access**: Secure ESP32 cameras on isolated network
5. **CORS**: Configure appropriate CORS policies

## License

MIT

## Support

For issues and questions:
- Camera Server: See [camera-streaming-server/README.md](./camera-streaming-server/README.md)
- Web App: See [aersoswift-web-app/README.md](./aersoswift-web-app/README.md)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Acknowledgments

- **Solace PubSub+** for real-time messaging infrastructure
- **YOLOv8** (Ultralytics) for state-of-the-art object detection
- **Svelte** for reactive UI framework
- **ESP32** community for camera module support
