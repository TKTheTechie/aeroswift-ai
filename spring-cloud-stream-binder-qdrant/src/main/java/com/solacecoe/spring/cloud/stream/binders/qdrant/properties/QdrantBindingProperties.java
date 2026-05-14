package com.solacecoe.spring.cloud.stream.binders.qdrant.properties;

import org.springframework.cloud.stream.binder.BinderSpecificPropertiesProvider;

public class QdrantBindingProperties implements BinderSpecificPropertiesProvider {

	private QdrantConsumerProperties consumer = new QdrantConsumerProperties();

	private QdrantProducerProperties producer = new QdrantProducerProperties();

	@Override
	public QdrantConsumerProperties getConsumer() {
		return consumer;
	}

	public void setConsumer(QdrantConsumerProperties consumer) {
		this.consumer = consumer;
	}

	@Override
	public QdrantProducerProperties getProducer() {
		return producer;
	}

	public void setProducer(QdrantProducerProperties producer) {
		this.producer = producer;
	}
}
