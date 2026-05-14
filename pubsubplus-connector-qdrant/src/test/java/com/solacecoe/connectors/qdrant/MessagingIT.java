package com.solacecoe.connectors.qdrant;

import com.solacecoe.connectors.qdrant.client.QdrantClient;
import com.solacecoe.connectors.qdrant.extension.QdrantExtension;
import com.solace.connector.test.resources.PubSubPlusExtension;
import com.solace.connector.test.resources.resource.ConnectorArgsBuilder;
import com.solace.connector.test.resources.resource.SolaceMessaging;
import com.solace.connector.test.resources.resource.SolaceQueue;
import com.solacesystems.common.util.ByteArray;
import com.solacesystems.jcsmp.BytesMessage;
import com.solacesystems.jcsmp.JCSMPException;
import com.solacesystems.jcsmp.JCSMPFactory;
import com.solacesystems.jcsmp.MapMessage;
import com.solacesystems.jcsmp.Queue;
import com.solacesystems.jcsmp.SDTException;
import com.solacesystems.jcsmp.SDTMap;
import com.solacesystems.jcsmp.SDTStream;
import com.solacesystems.jcsmp.StreamMessage;
import com.solacesystems.jcsmp.TextMessage;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@Disabled("Qdrant functionality needs to be implemented.")
@ExtendWith({PubSubPlusExtension.class, QdrantExtension.class})
class MessagingIT {

    private static final String SPRING_PROFILE = "messaging";

    private static final String SOURCE_DESTINATION = "source-destination";
    private static final String TARGET_DESTINATION = "target-destination";

    @BeforeAll
    static void setup(@SolaceQueue(name = "input-0") Queue input0,
                      @SolaceQueue(name = "output-1") Queue output1,
                      QdrantClient qdrantClient) {
        qdrantClient.createDestination(SOURCE_DESTINATION);
        qdrantClient.createDestination(TARGET_DESTINATION);
    }

    @AfterAll
    static void cleanup(QdrantClient qdrantClient) {
        qdrantClient.deleteDestination(SOURCE_DESTINATION);
        qdrantClient.deleteDestination(TARGET_DESTINATION);
    }

    @Test
    void testHealth(QdrantClient qdrantClient,
                    ConnectorArgsBuilder argsBuilder) {

        // Add other required properties to the argsBuilder as needed
        argsBuilder.workflowEnable(0, true);

        try (ConfigurableApplicationContext ignored = new SpringApplicationBuilder(QdrantMicroIntegration.class)
                .profiles(SPRING_PROFILE)
                .run(argsBuilder.build())) {

            RestTemplate restTemplate = new RestTemplate();
            String url = UriComponentsBuilder.fromUriString(qdrantClient.getBaseUrl())
                    .path("/actuator/health")
                    .toUriString();
            Awaitility.await()
                    .atMost(10, TimeUnit.SECONDS)
                    .untilAsserted(() -> {
                        String response = restTemplate.getForObject(url, String.class);
                        assertThat(response).contains("\"status\":\"UP\"");
                    });
        }
    }

    @Test
    void qdrantToSolaceMessagingTest(SolaceMessaging solaceMessaging,
                                                QdrantClient qdrantClient,
                                                ConnectorArgsBuilder argsBuilder) throws JCSMPException {
        // Add other required properties to the argsBuilder as needed
        argsBuilder.workflowEnable(1, true);

        //Start the MicroIntegration application
        try (ConfigurableApplicationContext ignored = new SpringApplicationBuilder(QdrantMicroIntegration.class)
                .profiles(SPRING_PROFILE)
                .run(argsBuilder.build())) { // Passes properties to the application

            //Produces 1 message to workflow-1's input queue
            String payload = "{\"payload\": \"%s\"}".formatted(UUID.randomUUID().toString());
            Map<String, String> properties = Map.of("foo", "bar");
                qdrantClient.publish(SOURCE_DESTINATION, payload, properties);

            //Retrieves the processed message from workflow-1's output queue and assert for correctness
            solaceMessaging.consumeAndAssert(1, 1, msg -> {
                assertThat(msg).isInstanceOf(TextMessage.class);
                TextMessage textMessage = (TextMessage) msg;
                assertThat(textMessage.getText()).isEqualTo(payload);
            });
        }
    }

    @Test
    void solaceToQdrantTextMessage(SolaceMessaging solaceMessaging,
                                                QdrantClient qdrantClient,
                                                ConnectorArgsBuilder argsBuilder) throws JCSMPException {
        // Add other required properties to the argsBuilder as needed
        int workflowIdx = 0;
        argsBuilder.workflowEnable(workflowIdx, true);

        //Start the MicroIntegration application
        try (ConfigurableApplicationContext ignored = new SpringApplicationBuilder(QdrantMicroIntegration.class)
                .profiles(SPRING_PROFILE)
                .run(argsBuilder.build())) { // Passes properties to the application

            //Produces 1 message to workflow-0's input queue
            String payload = "{\"payload\": \"%s\"}".formatted(UUID.randomUUID().toString());
            TextMessage message = JCSMPFactory.onlyInstance().createMessage(TextMessage.class);
            message.setText(payload);
            solaceMessaging.produceAsync(1, workflowIdx, () -> message);

            //Retrieves the processed message from workflow-0's output queue and assert for correctness
            String response = qdrantClient.receive(TARGET_DESTINATION, 10, TimeUnit.SECONDS);
            assertThat(response).isEqualTo(payload);
        }
    }

    @Test
    void solaceToQdrantBytesMessage(SolaceMessaging solaceMessaging,
                                                QdrantClient qdrantClient,
                                                ConnectorArgsBuilder argsBuilder) throws JCSMPException {
        int workflowIdx = 0;
        argsBuilder.workflowEnable(workflowIdx, true);

        try (ConfigurableApplicationContext ignored = new SpringApplicationBuilder(QdrantMicroIntegration.class)
                .profiles(SPRING_PROFILE)
                .run(argsBuilder.build())) {
            String payload = UUID.randomUUID().toString();
            solaceMessaging.produceAsync(1, workflowIdx, () -> {
                BytesMessage solMsg = (BytesMessage)JCSMPFactory.onlyInstance().createMessage(BytesMessage.class);
                solMsg.setData(payload.getBytes(StandardCharsets.UTF_8));
                return solMsg;
            });

            String response = qdrantClient.receive(TARGET_DESTINATION, 10, TimeUnit.SECONDS);
            //TODO: Assert for message correctness
        }

    }

    @Test
    void solaceToQdrantMapMessage(SolaceMessaging solaceMessaging,
                                                QdrantClient qdrantClient,
                                                ConnectorArgsBuilder argsBuilder) throws JCSMPException {
        int workflowIdx = 0;
        argsBuilder.workflowEnable(workflowIdx, true);

        try (ConfigurableApplicationContext ignored = new SpringApplicationBuilder(QdrantMicroIntegration.class)
                .profiles(SPRING_PROFILE)
                .run(argsBuilder.build())) {

            String payload = UUID.randomUUID().toString();
            solaceMessaging.produceAsync(1, workflowIdx, () -> {
                MapMessage solMsg = (MapMessage)JCSMPFactory.onlyInstance().createMessage(MapMessage.class);
                SDTMap mapPayload = JCSMPFactory.onlyInstance().createMap();

                try {
                    mapPayload.putString("key", payload);
                    mapPayload.putInteger("intKey", 1);
                    mapPayload.putBoolean("boolKey", true);
                    mapPayload.putByte("byteKey", (byte)97);
                    mapPayload.putBytes("bytesKey", payload.getBytes(StandardCharsets.UTF_8));
                    mapPayload.putCharacter("charKey", 'a');
                    mapPayload.putDouble("doubleKey", (double)1.0F);
                    mapPayload.putFloat("floatKey", 1.0F);
                    mapPayload.putShort("shortKey", Short.valueOf((short)1));
                    mapPayload.putLong("longKey", 123L);
                    mapPayload.putByteArray("byteArrayKey", new ByteArray(payload.getBytes(StandardCharsets.UTF_8)));
                    SDTMap nestedMap = JCSMPFactory.onlyInstance().createMap();
                    nestedMap.putString("nestedKey", "nestedValue1");
                    nestedMap.putBoolean("nestedBoolKey", true);
                    mapPayload.putMap("nestedMapKey", nestedMap);
                    SDTStream nestedStream = JCSMPFactory.onlyInstance().createStream();
                    nestedStream.writeString("nestedValue2");
                    nestedStream.writeBoolean(true);
                    mapPayload.putStream("nestedStreamKey", nestedStream);
                    solMsg.setMap(mapPayload);
                    return solMsg;
                } catch (SDTException e) {
                    throw new IllegalStateException(e);
                }
            });

            String response = qdrantClient.receive(TARGET_DESTINATION, 10, TimeUnit.SECONDS);
            //TODO: Assert for message correctness
        }

    }

    @Test
    void solaceToQdrantStreamMessage(SolaceMessaging solaceMessaging,
                                                QdrantClient qdrantClient,
                                                ConnectorArgsBuilder argsBuilder) throws JCSMPException {
        int workflowIdx = 0;
        argsBuilder.workflowEnable(workflowIdx, true);

        try (ConfigurableApplicationContext ignored = new SpringApplicationBuilder(QdrantMicroIntegration.class)
                .profiles(SPRING_PROFILE)
                .run(argsBuilder.build())) {

            String payload = UUID.randomUUID().toString();
            solaceMessaging.produceAsync(1, workflowIdx, () -> {
                StreamMessage solMsg = (StreamMessage)JCSMPFactory.onlyInstance().createMessage(StreamMessage.class);
                SDTStream streamPayload = JCSMPFactory.onlyInstance().createStream();

                try {
                    streamPayload.writeString(payload);
                    streamPayload.writeInteger(12);
                    streamPayload.writeBoolean(true);
                    streamPayload.writeByte((byte)97);
                    streamPayload.writeCharacter('a');
                    streamPayload.writeDouble((double)1.0F);
                    streamPayload.writeFloat(1.0F);
                    streamPayload.writeShort(Short.valueOf((short)1));
                    streamPayload.writeLong(123L);
                    streamPayload.writeBytes(payload.getBytes(StandardCharsets.UTF_8));
                    streamPayload.writeByteArray(new ByteArray(payload.getBytes(StandardCharsets.UTF_8)));
                    SDTMap nestedMap = JCSMPFactory.onlyInstance().createMap();
                    nestedMap.putString("nestedKey", "nestedValue");
                    nestedMap.putBoolean("nestedBoolKey", true);
                    streamPayload.writeMap(nestedMap);
                    SDTStream nestedStream = JCSMPFactory.onlyInstance().createStream();
                    nestedStream.writeString("nestedValue");
                    nestedStream.writeBoolean(true);
                    streamPayload.writeStream(nestedStream);
                    solMsg.setStream(streamPayload);
                    return solMsg;
                } catch (SDTException e) {
                    throw new IllegalStateException(e);
                }
            });

            String response = qdrantClient.receive(TARGET_DESTINATION, 10, TimeUnit.SECONDS);
            //TODO: Assert for message correctness
        }
    }



}
