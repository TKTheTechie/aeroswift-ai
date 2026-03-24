#!/usr/bin/env bash

if [ $# -ne 2 ]; then
    echo "Usage: $0 <flyerId> <image.jpg>"
    exit 1
fi

flyerId="$1"
image="$2"

#imageB64= `base64 -i "$image"`
imageB64=$(base64 < "$image" | tr -d '\n')
#imageB64=$image.temp.b64

base64 -i $image | tr -d '\n' > $image.temp.b64

echo "Enrolling $flyerId $image"

curl -v -s -X POST http://localhost:3001/enroll \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "flyerId": "$flyerId",
  "imageBase64": "$imageB64"
}
JSON
