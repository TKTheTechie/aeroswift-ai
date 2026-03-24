#!/usr/bin/env bash
set -e

MODEL_DIR="models/face-api"
BASE_URL="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model"

echo "📁 Creating model directory: $MODEL_DIR"
mkdir -p "$MODEL_DIR"
cd "$MODEL_DIR"

echo "⬇️ Downloading face-api models from CDN..."

# ---- Face Detector (SSD Mobilenet v1) ----
curl -L -O "$BASE_URL/ssd_mobilenetv1_model.bin"
curl -L -O "$BASE_URL/ssd_mobilenetv1_model-weights_manifest.json"

# ---- Face Landmarks (68 points) ----
curl -L -O "$BASE_URL/face_landmark_68_model.bin"
curl -L -O "$BASE_URL/face_landmark_68_model-weights_manifest.json"

# ---- Face Recognition ----
curl -L -O "$BASE_URL/face_recognition_model.bin"
curl -L -O "$BASE_URL/face_recognition_model-weights_manifest.json"

echo "✅ Downloads complete"
echo
echo "📊 Verifying file sizes (sanity check)..."
ls -lh *.bin

echo
echo "✅ Expected sizes:"
echo "  ssd_mobilenetv1_model.bin        ~5.3 MB"
echo "  face_landmark_68_model.bin       ~350 KB"
echo "  face_recognition_model.bin       ~6.1 MB"

echo
echo "🎉 face-api models are ready to use!"

