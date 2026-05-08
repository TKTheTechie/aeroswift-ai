package com.solacecoe.spring.cloud.stream.binders.qdrant.inbound.support;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.integration.StaticMessageHeaderAccessor;
import org.springframework.integration.acks.AckUtils;
import org.springframework.integration.acks.AcknowledgmentCallback;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHandler;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.support.ErrorMessage;

import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
* An {@link ErrorMessage} {@link MessageHandler} which resolves the message's {@link AcknowledgmentCallback}.
*/
public class QdrantErrorMessageHandler implements MessageHandler {

	private static final Logger LOGGER = LoggerFactory.getLogger(QdrantErrorMessageHandler.class);

	@Override
	public void handleMessage(Message<?> message) throws MessagingException {
		if (!(message instanceof ErrorMessage errorMessage)) {
			throw new IllegalArgumentException(String.format("Spring message %s: Expected an %s, but got a %s",
					StaticMessageHeaderAccessor.getId(message), ErrorMessage.class.getSimpleName(),
					message.getClass().getSimpleName()));
		}

		handleErrorMessage(errorMessage);
	}

	private void handleErrorMessage(ErrorMessage errorMessage) {
		Set<AcknowledgmentCallback> acknowledgmentCallbacks = Stream.of(Stream.of(errorMessage),
						Stream.ofNullable(errorMessage.getOriginalMessage()))
				.flatMap(s -> s)
				.map(StaticMessageHeaderAccessor::getAcknowledgmentCallback)
				.filter(Objects::nonNull)
				.collect(Collectors.toUnmodifiableSet());

		LOGGER.atInfo()
				.setMessage("Processing message {} <original-message: {}>")
				.addArgument(() -> StaticMessageHeaderAccessor.getId(errorMessage))
				.addArgument(() -> errorMessage.getOriginalMessage() != null ?
						StaticMessageHeaderAccessor.getId(errorMessage.getOriginalMessage()) : null)
				.log();

		if (acknowledgmentCallbacks.isEmpty()) {
			// Should never happen under normal use
			throw new IllegalArgumentException(String.format(
					"Spring error message %s does not contain an acknowledgment callback. Message cannot be acknowledged",
					StaticMessageHeaderAccessor.getId(errorMessage)));
		}

		for(AcknowledgmentCallback acknowledgmentCallback : acknowledgmentCallbacks) {
			AckUtils.reject(acknowledgmentCallback);
		}
	}
}
