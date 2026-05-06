# Facial Recognition Demo (Enroll & Match Services)

This project demonstrates **face recognition using vector similarity search** with:

* **Node.js (ESM)**
* **@vladmandic/face-api**
* **Qdrant (Vector Database)**
* **Solace PubSub+ (Event-driven ingestion)**
* **Java-based Micro-Integration service**

---

## 1. Architecture Overview

This project supports **two architectures**:

* **Synchronous (Direct Qdrant access)**
* **Asynchronous (Event-driven enrollment + synchronous match)**

---

## 🔹 A. Synchronous Architecture (Direct Qdrant)

### High-Level Flow

```
Client → Enroll Service → Qdrant  
Client → Match Service → Qdrant  
```

```
                +------------------+
                |   Client / REST  |
                +---------+--------+
                          |
                Enroll Face (REST)
                          |
                          v
+------------------+   Face Embedding   +------------------+
| Enroll Service   |------------------>|     Qdrant       |
| (Node.js)        |   128-d vector     |  Vector DB       |
+------------------+                   +------------------+

                Match Face (REST)
                          |
                          v
+------------------+   Face Embedding   +------------------+
| Match Service    |------------------>|     Qdrant       |
| (Node.js)        |                   |  Top-K Search    |
+------------------+                   +------------------+
```

---

## 🔹 B. Asynchronous Architecture

### Step 1 — Enrollment (Event-Driven)

```
Enroll Service → Solace → Qdrant Micro-Integration → Qdrant
```

```
+------------------+    Event     +-----------------------------+
| Enroll Service   |------------->|  Solace Topic / Queue       |
| (Node.js Async)  |              |  aeroswift/enroll/*         |
+------------------+              +-------------+---------------+
                                              |
                                              v
                                +-----------------------------+
                                | Qdrant Micro-Integration   |
                                | (Java Service)             |
                                | Writes to Qdrant           |
                                +-------------+---------------+
                                              |
                                              v
                                          +--------+
                                          | Qdrant|
                                          +--------+
```

---

### Step 2 — Verification (Lightweight Service)

```
Client → Verification-Service → Response
```

```
+-------------------------+
| Client / REST           |
+-----------+-------------+
            |
            v
+-------------------------+
| verification-service    |
| (Node.js)               |
| Validates Flyer ID      |
+-----------+-------------+
            |
            v
        Response
```

---

### Step 3 — Match 

```
Client → Match Service → Qdrant
```

```
+------------------+   Face Embedding   +------------------+
| Match Service    |------------------>|     Qdrant       |
| (Node.js)        |                   |  Top-K Search    |
+------------------+                   +------------------+
```

---

## 2. Key Components

### 🔹 Enroll Service (Node.js)

* Accepts face image via REST
* Generates **128-dimensional embedding**
* **Synchronous mode:** writes directly to Qdrant
* **Asynchronous mode:** publishes event to Solace

---

### 🔹 Qdrant Micro-Integration (Java)

* Consumes enrollment events from Solace
* Writes embeddings into Qdrant
* Provides:

  * retry handling
  * buffering
  * transformation
  * decoupling from database

---

### 🔹 verification-service (Node.js)

* Handles **verification requests (Flyer ID)**
* Lightweight service
* Can validate:

  * flyer existence
  * metadata
  * business rules
* Returns immediate response

---

### 🔹 Match Service (Node.js)

* Generates embedding from image
* Queries Qdrant
* Returns similarity results
* Same behavior in both architectures

---

### 🔹 Qdrant (Vector Database)

* Stores embeddings
* Performs cosine similarity search
* Returns top-K matches

---

## 3. Key Design Decisions

### Why face-api?

* Stable and production-friendly
* Generates normalized embeddings
* Avoids native dependency issues

### Why Qdrant?

* Native cosine similarity
* High-performance vector search
* Simple APIs

### Why Solace PubSub+?

* Decouples ingestion pipeline
* Enables async processing
* Supports buffering and retries

---

## 4. When to Use Which Architecture

| Scenario                   | Recommended Approach |
| -------------------------- | -------------------- |
| Quick demo                 | Synchronous          |
| Production ingestion       | Asynchronous         |
| High reliability ingestion | Asynchronous         |
| Low latency match          | Either               |
| Event-driven systems       | Asynchronous         |

---

## 5. Prerequisites

* Node.js v18.x or v20.x
* Docker
* Solace PubSub+ (for async mode)

```bash
node -v
docker --version
```

---

## 6. Project Structure

```
facial-recognition-demo/
├── enroll-service/
│   ├── index.js
│   ├── index-async.js
│
├── match-service/
│   ├── index.js
│
├── verification-service/
│   ├── index.js
│
├── models/
└── README.md
```

---

## 7. Install Dependencies

```bash
cd enroll-service && npm install
cd ../match-service && npm install
cd ../verification-service && npm install
```

---

## 8. Run Qdrant

```bash
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
```

---

## 9. Run Services

### Synchronous Mode

```bash
node enroll-service/index.js
node match-service/index.js
```

### Asynchronous Mode

```bash
node enroll-service/index-async.js
node verification-service/index.js
node match-service/index.js
```

---

## 10. Testing

### Enroll

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

### Match

```bash
IMAGE_B64=$(base64 person1_test.jpg | tr -d '\n')

curl -X POST http://localhost:3002/match \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "'"$IMAGE_B64"'"
  }'
```

---

## 11. Response Example

```json
{
  "MATCH": true,
  "flyerId": "F0004",
  "confidence": 0.9553
}
```

---

## 12. Threshold Tuning

```js
CONFIDENCE_THRESHOLD = 0.90
GAP_THRESHOLD = 0.05
```

---

## 13. Common Pitfalls

* Using wrong Solace event enums
* Incorrect Node module imports
* Missing model files
* Low confidence thresholds

---

## 14. Production Notes

* Use multiple images per identity
* Add retry handling in micro-integration
* Enable logging and monitoring
* Scale services independently

---

## 15. License

Demo / educational use.

---

## ✅ Summary

* ✔️ Synchronous architecture for simplicity
* ✔️ Asynchronous ingestion using Solace
* ✔️ Java micro-integration for enterprise-grade reliability
* ✔️ Match flow remains fast and direct

---

