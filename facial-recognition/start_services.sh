#!/bin/bash
echo "🚀 Starting all PM2 services..."

# Go to repository root
#cd "$(dirname "$0")/.." || exit 1

# Load NVM + Node 18
source ~/.nvm/nvm.sh
nvm use 18 > /dev/null

# Start all services
pm2 start enroll-service/index-async.js --name "enroll-service"
echo "Enrollment service started!"
pm2 start verification-service/index.js --name "verification-service"
echo "Verification service started!"
pm2 start match-service/index.js --name "match-service"
echo "Match service started!"
pm2 start clear-service/index.js --name "clear-service"
echo "Clear service started!"

# Add more services here in the future, e.g.:
# pm2 start match-service.js --name "match-service"

# Save the list so they auto-start after reboot
pm2 save

echo "✅ All services started successfully!"
pm2 list
