#!/bin/bash
echo "🚀 Starting all PM2 services..."

# Go to repository root
#cd "$(dirname "$0")/.." || exit 1

# Load NVM + Node 18
source ~/.nvm/nvm.sh
nvm use 18 > /dev/null

# Start all Node.js services
pm2 start enroll-service/index-async.js     --name "enroll-service"
echo "✅ Enrollment service started!"

pm2 start verification-service/index.js     --name "verification-service"
echo "✅ Verification service started!"

pm2 start match-service/index.js            --name "match-service"
echo "✅ Match service started!"

pm2 start clear-service/index.js            --name "clear-service"
echo "✅ Clear service started!"

# Start Java service using the wrapper script we created
pm2 start /home/rocky/aeroswift-ai/pubsubplus-connector-qdrant/dist/start-pubsubplus.sh \
  --name "pubsubplus-connector-qdrant" \
  --interpreter none \
  --cwd /home/rocky/aeroswift-ai/pubsubplus-connector-qdrant/dist
echo "✅ Qdrant Micro-Integration (Java) started!"

# Save the current list so all services auto-start after server reboot
pm2 save

echo "✅ All services started successfully!"
pm2 list
