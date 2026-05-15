#!/bin/bash
exec java -jar pubsubplus-connector-qdrant-1.0.0.jar \
  --spring.config.additional-location=file:application-demo.yml
