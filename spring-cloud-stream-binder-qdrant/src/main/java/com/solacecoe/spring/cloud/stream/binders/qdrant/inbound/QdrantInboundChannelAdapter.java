package com.solacecoe.spring.cloud.stream.binders.qdrant.inbound;

import com.solacecoe.spring.cloud.stream.binders.qdrant.headers.QdrantBinderHeaders;
import com.solacecoe.spring.cloud.stream.binders.qdrant.inbound.acknowledge.QdrantAcknowledgmentCallback;
import com.solacecoe.spring.cloud.stream.binders.qdrant.properties.QdrantConsumerProperties;
import com.solacecoe.spring.cloud.stream.binders.qdrant.util.QdrantErrorMessageStrategy;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.stream.binder.ExtendedConsumerProperties;
import org.springframework.cloud.stream.binder.RequeueCurrentMessageException;
import org.springframework.cloud.stream.provisioning.ConsumerDestination;
import org.springframework.core.AttributeAccessor;
import org.springframework.integration.IntegrationMessageHeaderAccessor;
import org.springframework.integration.StaticMessageHeaderAccessor;
import org.springframework.integration.acks.AckUtils;
import org.springframework.integration.acks.AcknowledgmentCallback;
import org.springframework.integration.context.OrderlyShutdownCapable;
import org.springframework.integration.core.Pausable;
import org.springframework.integration.endpoint.MessageProducerSupport;
import org.springframework.integration.support.MessageBuilder;
import org.springframework.lang.Nullable;
import org.springframework.messaging.Message;

import java.io.Closeable;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

public class QdrantInboundChannelAdapter extends MessageProducerSupport
		implements OrderlyShutdownCapable, Pausable {

	private final String id = UUID.randomUUID().toString();
	private final ConsumerDestination consumerDestination;
	private final ExtendedConsumerProperties<QdrantConsumerProperties> consumerProperties;
	private final AtomicBoolean paused = new AtomicBoolean(false);

	private static final Logger LOGGER = LoggerFactory.getLogger(QdrantInboundChannelAdapter.class);
	private static final ThreadLocal<AttributeAccessor> errorMessageAttributesHolder = new ThreadLocal<>();

	public QdrantInboundChannelAdapter(
			ConsumerDestination consumerDestination,
			ExtendedConsumerProperties<QdrantConsumerProperties> consumerProperties) {
		this.consumerDestination = consumerDestination;
		this.consumerProperties = consumerProperties;
	}

	@Override
	protected void doStart() {
		LOGGER.info("Starting inbound adapter {}", id);

		if (isRunning()) {
			LOGGER.warn("Nothing to do. Inbound message channel adapter {} is already running", id);
			return;
		}

		//TODO Create consumer resources

		if (paused.get()) {
			LOGGER.info("Inbound adapter {} is starting in a paused state", id);
			//TODO Ensure consumer resources are started in a paused state
		}

		//TODO start consumer resources
		//See ConsumerRunnable for an example of how to handle consumed messages
	}

	@Override
	protected void doStop() {
		if (!isRunning()) return;
		// Close consumer resources to qdrant endpoint
	}

	@Override
	public int beforeShutdown() {
		this.stop();
		return 0;
	}

	@Override
	public int afterShutdown() {
		return 0;
	}

	@Override
	public void pause() {
		LOGGER.info("Pausing inbound adapter {}", id);
		//TODO implement pause
		paused.set(true);
	}

	@Override
	public void resume() {
		LOGGER.info("Resuming inbound adapter {}", id);
		try {
			//TODO implement resume
			paused.set(false);
		} catch (Exception e) {
			RuntimeException toThrow = new RuntimeException(
					String.format("Failed to resume inbound adapter %s", id), e);
			if (paused.get()) {
				LOGGER.error("Inbound adapter {} failed to be resumed. Re-pausing...", id, e);
				try {
					pause();
				} catch (Exception e1) {
					toThrow.addSuppressed(e1);
				}
			}
			throw toThrow;
		}
	}

	@Override
	public boolean isPaused() {
		return paused.get();
	}

	/**
	* Creates or returns an existing AttributeAccessor.
 	* The AttributeAccessor contains the parameters needed by the ErrorMessageStrategy
	* (likely {@link QdrantErrorMessageStrategy}) to construct ErrorMessages
 	* to be delivered to the errorChannel.
 	* @param message the failed Spring message
 	* @return A new or existing AttributeAccessor
	*/
	@Override
	protected AttributeAccessor getErrorMessageAttributes(@Nullable Message<?> message) {
		AttributeAccessor attributes = errorMessageAttributesHolder.get();
		return attributes == null ? super.getErrorMessageAttributes(message) : attributes;
	}

	/**
	* Example consumer resource implementation.
	*
	* The real implementation is vendor-sensitive. So treat this implementation purely as an example.
	* But it should give you an idea of what you need to do.
	*/
	private class ConsumerRunnable implements Runnable, Closeable {
		private boolean running = true;
		private static final Logger LOGGER = LoggerFactory.getLogger(ConsumerRunnable.class);

		@Override
		public void run() {
			while (running) {
				try {
					receive();
				} catch (Throwable t) {
					boolean isFatalError = false;
					if (isFatalError) {
						LOGGER.error("Fatal exception while consuming messages", t);
						break;
					} else {
						LOGGER.warn("Exception while consuming messages", t);
					}
				}
			}
		}

		private void receive() {
			//TODO poll a message from qdrant
			String vendorMessage = "foo";

			QdrantAcknowledgmentCallback acknowledgmentCallback = new QdrantAcknowledgmentCallback(vendorMessage);
			try {
				Message<?> message;
				try {
					setErrorMessageAttributes(acknowledgmentCallback);
					message = map(vendorMessage, acknowledgmentCallback);
					setErrorMessageAttributes(message);
				} catch (RuntimeException e) {
					boolean processedByErrorHandler = sendErrorMessageIfNecessary(null, e);
					if (processedByErrorHandler) {
						AckUtils.autoAck(acknowledgmentCallback);
					} else {
						LOGGER.warn("Failed to map a qdrant message to a Spring Message and no error channel was configured. Message will be rejected.", e);
						AckUtils.reject(acknowledgmentCallback);
					}
					return;
				}

				AtomicInteger deliveryAttempt = StaticMessageHeaderAccessor.getDeliveryAttempt(message);
				if (deliveryAttempt != null) {
					deliveryAttempt.incrementAndGet();
				}

				sendMessage(message);
				AckUtils.autoAck(acknowledgmentCallback);
			} catch (Exception e) {
				try {
					if (ExceptionUtils.indexOfType(e, RequeueCurrentMessageException.class) > -1) {
						LOGGER.debug("Exception thrown while processing message. Message will be requeued.", e);
						AckUtils.requeue(acknowledgmentCallback);
					} else {
						LOGGER.warn("Exception thrown while processing message. Message will be rejected.", e);
						AckUtils.reject(acknowledgmentCallback);
					}
				} catch (Throwable t) {
					// Typically a message requeue/reject shouldn't fail... but it can...
					t.addSuppressed(e);
					throw t;
				}
			} finally {
				// Clears error message attributes since the message is now done processing
				errorMessageAttributesHolder.remove();
			}
		}

		private Message<?> map(String vendorMessage, AcknowledgmentCallback acknowledgmentCallback) {
			//TODO Convert qdrant message to Spring message
			MessageBuilder<?> messageBuilder = MessageBuilder.withPayload(vendorMessage.getBytes())
					.setHeader(IntegrationMessageHeaderAccessor.ACKNOWLEDGMENT_CALLBACK, acknowledgmentCallback)
					.setHeaderIfAbsent(IntegrationMessageHeaderAccessor.DELIVERY_ATTEMPT, new AtomicInteger(0));

			boolean isNullPayload = vendorMessage == null;
			if (isNullPayload) {
				LOGGER.debug("Null payload detected, setting Spring header {}", QdrantBinderHeaders.NULL_PAYLOAD);
				messageBuilder.setHeader(QdrantBinderHeaders.NULL_PAYLOAD, isNullPayload);
			}

			return messageBuilder.build();
		}

		/**
		 * Set the attributes needed to build an errorMessage.
		 * Use {@link #setErrorMessageAttributes(Message)} if the Spring message was already constructed.
		 * @param acknowledgmentCallback the callback to acknowledge the source message
		 */
		private void setErrorMessageAttributes(AcknowledgmentCallback acknowledgmentCallback) {
			errorMessageAttributesHolder.remove(); // clear attributes
			AttributeAccessor attributes = getErrorMessageAttributes(null);
			errorMessageAttributesHolder.set(attributes);
			attributes.setAttribute(QdrantErrorMessageStrategy.ACKNOWLEDGMENT_CALLBACK_KEY, acknowledgmentCallback);
		}

		/**
		 * Set the attributes needed to build an errorMessage.
 		 * @param message the failed Spring message
		 */
		private void setErrorMessageAttributes(Message<?> message) {
			errorMessageAttributesHolder.remove(); // clear attributes
			errorMessageAttributesHolder.set(getErrorMessageAttributes(message));
		}

		public void close() {
			running = false;
		}
	}
}
