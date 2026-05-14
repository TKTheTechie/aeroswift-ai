const { QdrantClient } = require('@qdrant/js-client-rest');

const COLLECTION = 'flyers';
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

async function checkFlyersCount() {
  try {
    console.log(`🔍 Checking collection: ${COLLECTION}...\n`);

    const info = await qdrant.getCollection(COLLECTION);

    console.log(`✅ Collection: ${COLLECTION}`);
    console.log(`📊 Total Flyers (Points): ${info.points_count || 0}`);
    console.log(`📐 Vector Size: ${info.config.params.vectors.size}`);
    console.log(`⏱️  Last Updated: ${new Date().toISOString()}`);
    console.log(`────────────────────────────────────`);

    if (info.points_count === 0) {
      console.log("ℹ️  Collection is empty.");
    }

  } catch (error) {
    console.error("❌ Error checking collection:", error.message);
    if (error.status === 404) {
      console.error(`   Collection '${COLLECTION}' does not exist yet.`);
    }
  }
}

checkFlyersCount();
