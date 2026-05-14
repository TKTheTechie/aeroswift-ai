// verification-service/index.js
import express from 'express';
import cors from 'cors';
import { QdrantClient } from '@qdrant/js-client-rest';

const app = express();
const COLLECTION = 'flyers';
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

app.use(cors({
  origin: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// ====================== Bootstrap + Auto Create Collection ======================
(async function bootstrap() {
  try {
    // Check if collection exists
    await qdrant.getCollection(COLLECTION);
    console.log(`✅ Collection '${COLLECTION}' already exists`);
  } catch (e) {
    // Collection does not exist → create it (same settings as original Node.js + Java handler)
    console.log(`📦 Collection '${COLLECTION}' not found. Creating it now...`);

    await qdrant.createCollection(COLLECTION, {
      vectors: {
        size: 128,
        distance: 'Cosine'
      }
    });

    console.log(`✅ Collection '${COLLECTION}' created successfully (size: 128, distance: Cosine)`);
  }

  console.log('🟢 Verification Service ready on port 3003');
})();

// ====================== VERIFY ENDPOINT ======================
app.get('/verify/:flyerId', async (req, res) => {
  const { flyerId } = req.params;

  try {
    const result = await qdrant.scroll(COLLECTION, {
      filter: {
        must: [
          {
            key: "flyerId",
            match: { value: flyerId }
          }
        ]
      },
      limit: 1,
      with_payload: true,
      with_vector: false
    });

    const exists = result.points.length > 0;
    const point = exists ? result.points[0] : null;

    res.json({
      flyerId,
      enrolled: exists,
      verifiedAt: new Date().toISOString(),
      pointId: point ? point.id : null,
      message: exists ? "Flyer successfully stored in Qdrant" : "Still processing in queue..."
    });
  } catch (e) {
    console.error('Verification error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3003, () => {
  console.log("🚀 Verification server listening on port 3003");
});
