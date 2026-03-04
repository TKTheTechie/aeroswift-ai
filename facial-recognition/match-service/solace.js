
import solace from "solclientjs";

solace.SolclientFactory.init({
  profile: solace.SolclientFactoryProfiles.version10
});

export function connectSolace(onMessage) {
  const session = solace.SolclientFactory.createSession({
    url: "ws://ec2-54-85-138-239.compute-1.amazonaws.com:8008",
    vpnName: "nats-connector",
    userName: "default",
    password: "nats",

    // --- Reliability ---
    connectRetries: 3,
    reconnectRetries: -1,
    reconnectRetryWaitInMillis: 3000,

    // --- Performance ---
    keepAliveIntervalInMsecs: 10000,
    keepAliveLimit: 5,

    // --- Logging ---
    logLevel: solace.LogLevel.WARN
  });

  session.on(solace.SessionEventCode.UP_NOTICE, () => {
    console.log("✅ Connected to Solace");
    subscribeToQueue(session, onMessage);
  });

  session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (e) => {
    console.error("❌ Solace connection failed", e.infoStr);
  });

  session.on(solace.SessionEventCode.DISCONNECTED, () => {
    console.warn("⚠️ Solace disconnected, retrying...");
  });

  session.connect();
}


function subscribeToQueue(session, onMessage) {
  const queueName = "FACE.MATCH.QUEUE";
  console.log(`[Solace] 🔄 Attempting to bind consumer to queue: ${queueName}`);

  const messageConsumer = session.createMessageConsumer({
    queueDescriptor: {
      name: queueName,
      type: solace.QueueType.QUEUE
    },
    acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT,
    activeIndicationEnabled: true,      // shows ACTIVE/INACTIVE in UI
    createIfMissing: true,              // auto-create (if user has permission)
    queueProperties: {
      accessType: solace.QueueAccessType.NON_EXCLUSIVE,
      maxMsgSpoolUsage: 5000,
      permission: solace.QueuePermissions.CONSUME
    }
  });

  // === DEBUG: Log EVERY possible event ===
  const events = [
    solace.MessageConsumerEventName.UP,
    solace.MessageConsumerEventName.DOWN,
    solace.MessageConsumerEventName.ACTIVE,
    solace.MessageConsumerEventName.INACTIVE,
    solace.MessageConsumerEventName.CONNECT_FAILED_ERROR,
    solace.MessageConsumerEventName.DOWN_ERROR,
    solace.MessageConsumerEventName.SUBSCRIPTION_ERROR,
    solace.MessageConsumerEventName.SUBSCRIPTION_OK
  ];

  events.forEach(eventName => {
    messageConsumer.on(eventName, (e) => {
      const info = e && (e.infoStr || e) ? (e.infoStr || e) : "no details";
      console.log(`[Solace Consumer] ${eventName} → ${info}`);
    });
  });

  // Message handler (async-safe)
  messageConsumer.on(solace.MessageConsumerEventName.MESSAGE, async (msg) => {
    const msgId = msg.getCorrelationId() || msg.getSenderId() || "no-id";
    console.log(`[Solace] 📨 Received ${msgId}`);
    try {
      await onMessage(msg);
      msg.acknowledge();
      console.log(`[Solace] ✅ ACKed ${msgId}`);
    } catch (err) {
      console.error(`[Solace] ❌ Processing failed ${msgId}`, err);
    }
  });

  console.log("[Solace] Connecting consumer (this will bind to queue)...");
  try {
    messageConsumer.connect();   // ←←← THIS WAS THE MISSING PIECE
  } catch (err) {
    console.error("[Solace] Failed to call connect()", err);
  }
}
