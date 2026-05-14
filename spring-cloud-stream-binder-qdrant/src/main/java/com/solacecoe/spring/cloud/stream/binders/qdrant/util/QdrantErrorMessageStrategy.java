package com.solacecoe.spring.cloud.stream.binders.qdrant.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.AttributeAccessor;
import org.springframework.integration.IntegrationMessageHeaderAccessor;
import org.springframework.integration.support.ErrorMessageStrategy;
import org.springframework.integration.support.ErrorMessageUtils;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.ErrorMessage;

import java.util.HashMap;
import java.util.Map;

public class QdrantErrorMessageStrategy implements ErrorMessageStrategy {
	public static final String ACKNOWLEDGMENT_CALLBACK_KEY = "qdrant_acknowledgmentCallback";
	private static final Logger LOGGER = LoggerFactory.getLogger(QdrantErrorMessageStrategy.class);

	@Override
	public ErrorMessage buildErrorMessage(Throwable throwable, AttributeAccessor attributeAccessor) {
		Object inputMessage;
		Map<String, Object> headers = new HashMap<>();
		if (attributeAccessor == null) {
			// No error message was found
			LOGGER.debug("No attributeAccessor was found, making empty ErrorMessage with just the throwable");
			inputMessage = null;
		} else {
			inputMessage = attributeAccessor.getAttribute(ErrorMessageUtils.INPUT_MESSAGE_CONTEXT_KEY);
			Object acknowledgmentCallback = attributeAccessor.getAttribute(ACKNOWLEDGMENT_CALLBACK_KEY);
			if (acknowledgmentCallback != null) {
				headers.put(IntegrationMessageHeaderAccessor.ACKNOWLEDGMENT_CALLBACK, acknowledgmentCallback);
			}
		}
		return inputMessage instanceof Message ? new ErrorMessage(throwable, headers, (Message<?>) inputMessage) :
				new ErrorMessage(throwable, headers);
	}
}
