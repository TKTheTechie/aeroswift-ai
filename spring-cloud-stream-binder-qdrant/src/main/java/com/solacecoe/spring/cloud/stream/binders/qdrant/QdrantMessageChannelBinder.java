package com.solacecoe.spring.cloud.stream.binders.qdrant;

import com.solacecoe.spring.cloud.stream.binders.qdrant.inbound.QdrantInboundChannelAdapter;
import com.solacecoe.spring.cloud.stream.binders.qdrant.inbound.support.QdrantErrorMessageHandler;
import com.solacecoe.spring.cloud.stream.binders.qdrant.outbound.QdrantOutboundMessageHandler;
import com.solacecoe.spring.cloud.stream.binders.qdrant.properties.QdrantConsumerProperties;
import com.solacecoe.spring.cloud.stream.binders.qdrant.properties.QdrantExtendedBindingProperties;
import com.solacecoe.spring.cloud.stream.binders.qdrant.properties.QdrantProducerProperties;
import com.solacecoe.spring.cloud.stream.binders.qdrant.util.QdrantErrorMessageStrategy;
import org.springframework.cloud.stream.binder.AbstractMessageChannelBinder;
import org.springframework.cloud.stream.binder.BinderSpecificPropertiesProvider;
import org.springframework.cloud.stream.binder.ExtendedConsumerProperties;
import org.springframework.cloud.stream.binder.ExtendedProducerProperties;
import org.springframework.cloud.stream.binder.ExtendedPropertiesBinder;
import org.springframework.cloud.stream.provisioning.ConsumerDestination;
import org.springframework.cloud.stream.provisioning.ProducerDestination;
import org.springframework.cloud.stream.provisioning.ProvisioningProvider;
import org.springframework.integration.core.MessageProducer;
import org.springframework.integration.support.ErrorMessageStrategy;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

/**
 * Binder definition for qdrant.
 */
public class QdrantMessageChannelBinder
		extends AbstractMessageChannelBinder<
			ExtendedConsumerProperties<QdrantConsumerProperties>,
			ExtendedProducerProperties<QdrantProducerProperties>,
			ProvisioningProvider<ExtendedConsumerProperties<QdrantConsumerProperties>, ExtendedProducerProperties<QdrantProducerProperties>>>
		implements ExtendedPropertiesBinder<MessageChannel, QdrantConsumerProperties, QdrantProducerProperties> {

	private QdrantExtendedBindingProperties extendedBindingProperties = new QdrantExtendedBindingProperties();

	private static final QdrantErrorMessageStrategy errorMessageStrategy = new QdrantErrorMessageStrategy();

	public QdrantMessageChannelBinder(
			ProvisioningProvider<
					ExtendedConsumerProperties<QdrantConsumerProperties>,
					ExtendedProducerProperties<QdrantProducerProperties>> provisioningProvider) {
		super(null, provisioningProvider);
	}

	@Override
	public String getBinderIdentity() {
		return "Qdrant-" + super.getBinderIdentity();
	}

	@Override
	protected MessageHandler createProducerMessageHandler(
			ProducerDestination producerDestination,
			ExtendedProducerProperties<QdrantProducerProperties> producerProperties,
			MessageChannel errorChannel) {
		return new QdrantOutboundMessageHandler(producerDestination, producerProperties, errorChannel);
	}

	@Override
	protected MessageProducer createConsumerEndpoint(
			ConsumerDestination consumerDestination,
			String group,
			ExtendedConsumerProperties<QdrantConsumerProperties> properties) {
		QdrantInboundChannelAdapter adapter = new QdrantInboundChannelAdapter(consumerDestination, properties);
		ErrorInfrastructure errorInfrastructure = registerErrorInfrastructure(consumerDestination, group, properties);
		adapter.setErrorChannel(errorInfrastructure.getErrorChannel());
		adapter.setErrorMessageStrategy(errorMessageStrategy);
		return adapter;
	}

	//TODO Remove this if the consumer doesn't support of AcknowledgmentCallbacks
	@Override
	protected MessageHandler getErrorMessageHandler(ConsumerDestination destination,
													String group,
													ExtendedConsumerProperties<QdrantConsumerProperties> consumerProperties) {
		return new QdrantErrorMessageHandler();
	}

	@Override
	protected ErrorMessageStrategy getErrorMessageStrategy() {
		return errorMessageStrategy;
	}

	@Override
	public QdrantConsumerProperties getExtendedConsumerProperties(String channelName) {
		return this.extendedBindingProperties.getExtendedConsumerProperties(channelName);
	}

	@Override
	public QdrantProducerProperties getExtendedProducerProperties(String channelName) {
		return this.extendedBindingProperties.getExtendedProducerProperties(channelName);
	}

	@Override
	public String getDefaultsPrefix() {
		return this.extendedBindingProperties.getDefaultsPrefix();
	}

	@Override
	public Class<? extends BinderSpecificPropertiesProvider> getExtendedPropertiesEntryClass() {
		return this.extendedBindingProperties.getExtendedPropertiesEntryClass();
	}

	public void setExtendedBindingProperties(QdrantExtendedBindingProperties extendedBindingProperties) {
		this.extendedBindingProperties = extendedBindingProperties;
	}
}
