# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AeroSwift AI is a real-time airport passenger recognition and boarding assistance system. It streams video from an ESP32 camera, runs ML inference (people detection, face detection, emotion detection) on a Node.js server, publishes results to Solace PubSub+, and displays them in a Svelte 5 web app. An optional Python-based Agent Mesh handles AI-powered passenger queries.

## Repository Structure

```
aeroswift-ai/
├── camera-streaming-server/   # Node.js server — ML inference, MQTT publishing
├── aersoswift-web-app/        # Svelte 5 + Vite frontend
├── agent-mesh/                # Python (Solace Agent Mesh) — AI agent orchestration
└── facial-recognition/        # Node.js + Qdrant vector DB — face enrollment & matching
```

## Common Commands

### Camera Streaming Server (Node.js)
```bash
cd camera-streaming-server
npm install
npm run dev          # Development with nodemon auto-restart
npm start            # Production

# First-time model setup
node download-model.js            # YOLOv8 ONNX models
node download-faceapi-models.js   # face-api.js models
```

### Web Application (Svelte 5 + Vite)
```bash
cd aersoswift-web-app
npm install
npm run dev          # Vite dev server with HMR
npm run build        # Production build → dist/
npm run preview      # Test production build locally
```

### Agent Mesh (Python)
```bash
cd agent-mesh
python -m venv .venv && source .venv/bin/activate
pip install solace-agent-mesh
sam init --skip
./setup.sh
sam run              # Development
nohup sam run &      # Background/production
```

### Facial Recognition
```bash
cd facial-recognition
./download-models.sh
npm install
docker-compose -f docker/qdrant.yml up -d   # Start Qdrant vector DB
./enroll_all.sh      # Enroll passenger faces
./match_flyer.sh     # Test face matching
```

## Architecture & Data Flow

```
ESP32 Camera (MJPEG HTTP)
    → camera-streaming-server (Node.js)
        ├── yolo-detector.js     — YOLOv8 ONNX people detection
        ├── face-detector.js     — Face detection (YOLOv8/YuNet)
        └── emotion-detector.js  — 7-class emotion (face-api.js)
    → Solace PubSub+ (MQTT broker)
        Topics:
          aeroswift/camera/feed             — Binary JPEG frames
          aeroswift/camera/analytics/gate1  — JSON detection results
          aeroswift/camera/control          — Control commands
    → aersoswift-web-app (Svelte 5, WebSocket)
        ├── CameraFeed.svelte  — Renders frames + bounding box overlays
        └── PassengerInfo.svelte — Loyalty/flight info display

Agent Mesh (separate, event-driven via Solace):
    Orchestrator → Frequent Flyer Agent / FDPS Agent / Airport Map Agent
    (SQLite databases for passenger & flight data)

Facial Recognition (standalone demo):
    Enroll Service → face-api.js embeddings → Qdrant (cosine similarity)
    Match Service  → REST query interface
```

## Key Implementation Details

**Binary frame protocol** (camera server → web app): Frames are sent as binary with a custom delimiter (`|`) separating `frameId|timestamp|size|<JPEG bytes>`. The web app parses this in `CameraFeed.svelte` via `Uint8Array`.

**Demo mode** (web app): Set `VITE_DEMO_MODE=true` in `.env` to run without a physical camera or Solace broker. Configured via `aersoswift-web-app/src/lib/common/config.ts`.

**Solace client wrapper** (`aersoswift-web-app/src/lib/common/solace.ts`): Handles WebSocket connection, QoS-based subscriptions, and reconnection logic.

**TypeScript types** (`aersoswift-web-app/src/lib/common/types.ts`): Defines `VideoFrame`, `Detection`, `PeopleCount`, emotion data structures.

**Tailwind theme** (`aersoswift-web-app/tailwind.config.js`): Custom colors `aero-teal (#1abc9c)`, `aero-dark`, `aero-light`, `aero-bg`.

**ML models** are large and stored in `camera-streaming-server/models/` (ONNX) and `camera-streaming-server/weights/` (face-api). They are not in git — run the download scripts on first setup.

## Environment Configuration

Each subproject uses a `.env` file copied from its `.env.example` / `.env_sample`:

- **camera-streaming-server/.env**: `SOLACE_MQTT_HOST`, `SOLACE_USERNAME`, `SOLACE_PASSWORD`, `ESP32_CAMERA_IP`, `ENABLE_FACE_DETECTION`, `ENABLE_EMOTION_DETECTION`, `DETECTION_INTERVAL_MS`, `MAX_FPS`
- **aersoswift-web-app/.env**: `VITE_SOLACE_*` credentials, `VITE_DEMO_MODE`, topic names
- **agent-mesh/.env**: LLM endpoint/API key, Solace broker + gateway credentials

## Deployment

The web app deploys to **Vercel** — `vercel.json` sets build command to `npm run build` and output to `dist/`. See `aersoswift-web-app/DEPLOYMENT.md` for steps.

The camera server and agent mesh are self-hosted (no containerization outside of Qdrant).
