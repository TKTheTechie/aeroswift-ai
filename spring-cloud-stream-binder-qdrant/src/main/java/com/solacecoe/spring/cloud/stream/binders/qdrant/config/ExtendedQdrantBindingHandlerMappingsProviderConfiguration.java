package com.solacecoe.spring.cloud.stream.binders.qdrant.config;

import org.springframework.boot.context.properties.source.ConfigurationPropertyName;
import org.springframework.cloud.stream.config.BindingHandlerAdvise;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class ExtendedQdrantBindingHandlerMappingsProviderConfiguration {

    @Bean
    public BindingHandlerAdvise.MappingsProvider QdrantExtendedPropertiesDefaultMappingsProvider() {
        return () -> {
            Map<ConfigurationPropertyName, ConfigurationPropertyName> mappings = new HashMap<>();
            mappings.put(ConfigurationPropertyName.of("spring.cloud.stream.qdrant.bindings"),
                    ConfigurationPropertyName.of("spring.cloud.stream.qdrant.default"));
            return mappings;
        };
    }
}
