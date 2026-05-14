package com.solacecoe.spring.cloud.stream.binders.qdrant.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.cloud.stream.binder.AbstractExtendedBindingProperties;
import org.springframework.cloud.stream.binder.BinderSpecificPropertiesProvider;

import java.util.Map;

@ConfigurationProperties("spring.cloud.stream.qdrant")
public class QdrantExtendedBindingProperties extends AbstractExtendedBindingProperties<
			QdrantConsumerProperties,
			QdrantProducerProperties,
			QdrantBindingProperties> {

	protected static final String DEFAULTS_PREFIX = "spring.cloud.stream.qdrant.default";

	@Override
	public String getDefaultsPrefix() {
		return DEFAULTS_PREFIX;
	}

	@Override
	public Map<String, QdrantBindingProperties> getBindings() {
		return super.doGetBindings();
	}

	@Override
	public Class<? extends BinderSpecificPropertiesProvider> getExtendedPropertiesEntryClass() {
		return QdrantBindingProperties.class;
	}
}
