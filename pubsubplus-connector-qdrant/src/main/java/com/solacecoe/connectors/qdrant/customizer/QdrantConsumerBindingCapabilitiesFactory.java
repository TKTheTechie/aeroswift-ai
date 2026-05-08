package com.solacecoe.connectors.customizer;

import com.solace.connector.core.io.provider.ConsumerBindingCapabilities;
import com.solace.connector.core.io.provider.ConsumerBindingCapabilitiesFactory;
import org.springframework.cloud.stream.binder.ConsumerProperties;

public class QdrantConsumerBindingCapabilitiesFactory implements ConsumerBindingCapabilitiesFactory {
    @Override
    public String getBinderType() {
        return "qdrant"; // (1)
    }

    @Override
    public ConsumerBindingCapabilities create(ConsumerProperties properties) {
        return new VendorConsumerBindingCapabilities(properties.getBindingName());
    }

    private static class VendorConsumerBindingCapabilities implements ConsumerBindingCapabilities {
        private final String bindingName;

        VendorConsumerBindingCapabilities(String bindingName) {
            this.bindingName = bindingName;
        }

        @Override
        public String getBindingName() {
            return bindingName;
        }

        @Override
        public ConsumerAckMode getAcknowledgmentMode() {
            return ConsumerAckMode.CLIENT_ACK_BY_CALLBACK_HEADER; // (2)
        }
    }
}
