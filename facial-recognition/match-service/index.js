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
const MATCH_THRESHOLD = 0.92;   // strict to avoid false positives
const GAP_THRESHOLD = 0.05;     // margin vs 2nd best

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

// ---- Bootstrap ----
(async function bootstrap() {
  try {
    console.log('🔄 Loading face recognition models...');
    await loadModels();
    console.log('✅ Face models loaded');

    console.log('🟢 Match Service (Express) ready on port 3002');
  } catch (e) {
    console.error('❌ Failed to start match-service', e);
    process.exit(1);
  }
})();

// ---- Match Endpoint ----
app.post('/match', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    const buffer = Buffer.from(imageBase64, 'base64');

    console.time('face-embedding');
    const vector = await getFaceEmbedding(buffer);
    console.timeEnd('face-embedding');

    console.time('qdrant-search');
    const results = await qdrant.search(COLLECTION, {
      vector,
      limit: 2,
      with_payload: true
    });
    console.timeEnd('qdrant-search');

    if (results.length === 0) {
      return res.json({ MATCH: false, confidence: 0 });
    }

    const best = results[0];
    const second = results[1];

    const confidence = Number(best.score.toFixed(4));
    const gap = second ? Number((best.score - second.score).toFixed(4)) : null;

    const isMatch =
      confidence >= MATCH_THRESHOLD &&
      (gap === null || gap >= GAP_THRESHOLD);

    let respJson = {};

    if (isMatch) {
      respJson = {
        MATCH: isMatch,
        flyerId: isMatch ? best.payload?.flyerId : null,
        confidence,
        gap,
        candidates: results.map(r => ({
          flyerId: r.payload?.flyerId,
          score: Number(r.score.toFixed(4))
        }))
      };

      console.log(respJson);
    } else {
      respJson = { MATCH: false, flyerId: null };
      console.log(respJson); 
    }

	/*
    return res.json({
      MATCH: isMatch,
      flyerId: isMatch ? best.payload?.flyerId : null,
      confidence,
      gap,
      candidates: results.map(r => ({
        flyerId: r.payload?.flyerId,
        score: Number(r.score.toFixed(4))
      }))
    });
	*/
    return res.json(respJson);


  } catch (err) {
    console.error('❌ Match error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.listen(3002);

