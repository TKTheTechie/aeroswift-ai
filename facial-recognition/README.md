# Facial Recognition Demo (Enroll & Match Services)

This project demonstrates **face recognition using vector similarity search** with:
- **Node.js (ESM)**
- **@vladmandic/face-api**
- **Qdrant (Vector Database)**
- **REST-based Enroll & Match services**


---

## 1. Architecture Overview

### High-Level Flow

```
                +------------------+
                |   Client / REST  |
                |  (curl / Postman)|
                +---------+--------+
                          |
                Enroll Face (REST)
                          |
                          v
+------------------+   Face Embedding   +------------------+
| Enroll Service   |------------------>|     Qdrant       |
| (Node.js +       |   128-d vector     |  Vector DB       |
|  face-api)       |                   |  (Cosine)        |
+------------------+                   +------------------+

                Match Face (REST)
                          |
                          v
+------------------+   Face Embedding   +------------------+
| Match Service    |------------------>|     Qdrant       |
| (Node.js +       |   Similarity      |  Top-K Search    |
|  face-api)       |                   |                  |
+------------------+
```

---

## 2. Key Design Decisions

### Why face-api?
- Battle-tested JS face recognition
- Produces **L2-normalized descriptors**
- Avoids ONNX / TensorFlow native instability issues

### Why Qdrant?
- Native cosine similarity
- Excellent Node.js client
- Clean REST + gRPC APIs
- Payload support (flyerId metadata)

### Why Cosine Similarity?
- Face embeddings are directional vectors
- Cosine is standard for face recognition systems

---

## 3. Prerequisites

### System
- **Node.js v18.x or v20.x**
- **Docker** (for Qdrant)
- macOS / Linux (Windows may need extra canvas deps)

### Verify
```bash
node -v
docker --version
```

---

## 4. Project Structure

```
facial-recognition-demo/
├── models/
│   └── face-api/
│       ├── ssd_mobilenetv1_model.bin
│       ├── ssd_mobilenetv1_model-weights_manifest.json
│       ├── face_landmark_68_model.bin
│       ├── face_landmark_68_model-weights_manifest.json
│       ├── face_recognition_model.bin
│       └── face_recognition_model-weights_manifest.json
│
├── enroll-service/
│   ├── index.js
│   ├── face.js
│   └── package.json
│
├── match-service/
│   ├── index.js
│   ├── face.js
│   └── package.json
│
└── README.md
```

---

## 5. Install Dependencies

Run **inside each service folder**.

### Enroll Service
```bash
cd enroll-service
npm install
```

### Match Service
```bash
cd match-service
npm install
```

---

## 6. Download Face-API Models

Create model directory:
```bash
mkdir -p models/face-api
cd models/face-api
```

Download **ONLY required models**:

```bash
curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/ssd_mobilenetv1_model.bin
curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/ssd_mobilenetv1_model-weights_manifest.json

curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_landmark_68_model.bin
curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_landmark_68_model-weights_manifest.json

curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model.bin
curl -O https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/face_recognition_model-weights_manifest.json
```

> ⚠️ Do NOT rename files. face-api loads by exact filenames.

---

## 7. Run Qdrant

```bash
cd docker
docker compose -f qdrant.yaml up -d
or
docker run -d   --name qdrant   -p 6333:6333   qdrant/qdrant
```

Verify:
```bash
curl http://localhost:6333/collections
```

---

## 8. Run Enroll Service

From repo root:
```bash
node enroll-service/index.js
```

Expected:
```
🔄 Loading face-api models...
✅ face-api models loaded
🟢 Enroll Service ready on port 3001
```

---

## 9. Run Match Service

From repo root:
```bash
node match-service/index.js
```

Expected:
```
🔄 Loading face recognition models...
✅ Face models loaded
🟢 Match Service ready on port 3002
```

---

## 10. Testing via REST

### Enroll a Face

```bash
IMAGE_B64=$(base64 person1.jpg | tr -d '\n')

curl -X POST http://localhost:3001/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "flyerId": "F0001",
    "imageBase64": "'"$IMAGE_B64"'"
  }'
```

---

### Match a Face

```bash
IMAGE_B64=$(base64 person1_test.jpg | tr -d '\n')

curl -X POST http://localhost:3002/match \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "'"$IMAGE_B64"'"
  }'
```

---

## 11. Match Response Explained

```json
{
  "MATCH": true,
  "flyerId": "F0004",
  "confidence": 0.9553,
  "gap": 0.0619,
  "candidates": [
    { "flyerId": "F0004", "score": 0.9553 },
    { "flyerId": "F0001", "score": 0.8934 }
  ]
}
```

### Meaning
- **confidence** → Qdrant cosine similarity
- **gap** → difference between top-1 and top-2 matches
- **MATCH** → application decision

---

## 12. Threshold Tuning (Important)

Recommended:
```js
CONFIDENCE_THRESHOLD = 0.90
GAP_THRESHOLD = 0.05
```

Reject if:
- confidence < threshold
- OR gap < threshold

This dramatically reduces false positives.

---

## 13. Common Pitfalls

- ❌ Using ArcFace without face detection
- ❌ Not L2-normalizing embeddings
- ❌ Using low confidence thresholds
- ❌ Running from wrong working directory
- ❌ Mixing Node 20 + native TF bindings

---

## 14. Production Notes

For production:
- Multiple images per identity
- Averaged embeddings
- Separate detection & recognition
- GPU acceleration
- Audit logging

---

## 15. License

Demo / educational use.

---

✅ **This README reflects a correct, production-grade facial recognition demo architecture.**
