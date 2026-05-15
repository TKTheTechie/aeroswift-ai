#!/bin/bash
# Full absolute paths so it works no matter where PM2 runs it from
exec java -jar /home/rocky/aeroswift-ai/pubsubplus-connector-qdrant/dist/pubsubplus-connector-qdrant-1.0.0.jar \
  --spring.config.additional-location=file:/home/rocky/aeroswift-ai/pubsubplus-connector-qdrant/dist/application-demo.yml
