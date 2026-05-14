package com.solacecoe.spring.cloud.stream.binders.qdrant.config;

import com.solacecoe.spring.cloud.stream.binders.qdrant.health.QdrantBindingHealthAccessor;
import com.solace.connector.core.io.health.BindingHealthAccessor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.actuate.health.StatusAggregator;

/**
 * Binder-specific connector framework configuration for the qdrant binder.
 */
@Configuration
public class QdrantBinderConnectorCustomizationConfiguration {
	// This configuration and/or beans in here may be defined in the connector instead of generically defining them
    // here for the binder if that makes more sense for your development use case.

	@Configuration
	@ConditionalOnClass(name = "org.springframework.boot.actuate.health.HealthIndicator")
    public static class QdrantBinderConnectorHealthCustomizationConfiguration {

        // By default, the connector framework uses the entirety of the binder's health to compute the overall health
        // of any particular binding.
        // If this is not the case for the qdrant binder, and only parts of the binder's health tree is
        // applicable in computing a qdrant binding's health, then uncomment this bean and implement
        // QdrantBindingHealthAccessor().
//	    @Bean
	    public BindingHealthAccessor QdrantBindingHealthAccessor(StatusAggregator statusAggregator) {
		    return new QdrantBindingHealthAccessor(statusAggregator);
	    }
	}
}
