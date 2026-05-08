package com.solacecoe.connectors.qdrant.extension;

import com.solacecoe.connectors.qdrant.client.QdrantClient;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.ParameterContext;
import org.junit.jupiter.api.extension.ParameterResolutionException;
import org.junit.jupiter.api.extension.ParameterResolver;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;

/**
 * JUnit 5 extension that starts the Qdrant service in a container and provides a preconfigured client for testing.
 * <p>
 * It is also possible to implement BeforeAllCallback, AfterAllCallback, BeforeEachCallback, AfterEachCallback, as well as 
 * InvocationInterceptor for more advanced use cases.
 * For instance, to auto-provision resources on the Qdrant service, to automatically clean up resources after tests,
 * or to intercept method invocations and inject application properties to the ConnectorArgsBuilder.
 */
public class QdrantExtension implements ParameterResolver {
    private static final ExtensionContext.Namespace EXTENSION_NAMESPACE = ExtensionContext.Namespace.create(QdrantExtension.class);
    private static final String CONTAINER_KEY = "QDRANT_CONTAINER_KEY";
    private static final String CLIENT_KEY = "QDRANT_CLIENT_KEY";

    private static final String QDRANT_IMAGE = "qdrant-service:latest";
    private static final int QDRANT_SERVICE_PORT = 8088;
    
    @Override
    public boolean supportsParameter(ParameterContext parameterContext, ExtensionContext extensionContext) throws ParameterResolutionException {
        return parameterContext.getParameter().getType().isAssignableFrom(QdrantClient.class);
    }

    @Override
    public Object resolveParameter(ParameterContext parameterContext, ExtensionContext extensionContext) throws ParameterResolutionException {
        if (parameterContext.getParameter().getType().isAssignableFrom(QdrantClient.class)) {
            return getClient(extensionContext);
        } else {
            throw new ParameterResolutionException("Unsupported parameter type: " + parameterContext.getParameter().getType());
        }
    }

    private QdrantClient getClient(ExtensionContext extensionContext) {
        // Using extension context root since the client has the same lifecycle as the container.
        return extensionContext.getRoot().getStore(EXTENSION_NAMESPACE)
                .getOrComputeIfAbsent(CLIENT_KEY, key -> createClient(extensionContext), QdrantClient.class);
    }

    private QdrantClient createClient(ExtensionContext extensionContext) {
        GenericContainer<?> container = getContainer(extensionContext);
        return new QdrantClient(container.getHost(), container.getMappedPort(QDRANT_SERVICE_PORT));
    }

    private GenericContainer<?> getContainer(ExtensionContext extensionContext) {
        // Using extension context root since container is created once and reused across test classes.
        return extensionContext.getRoot().getStore(EXTENSION_NAMESPACE)
                .getOrComputeIfAbsent(CONTAINER_KEY, key -> createContainer(), GenericContainer.class);
    }

    private GenericContainer<?> createContainer() {
        GenericContainer<?> container = new GenericContainer<>(QDRANT_IMAGE)
                .withExposedPorts(QDRANT_SERVICE_PORT)
                .waitingFor(Wait.forHttp("/actuator/health").forStatusCode(200));
        container.start();

        return container;
    }
}
