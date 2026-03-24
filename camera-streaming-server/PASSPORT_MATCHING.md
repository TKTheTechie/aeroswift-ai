# Passport Biometric Matching

Verify passenger identity by comparing live camera feed against passport photo.

## Purpose

Enable touchless identity verification at airport gates using NFC-extracted passport photos.

## Prerequisites

- Passport photo extracted via NFC (use ReadID app on Android)
- face-api.js models downloaded

## Setup

### 1. Extract Passport Photo

Using ReadID app on Android:
1. Install ReadID Me from Play Store
2. Scan passport MRZ with camera
3. Tap phone to passport NFC chip
4. Share face photo to email/drive
5. Save as `face.jpg` in camera-streaming-server folder

### 2. Download Face Recognition Models
```bash
cd camera-streaming-server/models

curl -L -o ssd_mobilenetv1_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json
curl -L -o ssd_mobilenetv1_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1
curl -L -o ssd_mobilenetv1_model-shard2 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard2

curl -L -o face_landmark_68_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -L -o face_landmark_68_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1

curl -L -o face_recognition_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
curl -L -o face_recognition_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
curl -L -o face_recognition_model-shard2 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2

# Rename as needed
mv face_landmark_68_model-shard1 face_landmark_68_model.bin
```

### 3. Enable Face Matching

Update .env:
```bash
ENABLE_FACE_DETECTION=true
ENABLE_EMOTION_DETECTION=true
```

### 4. Start Camera Server
```bash
npm start
```

## How It Works

1. Server loads passport photo on startup
2. Extracts 128-dimensional face descriptor
3. When camera detects face, extracts its descriptor
4. Calculates Euclidean distance between descriptors
5. Match if distance < 0.6 threshold
6. Publishes result in analytics event

## Analytics Output
```json
{
  "passportMatch": {
    "match": true,
    "confidence": "0.850",
    "distance": "0.320"
  },
  "passenger": {
    "name": "Laurent Guillot",
    "loyaltyStatus": "Platinum Elite",
    "flightNumber": "AC 1234"
  }
}
```

## Troubleshooting

**Models not loading:**
- Check files exist in models/ folder
- Verify file sizes (should be KB/MB, not bytes)
- Re-download if corrupted

**No match detected:**
- Ensure face.jpg is clear, frontal view
- Check image size (640x640 works best)
- Verify ENABLE_FACE_DETECTION=true in .env

**Low confidence:**
- Use high-quality passport photo
- Ensure good lighting in live camera feed
- Adjust threshold in face-matcher.js if needed
