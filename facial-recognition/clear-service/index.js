const express = require('express');
const { QdrantClient } = require('@qdrant/js-client-rest');

const app = express();
const PORT = 3004;
const COLLECTION = 'flyers';

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

app.use(express.json());

app.post('/clear', async (req, res) => {
  try {
    // Safety check - must explicitly confirm
    if (req.body.confirm !== true) {
      return res.status(400).json({
        error: 'Missing confirmation. Send { "confirm": true } in the body.'
      });
    }

    console.log(`🗑️  [CLEAR SERVICE] Deleting ALL points from collection: ${COLLECTION}`);

    const result = await qdrant.delete(COLLECTION, {
      filter: {}        // empty filter = delete everything
    });

    // Get updated count
    const info = await qdrant.getCollection(COLLECTION);

    console.log(`✅ Cleared ${info.points_count || 0} points remaining`);

    res.json({
      success: true,
      message: `All data cleared from collection '${COLLECTION}'`,
      points_remaining: info.points_count || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Clear service error:', error);
    res.status(500).json({
      error: error.message || 'Failed to clear collection'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'clear-service', collection: COLLECTION });
});

app.listen(PORT, () => {
  console.log(`🚀 Clear service running on http://localhost:${PORT}`);
});
