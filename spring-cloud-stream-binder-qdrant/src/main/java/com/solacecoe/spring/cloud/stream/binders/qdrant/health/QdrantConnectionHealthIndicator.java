package com.solacecoe.spring.cloud.stream.binders.qdrant.health;

import com.solacecoe.spring.cloud.stream.binders.qdrant.properties.QdrantBinderProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.util.backoff.FixedBackOff;

/**
* Example implementation of a health indicator for the connection to qdrant.
*/
public class QdrantConnectionHealthIndicator implements HealthIndicator {

    private static final Logger LOGGER = LoggerFactory.getLogger(QdrantConnectionHealthIndicator.class);
    private final QdrantBinderProperties binderProperties;
	private final FixedBackOff backoff;

    public QdrantConnectionHealthIndicator(QdrantBinderProperties binderProperties) {
        this.binderProperties = binderProperties;
        long reconnectAttemptsUntilDown = binderProperties.getHealthCheck().getReconnectAttemptsUntilDown();
        backoff = new FixedBackOff(binderProperties.getHealthCheck().getInterval(),
                reconnectAttemptsUntilDown == 0 ? FixedBackOff.UNLIMITED_ATTEMPTS : reconnectAttemptsUntilDown);
    }

    @Override
    public Health health() {
        LOGGER.debug("Performing health check");
        return doHealthCheck();
    }

    protected Health doHealthCheck() {
		throw new UnsupportedOperationException();
    }
}
