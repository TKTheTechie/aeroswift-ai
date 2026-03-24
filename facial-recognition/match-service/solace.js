
import solace from "solclientjs";

solace.SolclientFactory.init({
  profile: solace.SolclientFactoryProfiles.version10
});

let _session = null;

export function connectSolace(onMessage) {

  const session = solace.SolclientFactory.createSession({
    url: process.env.SOLACE_URL,
    vpnName: process.env.SOLACE_VPN,
    userName: process.env.SOLACE_USERNAME,
    password: process.env.SOLACE_PASSWORD,

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

  _session = session;

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

export function publishToTopic(topic, payload) {
  if (!_session) {
    console.error('[Solace] Cannot publish — no active session');
    return;
  }
  const message = solace.SolclientFactory.createMessage();
  message.setBinaryAttachment(JSON.stringify(payload));
  message.setDestination(solace.SolclientFactory.createTopicDestination(topic));
  message.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
  _session.send(message);
}


function subscribeToQueue(session, onMessage) {
  const queueName = process.env.FACE_MATCH_QUEUE || 'FACE.MATCH.QUEUE';
  console.log(`[Solace] 🔄 Attempting to bind consumer to queue: ${queueName}`);

  const messageConsumer = session.createMessageConsumer({
    queueDescriptor: {
      name: queueName,
      type: solace.QueueType.QUEUE
    },
    acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT,
    activeIndicationEnabled: true,
    createIfMissing: true,
    queueProperties: {
      accessType: solace.QueueAccessType.NON_EXCLUSIVE,
      maxMsgSpoolUsage: 5000,
      permission: solace.QueuePermissions.CONSUME
    }
  });

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
    messageConsumer.connect();
  } catch (err) {
    console.error("[Solace] Failed to call connect()", err);
  }
}
