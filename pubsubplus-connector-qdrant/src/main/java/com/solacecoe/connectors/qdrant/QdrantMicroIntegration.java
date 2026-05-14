package com.solacecoe.connectors.qdrant;


import com.solacecoe.connectors.customizer.QdrantConsumerBindingCapabilitiesFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
* Main class of Micro-Integration.
*/
@SpringBootApplication
public class QdrantMicroIntegration {

        public static void main(String[] args) {
                SpringApplication.run(QdrantMicroIntegration.class, args);
        }

        @Bean
        public QdrantConsumerBindingCapabilitiesFactory rssConsumerBindingCapabilitiesFactory() {
                return new QdrantConsumerBindingCapabilitiesFactory();
        }
}
