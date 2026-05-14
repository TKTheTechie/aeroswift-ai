const { QdrantClient } = require('@qdrant/js-client-rest');

const COLLECTION = 'flyers';
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

async function deleteAllData() {
  try {
    console.log(`🗑️  Deleting ALL points from collection: ${COLLECTION}...`);

    const result = await qdrant.delete(COLLECTION, {
      filter: {}          // Empty filter = delete everything
    });

    console.log('✅ Successfully deleted all data from flyers collection');
    console.log('Result:', result);

    // Optional: verify how many points are left
    const info = await qdrant.getCollection(COLLECTION);
    console.log(`📊 Points remaining: ${info.points_count || 0}`);

  } catch (error) {
    console.error('❌ Error deleting data:', error.message);
    if (error.status) console.error('Status:', error.status);
  }
}

deleteAllData();
