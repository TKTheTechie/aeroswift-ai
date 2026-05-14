package com.solacecoe.spring.cloud.stream.binders.qdrant.health;

import com.solace.connector.core.io.health.BindingHealthAggregateAccessor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthContributor;
import org.springframework.boot.actuate.health.StatusAggregator;

/**
 * A health accessor to compute the aggregate health of a qdrant binding.
 * This is used when computing a workflow's overall health.
 */
public class QdrantBindingHealthAccessor extends BindingHealthAggregateAccessor {

	public QdrantBindingHealthAccessor(StatusAggregator statusAggregator) {
		super(statusAggregator);
	}

	@Override
	public Health getBindingHealth(String bindingName, HealthContributor binderHealthContributor) {
		// TODO: Implement me
		// This default implementation returns the aggregate health of the binder as a whole.
		return collectAggregateHealthStatus(binderHealthContributor);
	}

	@Override
	public String getBinderType() {
		return "qdrant";
	}

}