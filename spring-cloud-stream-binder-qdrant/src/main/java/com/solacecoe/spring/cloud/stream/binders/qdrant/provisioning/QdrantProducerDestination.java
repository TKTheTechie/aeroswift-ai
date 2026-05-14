package com.solacecoe.spring.cloud.stream.binders.qdrant.provisioning;

import org.springframework.cloud.stream.provisioning.ProducerDestination;

/**
 * An implementation of {@link ProducerDestination} for qdrant.
 */
public class QdrantProducerDestination implements ProducerDestination {

	private final String destinationName;


    public QdrantProducerDestination(String destinationName) {
		this.destinationName = destinationName.trim();
	}

	@Override
	public String getName() {
		return destinationName;
	}

	@Override
	public String getNameForPartition(int partition) {
		return destinationName;
	}

	@Override
	public String toString() {
		final StringBuffer sb = new StringBuffer("QdrantProducerDestination{");
		sb.append("destinationName='").append(destinationName).append('\'');
		sb.append('}');
		return sb.toString();
	}
}
