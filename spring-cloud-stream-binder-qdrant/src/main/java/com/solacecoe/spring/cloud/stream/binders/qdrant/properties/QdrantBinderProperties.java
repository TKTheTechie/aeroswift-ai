package com.solacecoe.spring.cloud.stream.binders.qdrant.properties;

import jakarta.validation.Valid;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;

// Can delete this class if you don't need.
/**
* Properties for the binder as a whole.
*/
@ConfigurationProperties("qdrant-binder")
public class QdrantBinderProperties {

    @NestedConfigurationProperty
    @Valid
    private HealthCheckProperties healthCheck = new HealthCheckProperties();

    public HealthCheckProperties getHealthCheck() {
        return healthCheck;
    }

    public void setHealthCheck(HealthCheckProperties healthCheck) {
        this.healthCheck = healthCheck;
    }
}
