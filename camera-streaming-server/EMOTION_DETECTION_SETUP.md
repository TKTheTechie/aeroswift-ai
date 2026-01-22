# Emotion Detection Setup Guide

This guide will help you set up emotion detection for your ESP32 video streaming server.

## Prerequisites

- Node.js installed
- ESP32 camera streaming server already set up
- Face detection working (YOLOv8 face model)

## Installation Steps

### 1. Install Dependencies

The required package `@vladmandic/face-api` has already been added to your project:

```bash
npm install
```

### 2. Download Face-API Models

Run the model setup script to copy the required models from the npm package:

```bash
npm run download-models
```

Or directly:

```bash
node download-faceapi-models.js
```

This will copy the required models from `node_modules/@vladmandic/face-api/model/` to your `models/` directory:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model.bin`
- `face_expression_model-weights_manifest.json`
- `face_expression_model.bin`

### 3. Enable Emotion Detection

Update your `.env` file:

```bash
# Enable face detection
ENABLE_FACE_DETECTION=true

# Enable emotion detection
ENABLE_EMOTION_DETECTION=true

# Detection settings
DETECTION_INTERVAL_MS=2000
DETECTION_CONFIDENCE_THRESHOLD=0.5
ANALYTICS_TOPIC=aeroswift/camera/analytics/gate1
FACE_MODEL_TYPE=yolov8n-face
```

### 4. Start the Server

```bash
npm start
```

You should see:
```
Initializing face detector...
✓ YOLOV8N-FACE face detection model loaded successfully
Initializing emotion detector...
Loading face-api.js models for emotion detection...
✓ Emotion detection models loaded successfully
  Emotion detection enabled
```

## Testing

### 1. Check Server Status

```bash
curl http://localhost:3000/stream/status
```

Response should include:
```json
{
  "faceDetection": {
    "enabled": true,
    "modelLoaded": true,
    "intervalMs": 2000,
    "emotionDetection": true
  }
}
```

### 2. Subscribe to Analytics Topic

Use an MQTT client to subscribe to your analytics topic (e.g., `aeroswift/camera/analytics/gate1`).

When faces are detected, you'll receive messages like:

```json
{
  "timestamp": "2024-01-21T12:34:56.789Z",
  "faceCount": 1,
  "detections": [
    {
      "confidence": 0.92,
      "bbox": {
        "x": 120,
        "y": 80,
        "width": 150,
        "height": 180
      },
      "emotions": {
        "happy": 0.85,
        "neutral": 0.10,
        "sad": 0.03,
        "angry": 0.01,
        "surprised": 0.01,
        "fearful": 0.00,
        "disgusted": 0.00
      },
      "dominantEmotion": "happy",
      "dominantScore": 0.85
    }
  ],
  "frameSize": {
    "width": 640,
    "height": 480
  },
  "videoTopic": "aeroswift/terminal1/camera/gate1",
  "model": "YOLOV8N-FACE-ONNX",
  "emotionDetection": true
}
```

### 3. Console Output

When faces with emotions are detected, you'll see console output like:

```
Faces detected: 1 (confidence >= 0.5)
  Face 1: 92.3% confidence - happy (85.0%)
```

## Troubleshooting

### Models Not Loading

If you see "Failed to load emotion detection models", ensure:
1. You ran `npm install` to install `@vladmandic/face-api`
2. You ran `npm run download-models` to copy the models
3. All 4 model files are present in the `models/` directory
4. File permissions allow reading the model files

You can verify the models are present:
```bash
ls -lh models/ | grep -E "(tiny_face|face_expression)"
```

You should see:
- `tiny_face_detector_model-weights_manifest.json` (~3 KB)
- `tiny_face_detector_model.bin` (~189 KB)
- `face_expression_model-weights_manifest.json` (~7 KB)
- `face_expression_model.bin` (~322 KB)

### Emotion Detection Disabled

If emotion detection is disabled but face detection works:
1. Check that `ENABLE_EMOTION_DETECTION=true` in `.env`
2. Verify models are in the correct directory
3. Check console logs for specific error messages

### Performance Issues

If detection is slow:
1. Increase `DETECTION_INTERVAL_MS` (e.g., 3000 or 5000)
2. Reduce video resolution from ESP32
3. Consider running on a more powerful machine

### No Emotions Detected

If faces are detected but no emotions:
1. Ensure faces are frontal or near-frontal
2. Check lighting conditions (too dark/bright affects accuracy)
3. Verify face size is adequate (at least 48x48 pixels)

## Performance Considerations

- **Processing Time**: Emotion detection adds ~100-300ms per face
- **Recommended Interval**: 2000ms or higher for smooth streaming
- **Multiple Faces**: Processed sequentially, time increases linearly
- **Best Results**: Frontal faces, good lighting, faces > 48x48 pixels

## Disabling Emotion Detection

To disable emotion detection but keep face detection:

```bash
ENABLE_FACE_DETECTION=true
ENABLE_EMOTION_DETECTION=false
```

This will publish analytics with face bounding boxes but without emotion data.
