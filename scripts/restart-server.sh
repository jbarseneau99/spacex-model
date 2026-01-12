#!/bin/bash

# Restart script for SpaceX Model server
# Kills existing server process and restarts it on the same port

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVER_FILE="$PROJECT_DIR/server.js"
PID_FILE="$PROJECT_DIR/server.pid"
DEFAULT_PORT=2999

# Get port from environment or use default
PORT=${PORT:-$DEFAULT_PORT}

echo "=== Restarting SpaceX Model Server ==="
echo ""

# Kill process from PID file if it exists
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if [ -n "$PID" ] && ps -p "$PID" > /dev/null 2>&1; then
        echo "Killing process $PID from PID file..."
        kill "$PID" 2>/dev/null
        sleep 1
    else
        echo "Process $PID from PID file not found"
    fi
fi

# Kill any process on the port
echo "Checking for processes on port $PORT..."
PIDS=$(lsof -ti:$PORT 2>/dev/null)
if [ -n "$PIDS" ]; then
    echo "Found process(es) on port $PORT: $PIDS"
    echo "$PIDS" | xargs kill 2>/dev/null
    sleep 1
else
    echo "No process found on port $PORT"
fi

echo ""
echo "Waiting for processes to terminate..."
sleep 1

echo ""
echo "--- Starting Server ---"
echo "Server file: $SERVER_FILE"
echo "Port: $PORT"
echo ""

# Start the server
cd "$PROJECT_DIR"
PORT=$PORT node "$SERVER_FILE" &
NEW_PID=$!

# Save PID
echo "$NEW_PID" > "$PID_FILE"
echo "Server started with PID $NEW_PID"
echo "PID saved to $PID_FILE"

