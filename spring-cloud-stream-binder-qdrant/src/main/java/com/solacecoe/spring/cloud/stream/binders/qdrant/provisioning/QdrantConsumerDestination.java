package com.solacecoe.spring.cloud.stream.binders.qdrant.provisioning;

import org.springframework.cloud.stream.provisioning.ConsumerDestination;

/**
 * An implementation of {@link ConsumerDestination} for qdrant.
 */
public class QdrantConsumerDestination implements ConsumerDestination {

	private final String destinationName;

	public QdrantConsumerDestination(final String destinationName) {
		this.destinationName = destinationName.trim();
	}

	@Override
	public String getName() {
		return destinationName;
	}

	@Override
	public String toString() {
		final StringBuffer sb = new StringBuffer("QdrantConsumerDestination{");
		sb.append("destinationName='").append(destinationName).append('\'');
		sb.append('}');
		return sb.toString();
	}
}
