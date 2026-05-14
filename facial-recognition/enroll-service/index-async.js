// enroll-service/index-async.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { loadModels, getFaceEmbedding } from './face.js';

// ====================== Solace Setup ======================
import pkg from 'solclientjs';
const solace = pkg;

const app = express();

// Very permissive CORS for local dev
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false
}));

app.use(bodyParser.json({ limit: '10mb' }));

let session = null;
let solaceConnected = false;           // ← This flag fixes the error
const SOLACE_TOPIC = 'aeroswift/enroll/flyer';

// ====================== Bootstrap ======================
(async function bootstrap() {
  await loadModels();

  // Initialize Solace client
  solace.SolclientFactory.init({
    profile: solace.SolclientFactoryProfiles.version10
  });

//  session = solace.SolclientFactory.createSession({
//    url: "ws://localhost:8008",           // ← CHANGE TO YOUR SOLACE HOST
//    vpnName: "default",                    // ← CHANGE IF NEEDED
//    userName: "default",                   // ← CHANGE
//    password: "default",                   // ← CHANGE
//    connectTimeoutInMsecs: 10000,
//    transportDownNotification: true,
//  });
  session = solace.SolclientFactory.createSession({
    url: "ws://ec2-54-85-138-239.compute-1.amazonaws.com:8008",           // ← CHANGE TO YOUR SOLACE HOST
    vpnName: "nats-connector",                    // ← CHANGE IF NEEDED
    userName: "natsmi",                   // ← CHANGE
    password: "nats",                   // ← CHANGE
    connectTimeoutInMsecs: 10000,
    transportDownNotification: true,
  });

  // ====================== Event Handlers ======================
  session.on(solace.SessionEventCode.UP_NOTICE, () => {
    solaceConnected = true;
    console.log('✅ Solace session connected');
  });

  session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (err) => {
    solaceConnected = false;
    console.error('❌ Solace connection failed:', err);
  });

  session.on(solace.SessionEventCode.DISCONNECTED, () => {
    solaceConnected = false;
    console.warn('⚠️ Solace session disconnected');
  });

  session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, (err) => {
    console.error('⚠️ Subscription error:', err);
  });

  // Connect to Solace
  try {
    session.connect();
  } catch (e) {
    console.error('Failed to start Solace connection:', e);
  }

  console.log('🟢 Enroll Service ready on port 3001');
  console.log(`📤 Will publish embeddings to topic: ${SOLACE_TOPIC}`);
})();

// ====================== ENROLL ENDPOINT ======================
app.post("/enroll", async (req, res) => {
  try {
    console.log("Request keys:", Object.keys(req.body));
    const { flyerId, imageBase64 } = req.body;

    if (!flyerId || !imageBase64) {
      return res.status(400).json({ error: "flyerId and imageBase64 are required" });
    }

    const buffer = Buffer.from(imageBase64, "base64");
    console.log("Decoded buffer size:", buffer.length);

    // Optional: image metadata
    const meta = await import("sharp").then(s =>
      s.default(buffer).metadata()
    );
    console.log("Image metadata:", meta);

    // Generate face embedding
    const vector = await getFaceEmbedding(buffer);
    console.log("Embedding length:", vector.length);

    const payload = {
      flyerId,
      embedding: vector,
      pointId: Date.now(),
      enrolledAt: new Date().toISOString(),
      source: "enroll-service-nodejs"
    };

    // Use our reliable flag instead of session.isConnected()
    if (!session || !solaceConnected) {
      return res.status(503).json({ 
        error: "Solace broker is not connected yet. Please wait a moment and try again." 
      });
    }

    // Create and send message
    const message = solace.SolclientFactory.createMessage();
    message.setDestination(
      solace.SolclientFactory.createTopicDestination(SOLACE_TOPIC)
    );
    message.setBinaryAttachment(JSON.stringify(payload));
    message.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);

    session.send(message);

    console.log(`📤 Published enrollment for flyerId: ${flyerId}`);

    res.json({ 
      status: "ENROLLED", 
      flyerId,
      message: "Flyer queued successfully. Micro-Integration will store it in Qdrant."
    });

  } catch (e) {
    console.error("Enroll error:", e);
    res.status(400).json({ error: e.message });
  }
});

app.listen(3001, () => {
  console.log("🚀 Server listening on port 3001");
});
