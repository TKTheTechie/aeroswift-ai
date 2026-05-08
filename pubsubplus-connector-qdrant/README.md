# Qdrant Micro-Integration 

**Solace Pub/Sub+ → Qdrant Vector Database**

This Micro-Integration (built using Solace MI MDK) consumes events from a Solace queue and upserts them into **Qdrant**.

---

## Configuration

Create a file named `application.yml` (recommended) with the following settings:

```yaml
spring:
  application:
    name: Qdrant (Sink)

  cloud:
    stream:
      qdrant:
        default:
          producer:
            # Client type to connect to Qdrant
            client-type: rest                    # Options: "rest" (port 6333) or "grpc" (port 6334, recommended)

            # ==================== Qdrant Server Connection ====================
            qdrant-host: localhost               # Host where Qdrant is running
            qdrant-port: 6334                    # 6334 = gRPC (default & recommended), 6333 = REST
            use-tls: false                       # Set to true if Qdrant is using HTTPS/TLS

            # ==================== Qdrant Collection & Vector ====================
            collection-name: flyers              # Name of the collection in Qdrant (will be auto-created if missing)
            vector-field-name: embedding         # JSON field name that contains the face embedding array
            vector-size: 128                     # Expected dimension of the vector (used for validation)

            # ==================== Point ID Strategy ====================
            id-field-name: pointId               # JSON field to use as the unique Point ID in Qdrant
            auto-generate-id: false              # If true, Qdrant will auto-generate UUID instead of using id-field-name

            # ==================== Payload Fields ====================
            payload-field-names:
              - flyerId                          # Only these fields will be stored in Qdrant payload
            # Add more fields if needed for other business flows:
            # - enrolledAt
            # - source

```
---

## Configuration

# 1. Go to the distribution folder
cd dist/

# 2. Start the Micro-Integration
java -jar pubsubplus-connector-qdrant-1.0.0.jar \
  --spring.config.additional-location=file:application.yml
