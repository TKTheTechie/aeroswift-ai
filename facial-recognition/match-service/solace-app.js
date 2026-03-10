import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
expand(config({
  path: [resolve(__dirname, '../../common-properties/.env'), resolve(__dirname, '.env')]
}));
import { QdrantClient } from '@qdrant/js-client-rest';
import { loadModels, getFaceEmbedding } from './face.js';
import { connectSolace, publishToTopic } from './solace.js';

const COLLECTION = process.env.QDRANT_COLLECTION || 'flyers';
const MATCH_THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD) || 0.90;
const RESULT_TOPIC = process.env.FACE_MATCH_RESULT_TOPIC || 'aeroswift/face/match/result';

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });

(async function bootstrap() {
  try {
    console.log('🔄 Loading face recognition models...');
    await loadModels();
    console.log('✅ Face models loaded');

    console.log('🔄 Connecting to Solace...');
    connectSolace(onMessage);
  } catch (e) {
    console.error('❌ Match service startup failed', e);
    process.exit(1);
  }
})();

async function onMessage(msg) {
  const messageId = msg.getCorrelationId?.() || 'no-id';

  try {
    const attachment = msg.getBinaryAttachment();
    if (!attachment) throw new Error('Message has no binary attachment');

    const payload = JSON.parse(attachment.toString());
    if (!payload.imageBase64) throw new Error('Missing imageBase64');

    const buffer = Buffer.from(payload.imageBase64, 'base64');

    const vector = await getFaceEmbedding(buffer);

    const results = await qdrant.search(COLLECTION, {
      vector,
      limit: 1,
      with_payload: true
    });

    const result = {
      timestamp: new Date().toISOString(),
      matched: false,
      flyerId: null,
      confidence: 0,
      messageId
    };

    if (results.length > 0) {
      const best = results[0];
      result.confidence = Number(best.score.toFixed(4));

      if (best.score >= MATCH_THRESHOLD) {
        result.matched = true;
        result.flyerId = best.payload?.flyerId;
        console.log(`✅ MATCH: flyerId=${result.flyerId}, confidence=${result.confidence}`);
      } else {
        console.log(`❌ NO MATCH: confidence=${result.confidence}`);
      }
    } else {
      console.log('❌ NO MATCH: no results from Qdrant');
    }

    publishToTopic(RESULT_TOPIC, result);

  } catch (err) {
    console.error('❌ Error processing message:', err.message, { messageId });
    throw err; // no ACK → redelivery
  }
}
