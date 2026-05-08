package com.solacecoe.spring.cloud.stream.binders.qdrant.properties;

import jakarta.validation.constraints.Min;

public class HealthCheckProperties {

    @Min(1)
    private long interval = 10000;

    @Min(0)
    private long reconnectAttemptsUntilDown = 10;

    public long getInterval() {
        return interval;
    }

    public void setInterval(long interval) {
        this.interval = interval;
    }

    public long getReconnectAttemptsUntilDown() {
        return reconnectAttemptsUntilDown;
    }

    public void setReconnectAttemptsUntilDown(long reconnectAttemptsUntilDown) {
        this.reconnectAttemptsUntilDown = reconnectAttemptsUntilDown;
    }
}
