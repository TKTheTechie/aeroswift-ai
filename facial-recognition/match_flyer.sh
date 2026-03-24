#!/usr/bin/env bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 <image.jpg>"
    exit 1
fi

image="$1"

imageB64=$(base64 < "$image" | tr -d '\n')

echo "Matching $image"

curl -v -s -X POST http://localhost:3002/match \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "imageBase64": "$imageB64"
}
JSON

