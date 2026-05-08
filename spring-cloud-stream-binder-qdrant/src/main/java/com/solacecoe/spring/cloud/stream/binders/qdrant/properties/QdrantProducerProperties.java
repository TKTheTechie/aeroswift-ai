package com.solacecoe.spring.cloud.stream.binders.qdrant.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Producer properties for the qdrant binder.
 */
@SuppressWarnings("ConfigurationProperties")
@ConfigurationProperties(QdrantExtendedBindingProperties.DEFAULTS_PREFIX + ".producer")
public class QdrantProducerProperties {

    // ==================== Qdrant Connection ====================
    private String qdrantHost = "localhost";
    private Integer qdrantPort = 6334;
    private Boolean useTls = false;

    // ==================== Qdrant Collection & Vector ====================
    private String collectionName;                    // REQUIRED
    private String vectorFieldName = "embedding";
    private Integer vectorSize;                       // optional dimension validation (e.g. 128)

    // ==================== Point ID Strategy ====================
    private String idFieldName = "pointId";
    private Boolean autoGenerateId = false;           // if true, ignores idFieldName and generates UUID

    // ==================== Payload Control (exact original Node.js behavior) ====================
    private List<String> payloadFieldNames = List.of("flyerId");

    // ==================== Getters & Setters ====================


    public String getQdrantHost() {
        return qdrantHost;
    }

    public void setQdrantHost(String qdrantHost) {
        this.qdrantHost = qdrantHost;
    }

    public Integer getQdrantPort() {
        return qdrantPort;
    }

    public void setQdrantPort(Integer qdrantPort) {
        this.qdrantPort = qdrantPort;
    }

    public Boolean getUseTls() {
        return useTls;
    }

    public void setUseTls(Boolean useTls) {
        this.useTls = useTls;
    }

    public String getCollectionName() {
        return collectionName;
    }

    public void setCollectionName(String collectionName) {
        this.collectionName = collectionName;
    }

    public String getVectorFieldName() {
        return vectorFieldName;
    }

    public void setVectorFieldName(String vectorFieldName) {
        this.vectorFieldName = vectorFieldName;
    }

    public Integer getVectorSize() {
        return vectorSize;
    }

    public void setVectorSize(Integer vectorSize) {
        this.vectorSize = vectorSize;
    }

    public String getIdFieldName() {
        return idFieldName;
    }

    public void setIdFieldName(String idFieldName) {
        this.idFieldName = idFieldName;
    }

    public Boolean getAutoGenerateId() {
        return autoGenerateId;
    }

    public void setAutoGenerateId(Boolean autoGenerateId) {
        this.autoGenerateId = autoGenerateId;
    }

    public List<String> getPayloadFieldNames() {
        return payloadFieldNames != null ? payloadFieldNames : List.of("flyerId");
    }

    public void setPayloadFieldNames(List<String> payloadFieldNames) {
        this.payloadFieldNames = payloadFieldNames;
    }
}
