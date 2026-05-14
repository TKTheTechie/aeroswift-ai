package com.solacecoe.spring.cloud.stream.binders.qdrant.inbound.acknowledge;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.integration.acks.AcknowledgmentCallback;

/**
* Acknowledgment callback for consumer binding messages.
*/
public class QdrantAcknowledgmentCallback implements AcknowledgmentCallback {
	private final Object sourceMessage;
	private boolean acknowledged = false;
	private boolean autoAckEnabled = true;

	private static final Logger LOGGER = LoggerFactory.getLogger(QdrantAcknowledgmentCallback.class);

	public QdrantAcknowledgmentCallback(Object sourceMessage) {
		this.sourceMessage = sourceMessage;
	}

	@Override
	public void acknowledge(Status status) {
		if (acknowledged) {
			LOGGER.debug("Message is already acknowledged");
			return;
		}

		switch (status) {
			case ACCEPT -> {
				//TODO Acknowledge the sourceMessage
			}
			case REJECT -> {
				//TODO Reject the sourceMessage
			}
			case REQUEUE -> {
				//TODO Requeue the sourceMessage
			}
		}

		acknowledged = true;
	}

	@Override
	public boolean isAcknowledged() {
		return acknowledged;
	}

	@Override
	public void noAutoAck() {
		autoAckEnabled = false;
	}

	@Override
	public boolean isAutoAck() {
		return autoAckEnabled;
	}
}
