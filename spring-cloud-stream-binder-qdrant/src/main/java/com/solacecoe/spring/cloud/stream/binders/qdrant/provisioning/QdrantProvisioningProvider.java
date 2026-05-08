package com.solacecoe.spring.cloud.stream.binders.qdrant.provisioning;

import com.solacecoe.spring.cloud.stream.binders.qdrant.properties.QdrantConsumerProperties;
import com.solacecoe.spring.cloud.stream.binders.qdrant.properties.QdrantProducerProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.stream.binder.ExtendedConsumerProperties;
import org.springframework.cloud.stream.binder.ExtendedProducerProperties;
import org.springframework.cloud.stream.provisioning.ConsumerDestination;
import org.springframework.cloud.stream.provisioning.ProducerDestination;
import org.springframework.cloud.stream.provisioning.ProvisioningException;
import org.springframework.cloud.stream.provisioning.ProvisioningProvider;

/**
 * {@link ProvisioningProvider} for qdrant.
 */
public class QdrantProvisioningProvider implements
        ProvisioningProvider<ExtendedConsumerProperties<QdrantConsumerProperties>, ExtendedProducerProperties<QdrantProducerProperties>> {

    private static final Logger LOGGER = LoggerFactory.getLogger(QdrantProvisioningProvider.class);

    @Override
    public ProducerDestination provisionProducerDestination(String name,
                                                            ExtendedProducerProperties<QdrantProducerProperties> properties) throws ProvisioningException {
        LOGGER.info("Creating producer destination: '{}'", name);
        return new QdrantProducerDestination(name);
    }

    @Override
    public ConsumerDestination provisionConsumerDestination(String name, String group,
                                                            ExtendedConsumerProperties<QdrantConsumerProperties> properties) throws ProvisioningException {
        LOGGER.info("Creating consumer destination: '{}'", name);
        return new QdrantConsumerDestination(name);
    }

}
