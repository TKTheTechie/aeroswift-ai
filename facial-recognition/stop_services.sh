#!/bin/bash
echo "🛑 Stopping all PM2 services..."

pm2 stop all
pm2 delete all

echo "✅ All services stopped."
pm2 list
