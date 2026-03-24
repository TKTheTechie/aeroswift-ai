// enroll-service/index.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { QdrantClient } from '@qdrant/js-client-rest';
import { loadModels, getFaceEmbedding } from './face.js';


const app = express();

// Enable CORS for all routes – very permissive, good for local dev only
app.use(cors({
  origin: true,               // reflect request origin (allows localhost, 127.0.0.1, null, etc.)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false          // set true only if you later use cookies/auth
}));


app.use(bodyParser.json({ limit: '10mb' }));

const COLLECTION = 'flyers';
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

(async function bootstrap() {
  await loadModels();

  // Ensure collection exists with CORRECT vector size
  try {
    await qdrant.getCollection(COLLECTION);
    console.log(`ℹ️ Collection '${COLLECTION}' already exists`);
  } catch {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: 128, distance: 'Cosine' }
    });
    console.log(`✅ Collection '${COLLECTION}' created`);
  }

  console.log('🟢 Enroll Service ready on port 3001');
})();


app.post("/enroll", async (req, res) => {
  try {
    console.log("Request keys:", Object.keys(req.body));
    const { flyerId, imageBase64 } = req.body;
    const buffer = Buffer.from(imageBase64, "base64");
    console.log("Decoded buffer size:", buffer.length);

    // 🔴 ADD THIS
    const meta = await import("sharp").then(s =>
      s.default(buffer).metadata()
    );
    console.log("Image metadata:", meta);

    const vector = await getFaceEmbedding(buffer);
    console.log("Embedding length:", vector.length);

    const pointId = Date.now(); // or incrementing counter

    await qdrant.upsert("flyers", {
      points: [{
        id: pointId,
        vector,
        payload: { flyerId }
      }]
    });

    res.json({ status: "ENROLLED", flyerId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


app.listen(3001);

