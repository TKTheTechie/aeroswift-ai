
# AeroSwift AI - Airport Passenger Recognition System

<p align="center">
  <img src="logo.jpg" alt="AeroSwift AI" width="200"/>
</p>

A complete real-time airport passenger recognition and boarding assistance system consisting of a camera streaming server with AI-powered people detection, a modern web application for displaying live feeds and passenger information, an event-driven AI agent mesh for passenger assistance, and a facial recognition service for automated passenger identification.

## System Overview

This project provides an end-to-end solution for airport boarding operations:

1. **Camera Streaming Server**: Captures video from ESP32 cameras, performs real-time people detection using YOLOv8, and publishes frames and analytics via Solace PubSub
2. **Web Application**: Displays live camera feeds and passenger information in a modern, responsive interface
3. **Agent Mesh**: Event-driven AI agents that provide personalized passenger assistance including flight rebooking, directions, and concierge services
4. **Facial Recognition**: Enrolls and matches passenger faces using vector similarity search against a Qdrant database

## Architecture

```
┌─────────────────┐
│  ESP32 Camera   │
│   (Hardware)    │
└────────┬────────┘
         │ HTTP Stream
         ▼
┌─────────────────────────────┐     ┌──────────────────────────────┐
│  Camera Streaming Server    │     │   Facial Recognition         │
│  - Frame Processing         │     │  - Enroll Service (port 3001)│
│  - YOLOv8 People Detection  │     │  - Match Service (port 3002) │
│  - Face & Emotion Detection │     │  - face-api.js embeddings    │
│  - MQTT Publishing          │     └──────────────┬───────────────┘
└────────┬────────────────────┘                    │ Cosine Search
         │ Solace PubSub (MQTT)                    ▼
         ▼                             ┌───────────────────────┐
┌─────────────────────────────┐        │   Qdrant Vector DB    │
│   Solace PubSub Broker      │        │   (Docker, port 6333) │
│   (Message Router)          │        └───────────────────────┘
└────────┬────────────────────┘
         │ WebSocket / Event Triggers
         ▼
┌─────────────────────────────┐     ┌──────────────────────────────┐
│   AeroSwift Web App         │     │   Agent Mesh (SAM)           │
│   - Live Camera Feed        │     │  - Orchestrator Agent        │
│   - Passenger Info          │     │  - AeroswiftOperations Agent │
│   - People Analytics        │     │  - AeroswiftDB Agent         │
└─────────────────────────────┘     │  - FDPS Agent                │
                                    └──────────────────────────────┘
```

## Projects

### 1. Camera Streaming Server (camera-streaming-server)

Node.js server that connects to ESP32 cameras and provides:
- Real-time video frame processing and streaming
- YOLOv8-based people detection and counting
- MQTT publishing via Solace PubSub
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

### 2. AeroSwift Web Application (aersoswift-web-app)

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

### 3. Agent Mesh (agent-mesh)

Event-driven agentic AI deployment providing personalized assistance to frequent flyers, triggered by business events such as passenger check-in. Built on [Solace Agent Mesh](https://github.com/SolaceLabs/solace-agent-mesh).

**Location**: `agent-mesh/`

**Agents**:
- **Orchestrator Agent**: Discovers peer agents, decomposes prompts, delegates tasks, and aggregates responses
- **AeroswiftOperations Agent**: Primary coordinator for frequent flyer workflows; delegates to AeroswiftDB and FDPS agents
- **AeroswiftDB Agent**: SQL agent that queries the frequent flyer SQLite database (tiers, benefits, member profiles, statuses)
- **FDPS Agent**: Accesses real-time flight information (source/destination, arrival, status)

**Key Features**:
- Flight rebooking recommendations for delayed or canceled flights
- Directions to airport lounges and points of interest
- Tier-based airport concierge service activation
- Business process automation triggered by Solace events
- Dev mode via `SOLACE_DEV_MODE=true` (no broker required)

[View Agent Mesh Documentation →](./agent-mesh/README.md)

### 4. Facial Recognition (facial-recognition)

Standalone face enrollment and matching demo using vector similarity search. Passengers are enrolled by storing face embeddings in Qdrant; live face images are matched against the database using cosine similarity.

**Location**: `facial-recognition/`

**Services**:
- **Enroll Service** (port 3001): Accepts a base64 image + flyerId, extracts a 128-d face embedding via face-api.js, and upserts it into Qdrant
- **Match Service** (port 3002): Accepts a base64 image, extracts an embedding, runs top-K cosine search in Qdrant, and returns a match decision with confidence score

**Key Features**:
- L2-normalized face embeddings via `@vladmandic/face-api` (SSD MobileNetV1)
- Cosine similarity matching in Qdrant vector database
- Confidence + gap-based match decision (recommended thresholds: confidence ≥ 0.90, gap ≥ 0.05)
- REST API for easy integration
- Docker-based Qdrant deployment

[View Facial Recognition Documentation →](./facial-recognition/README.md)

## Quick Start

### Prerequisites

- Node.js v18 or higher
- Python 3.12+ (for Agent Mesh)
- Docker (for Qdrant vector database)
- ESP32 camera module (or use demo mode)
- Solace PubSub broker (cloud or local)

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

### 3. Setup Agent Mesh (Optional)

```bash
cd agent-mesh
python -m venv .venv && source .venv/bin/activate
pip install solace-agent-mesh
sam init --skip
./setup.sh

# Configure environment
cp .env_sample .env
# Edit .env with your LLM endpoint and Solace credentials

# Run in development (foreground)
sam run

# Or run in background
nohup sam run &
```

The Agent Mesh UI is available at `http://localhost:8000`.

### 4. Setup Facial Recognition (Optional)

```bash
cd facial-recognition

# Start Qdrant vector database
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant

# Download face-api models
./download-models.sh

# Install and start enroll service
cd enroll-service && npm install
node index.js   # Runs on port 3001

# In a new terminal, install and start match service
cd ../match-service && npm install
node index.js   # Runs on port 3002
```

Enroll a passenger face:
```bash
IMAGE_B64=$(base64 person.jpg | tr -d '\n')
curl -X POST http://localhost:3001/enroll \
  -H "Content-Type: application/json" \
  -d '{"flyerId": "F0001", "imageBase64": "'"$IMAGE_B64"'"}'
```

Match a face:
```bash
IMAGE_B64=$(base64 person_test.jpg | tr -d '\n')
curl -X POST http://localhost:3002/match \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "'"$IMAGE_B64"'"}'
```

### 5. Access the Application

Open your browser to `http://localhost:5173` to view the web application.

## Configuration

### Solace PubSub Setup

Both projects require a Solace PubSub broker. You can:

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

**Agent Mesh** (`.env`):
```env
LLM_SERVICE_ENDPOINT=""
LLM_SERVICE_API_KEY=""
LLM_SERVICE_GENERAL_MODEL_NAME=""
SOLACE_BROKER_URL=""
SOLACE_BROKER_VPN=""
SOLACE_BROKER_USERNAME=""
SOLACE_BROKER_PASSWORD=""
SOLACE_DEV_MODE=false   # Set to true to run without a Solace broker
AEROSWIFT_DB_TYPE=sqlite
AEROSWIFT_DB_NAME=data/aeroswift.db
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
- Agent Mesh: See [agent-mesh/README.md](./agent-mesh/README.md)
- Facial Recognition: See [facial-recognition/README.md](./facial-recognition/README.md)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Acknowledgments

- **Solace PubSub** for real-time messaging infrastructure
- **Solace Agent Mesh** for the event-driven agentic AI framework
- **YOLOv8** (Ultralytics) for state-of-the-art object detection
- **@vladmandic/face-api** for face detection and recognition
- **Qdrant** for high-performance vector similarity search
- **Svelte** for reactive UI framework
- **ESP32** community for camera module support
