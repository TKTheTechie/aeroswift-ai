package com.solacecoe.connectors.qdrant.client;

import java.util.Map;
import java.util.concurrent.TimeUnit;

public class QdrantClient {

    private final String host;
    private final int port;

    public QdrantClient(String host, int port) {
        this.host = host;
        this.port = port;
    }

    public String getBaseUrl() {
        return "http://%s:%d".formatted(host, port);
    }

    public String receive(String destination, long timeout, TimeUnit unit) {
        // Implementation for receiving messages
        return null;
    }

    public void publish(String destination, String payload, Map<String, String> properties) {
        // Implementation for publishing messages
    }

    public void createDestination(String destination) {
        // Implementation for creating a destination
    }

    public void deleteDestination(String destination) {
        // Implementation for deleting a destination
    }

}
