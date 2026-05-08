package com.solacecoe.spring.cloud.stream.binders.qdrant.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
* Consumer properties for the qdrant binder.
*/
@SuppressWarnings("ConfigurationProperties")
@ConfigurationProperties(QdrantExtendedBindingProperties.DEFAULTS_PREFIX + ".consumer")
public class QdrantConsumerProperties {
}
