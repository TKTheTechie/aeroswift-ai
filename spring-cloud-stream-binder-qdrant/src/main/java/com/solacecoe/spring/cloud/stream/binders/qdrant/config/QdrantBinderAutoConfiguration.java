package com.solacecoe.spring.cloud.stream.binders.qdrant.config;

import com.solacecoe.spring.cloud.stream.binders.qdrant.QdrantMessageChannelBinder;
import com.solacecoe.spring.cloud.stream.binders.qdrant.properties.QdrantBinderProperties;
import com.solacecoe.spring.cloud.stream.binders.qdrant.properties.QdrantExtendedBindingProperties;
import com.solacecoe.spring.cloud.stream.binders.qdrant.provisioning.QdrantProvisioningProvider;
import com.solacecoe.spring.cloud.stream.binders.qdrant.health.QdrantCompositeHealthContributor;
import com.solacecoe.spring.cloud.stream.binders.qdrant.health.QdrantConnectionHealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.stream.binder.Binder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.lang.Nullable;

/**
 * Autoconfiguration class to enable the qdrant binder.
 */
@Configuration
@ConditionalOnMissingBean(Binder.class)
@EnableConfigurationProperties({QdrantExtendedBindingProperties.class, QdrantBinderProperties.class})
@Import(QdrantBinderHealthConfiguration.class)
public class QdrantBinderAutoConfiguration {

    @Bean
    QdrantMessageChannelBinder QdrantMessageChannelBinder(
                QdrantExtendedBindingProperties extendedBindingProperties,
                @Nullable QdrantCompositeHealthContributor binderHealthContributor,
                QdrantBinderProperties binderProperties) {

        if (binderHealthContributor != null) {
			binderHealthContributor.addConnectionComponent(new QdrantConnectionHealthIndicator(binderProperties));
        }

        QdrantMessageChannelBinder messageChannelBinder = new QdrantMessageChannelBinder(new QdrantProvisioningProvider());

		messageChannelBinder.setExtendedBindingProperties(extendedBindingProperties);
        return messageChannelBinder;
    }

}
