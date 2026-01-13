#!/bin/bash

# Script to start ngrok tunnel for SpaceX Model server
# Usage: ./scripts/start-ngrok.sh [authtoken]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PORT=3333

echo "=== Starting ngrok tunnel for SpaceX Model ==="
echo ""

# Check if authtoken provided
if [ -n "$1" ]; then
    echo "Configuring ngrok authtoken..."
    ngrok config add-authtoken "$1"
    if [ $? -eq 0 ]; then
        echo "✅ Authtoken configured successfully"
    else
        echo "❌ Failed to configure authtoken"
        exit 1
    fi
    echo ""
fi

# Check if ngrok is already running
if pgrep -f "ngrok http" > /dev/null; then
    echo "⚠️  ngrok is already running. Stopping existing instance..."
    pkill -f "ngrok http"
    sleep 2
fi

echo "Starting ngrok tunnel on port $PORT..."
echo "Public URL will be available at: http://localhost:4040"
echo ""

# Start ngrok
cd "$PROJECT_DIR"
ngrok http $PORT --log=stdout > ngrok.log 2>&1 &
NGROK_PID=$!

sleep 3

# Check if ngrok started successfully
if ps -p $NGROK_PID > /dev/null; then
    echo "✅ ngrok started with PID: $NGROK_PID"
    echo ""
    echo "Getting public URL..."
    sleep 2
    
    # Try to get the public URL from ngrok API
    PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$PUBLIC_URL" ]; then
        echo "🌐 Public URL: $PUBLIC_URL"
        echo ""
        echo "Update your .env file with:"
        echo "PUBLIC_URL=$PUBLIC_URL"
    else
        echo "⚠️  Could not retrieve public URL automatically"
        echo "Check http://localhost:4040 for the ngrok dashboard"
    fi
    
    echo ""
    echo "ngrok is running. Press Ctrl+C to stop."
    echo "Logs are being written to: ngrok.log"
else
    echo "❌ Failed to start ngrok"
    echo "Check ngrok.log for details"
    exit 1
fi




