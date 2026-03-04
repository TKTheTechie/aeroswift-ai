import fs from "fs";
import solace from "solclientjs";

solace.SolclientFactory.init({
  profile: solace.SolclientFactoryProfiles.version10
});

const session = solace.SolclientFactory.createSession({
  url: "ws://ec2-54-85-138-239.compute-1.amazonaws.com:8008",
  vpnName: "nats-connector",
  userName: "default",
  password: "nats",

  connectRetries: 3,
  reconnectRetries: -1,
  logLevel: solace.LogLevel.WARN
});

session.on(solace.SessionEventCode.UP_NOTICE, () => {
  console.log("✅ Connected to Solace → sending test message to topic face/match");

  try {
    //const imageBase64 = fs.readFileSync("../images/F0004_TK2.jpg").toString("base64");
    //const imageBase64 = fs.readFileSync("../images/F0004_TK3.jpg").toString("base64");
    const imageBase64 = fs.readFileSync("../images/F0002_SUMEET2.jpg").toString("base64");
    //const imageBase64 = fs.readFileSync("../images/BP3.jpg").toString("base64");
    //const imageBase64 = fs.readFileSync("../images/JB1.jpg").toString("base64");

    const message = solace.SolclientFactory.createMessage();

    message.setBinaryAttachment(JSON.stringify({
      imageBase64: imageBase64,
      source: "publish-test-script",
      timestamp: new Date().toISOString()
    }));

    // Publish to TOPIC (this matches your queue subscription)
    message.setDestination(
      solace.SolclientFactory.createTopicDestination("face/match")
    );

    message.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);
    message.setCorrelationId("test-" + Date.now());

    session.send(message);

    console.log("📤 Message sent to topic: face/match (will be routed to FACE.MATCH.QUEUE)");

    // Clean disconnect after a short delay
    setTimeout(() => {
      session.disconnect();
      process.exit(0);
    }, 1000);

  } catch (err) {
    console.error("❌ Error sending message:", err);
    session.disconnect();
    process.exit(1);
  }
});

session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (e) => {
  console.error("❌ Connection failed:", e.infoStr);
  process.exit(1);
});

session.on(solace.SessionEventCode.DISCONNECTED, () => {
  console.log("🔌 Disconnected cleanly");
});

session.connect();
