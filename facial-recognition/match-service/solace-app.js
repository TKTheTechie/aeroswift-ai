// match-service/index.js
import { QdrantClient } from '@qdrant/js-client-rest';
import { loadModels, getFaceEmbedding } from './face.js';
import { connectSolace } from './solace.js';

const COLLECTION = 'flyers';
const MATCH_THRESHOLD = 0.90;

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

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

    if (results.length > 0) {
      const best = results[0];

      if (best.score >= MATCH_THRESHOLD) {
        console.log({
          MATCH: true,
          flyerId: best.payload?.flyerId,
          confidence: Number(best.score.toFixed(4)),
          messageId
        });
      } else {
        console.log({
          MATCH: false,
          confidence: Number(best.score.toFixed(4)),
          messageId
        });
      }
    } else {
      console.log({ MATCH: false, confidence: 0, messageId });
    }

  } catch (err) {
    console.error('❌ Error processing message:', err.message, { messageId });
    throw err; // no ACK → redelivery
  }
}

