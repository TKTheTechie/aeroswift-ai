package com.solacecoe.spring.cloud.stream.binders.qdrant.config;

import com.solacecoe.spring.cloud.stream.binders.qdrant.health.QdrantCompositeHealthContributor;
import org.springframework.boot.actuate.autoconfigure.health.ConditionalOnEnabledHealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnClass(name = "org.springframework.boot.actuate.health.HealthIndicator")
@ConditionalOnEnabledHealthIndicator("binders")
public class QdrantBinderHealthConfiguration {

    @Bean
    public QdrantCompositeHealthContributor QdrantBinderHealthIndicator() {
        return new QdrantCompositeHealthContributor();
    }
}
