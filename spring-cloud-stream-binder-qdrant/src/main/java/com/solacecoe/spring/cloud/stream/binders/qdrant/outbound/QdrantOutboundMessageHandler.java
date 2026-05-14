package com.solacecoe.spring.cloud.stream.binders.qdrant.outbound;

import com.solacecoe.spring.cloud.stream.binders.qdrant.properties.QdrantProducerProperties;
import com.solace.connector.core.io.header.ConnectorBinderHeaders;
import com.solace.connector.core.io.outbound.PublishAcknowledgmentCallback;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.QdrantGrpcClient;
import io.qdrant.client.grpc.Common.PointId;
import io.qdrant.client.grpc.JsonWithInt.Value;
import io.qdrant.client.grpc.Points.PointStruct;
import io.qdrant.client.grpc.Points.UpdateResult;

import io.qdrant.client.grpc.Collections.CollectionParams;
import io.qdrant.client.grpc.Collections.VectorParams;
import io.qdrant.client.grpc.Collections.VectorsConfig;
import io.qdrant.client.grpc.Collections.Distance;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.stream.binder.BinderHeaders;
import org.springframework.cloud.stream.binder.ExtendedProducerProperties;
import org.springframework.cloud.stream.provisioning.ProducerDestination;
import org.springframework.context.Lifecycle;
import org.springframework.integration.StaticMessageHeaderAccessor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.support.ErrorMessage;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import com.fasterxml.jackson.databind.ObjectMapper;

import static io.qdrant.client.ValueFactory.value;
import static io.qdrant.client.VectorsFactory.vectors;

public class QdrantOutboundMessageHandler implements MessageHandler, Lifecycle {

	private static final Logger LOGGER = LoggerFactory.getLogger(QdrantOutboundMessageHandler.class);

	private final ProducerDestination producerDestination;
	private final ExtendedProducerProperties<QdrantProducerProperties> producerProperties;
	private final MessageChannel errorChannel;
	private final String handlerId = UUID.randomUUID().toString();
	private final Object lifecycleLock = new Object();
	private volatile boolean running;

	private QdrantClient qdrantClient;
	private final ObjectMapper objectMapper = new ObjectMapper();

	// Runtime config
	private String collectionName;
	private String vectorFieldName;
	private String idFieldName;
	private Integer vectorSize;
	private boolean autoGenerateId;
	private List<String> payloadFieldNames;

	public QdrantOutboundMessageHandler(
			ProducerDestination producerDestination,
			ExtendedProducerProperties<QdrantProducerProperties> producerProperties,
			MessageChannel errorChannel) {

		LOGGER.info("<Handler ID: {}> Creating QdrantOutboundMessageHandler for destination '{}'",
				handlerId, producerDestination.getName());

		this.producerDestination = producerDestination;
		this.producerProperties = producerProperties;
		this.errorChannel = errorChannel;
	}

	@Override
	public void handleMessage(Message<?> message) throws MessagingException {
		if (!isRunning()) {
			throw handleException("<Handler ID: " + handlerId + "> Handler is not running");
		}

		PublishAcknowledgmentCallback publishAckCallback = message.getHeaders()
				.get(ConnectorBinderHeaders.PUBLISH_ACKNOWLEDGMENT_CALLBACK, PublishAcknowledgmentCallback.class);

		try {
			LOGGER.debug("<Handler ID: {}> Processing message for Qdrant", handlerId);

			// 1. Extract JSON payload
			String jsonPayload = getPayloadAsString(message.getPayload());
			@SuppressWarnings("unchecked")
			Map<String, Object> data = objectMapper.readValue(jsonPayload, Map.class);

			// 2. Extract vector
			@SuppressWarnings("unchecked")
			List<Number> vectorList = (List<Number>) data.get(vectorFieldName);
			if (vectorList == null || vectorList.isEmpty()) {
				throw new IllegalArgumentException("Vector field '" + vectorFieldName + "' is missing or empty");
			}

			float[] vectorArray = new float[vectorList.size()];
			for (int i = 0; i < vectorList.size(); i++) {
				vectorArray[i] = vectorList.get(i).floatValue();
			}

			if (vectorSize != null && vectorArray.length != vectorSize) {
				throw new IllegalArgumentException(String.format(
						"Vector dimension mismatch. Expected %d, got %d", vectorSize, vectorArray.length));
			}

			// 3. Create Point ID (fixed - uses protobuf builder)
			PointId pointId = createPointId(data);

			// 4. Build payload (only configured fields)
			Map<String, Value> qdrantPayload = new HashMap<>();
			if (payloadFieldNames != null && !payloadFieldNames.isEmpty()) {
				for (String field : payloadFieldNames) {
					Object val = data.get(field);
					if (val != null) {
						qdrantPayload.put(field, toValue(val));
					}
				}
			}

			// 5. Upsert
			PointStruct point = PointStruct.newBuilder()
					.setId(pointId)
					.setVectors(vectors(vectorArray))
					.putAllPayload(qdrantPayload)
					.build();

			UpdateResult result = qdrantClient.upsertAsync(collectionName, List.of(point))
					.get(30, TimeUnit.SECONDS);

			LOGGER.info("<Handler ID: {}> Upserted to collection '{}' | Point ID: {}",
					handlerId, collectionName, pointId);

			if (publishAckCallback != null) {
				publishAckCallback.onPublishSuccess();
			}

		} catch (Exception e) {
			LOGGER.error("<Handler ID: {}> Qdrant upsert failed", handlerId, e);
			if (publishAckCallback != null) {
				publishAckCallback.onPublishFailure(e);
			}
			throw handleException("<Handler ID: " + handlerId + "> Qdrant upsert failed", e);
		}
	}

	private String getPayloadAsString(Object payload) {
		if (payload instanceof String) return (String) payload;
		if (payload instanceof byte[]) return new String((byte[]) payload, StandardCharsets.UTF_8);
		if (payload instanceof Map) {
			try { return objectMapper.writeValueAsString(payload); }
			catch (Exception e) { throw new RuntimeException("Failed to serialize payload", e); }
		}
		throw new IllegalArgumentException("Unsupported payload type: " + payload.getClass().getName());
	}

	/** FIXED: Uses direct protobuf builder (most stable across Qdrant client versions) */
	private PointId createPointId(Map<String, Object> data) {
		if (autoGenerateId) {
			return PointId.newBuilder()
					.setUuid(UUID.randomUUID().toString())
					.build();
		}

		Object idValue = data.get(idFieldName);
		if (idValue == null) {
			throw new IllegalArgumentException("ID field '" + idFieldName + "' not found");
		}

		if (idValue instanceof Number num) {
			return PointId.newBuilder()
					.setNum(num.longValue())
					.build();
		}

		// String ID (fallback)
		return PointId.newBuilder()
				.setUuid(idValue.toString())
				.build();
	}

	private Value toValue(Object obj) {
		if (obj == null) return value("");
		if (obj instanceof String s) return value(s);
		if (obj instanceof Number n) {
			if (n instanceof Integer || n instanceof Long) return value(n.longValue());
			return value(n.doubleValue());
		}
		if (obj instanceof Boolean b) return value(b);
		return value(obj.toString());
	}

	@Override
	public void start() {
		LOGGER.info("<Handler ID: {}> Starting Qdrant producer...", handlerId);
		synchronized (lifecycleLock) {
			if (isRunning()) return;

			QdrantProducerProperties props = producerProperties.getExtension();

			//this.collectionName   = Objects.requireNonNull(props.getCollectionName(), "collectionName is required");
			this.collectionName = this.producerDestination.getName();
			this.vectorFieldName  = Objects.requireNonNullElse(props.getVectorFieldName(), "embedding");
			this.idFieldName      = Objects.requireNonNullElse(props.getIdFieldName(), "pointId");
			this.vectorSize       = props.getVectorSize();
			this.autoGenerateId   = Boolean.TRUE.equals(props.getAutoGenerateId());
			this.payloadFieldNames = props.getPayloadFieldNames();

			String host = Objects.requireNonNullElse(props.getQdrantHost(), "localhost");
			int port = Objects.requireNonNullElse(props.getQdrantPort(), 6334);
			boolean tls = Boolean.TRUE.equals(props.getUseTls());

			qdrantClient = new QdrantClient(QdrantGrpcClient.newBuilder(host, port, tls).build());

			// ==================== AUTO CREATE COLLECTION ====================
			try {
				qdrantClient.getCollectionInfoAsync(collectionName).get(5, TimeUnit.SECONDS);
				LOGGER.info("Collection '{}' already exists", collectionName);
			} catch (Exception e) {
				LOGGER.info("Collection '{}' not found. Creating it now...", collectionName);

				int vectorDim = (this.vectorSize != null) ? this.vectorSize : 128;

                try {
                    qdrantClient.createCollectionAsync(
                            collectionName,
                            VectorParams.newBuilder()
                                    .setSize(vectorDim)
                                    .setDistance(Distance.Cosine)
                                    .build()
                    ).get(10, TimeUnit.SECONDS);
                } catch (InterruptedException ex) {
                    throw new RuntimeException(ex);
                } catch (ExecutionException ex) {
                    throw new RuntimeException(ex);
                } catch (TimeoutException ex) {
                    throw new RuntimeException(ex);
                }

                LOGGER.info("Collection '{}' created successfully (vector size: {}, distance: Cosine)",
						collectionName, vectorDim);
			}

			LOGGER.info("<Handler ID: {}> Qdrant producer ready -> Collection: '{}', Vector field: '{}', Payload fields: {}",
					handlerId, collectionName, vectorFieldName, payloadFieldNames);

			running = true;
		}
	}

	@Override
	public void stop() {
		LOGGER.info("<Handler ID: {}> Stopping Qdrant producer...", handlerId);
		synchronized (lifecycleLock) {
			if (qdrantClient != null) {
				try { qdrantClient.close(); } catch (Exception e) { LOGGER.warn("Error closing Qdrant client", e); }
			}
			running = false;
		}
	}

	@Override
	public boolean isRunning() { return running; }

	private MessagingException handleException(String msg) { return handleException(msg, null); }

	private MessagingException handleException(String msg, Exception cause) {
		MessagingException ex = cause != null ? new MessagingException(msg, cause) : new MessagingException(msg);
		if (errorChannel != null) errorChannel.send(new ErrorMessage(ex));
		return ex;
	}
}