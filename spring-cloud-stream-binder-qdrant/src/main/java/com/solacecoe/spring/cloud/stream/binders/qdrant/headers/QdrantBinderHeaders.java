package com.solacecoe.spring.cloud.stream.binders.qdrant.headers;

public class QdrantBinderHeaders {

	/**
	* The reserved prefix for this binder's usage.
    */
    private static final String PREFIX = "qdrant_scst_";

    /**
     * Present and true to indicate when a qdrant message with no payload was received.
     */
    public static final String NULL_PAYLOAD = PREFIX + "nullPayload";

}
