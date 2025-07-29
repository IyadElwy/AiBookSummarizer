#!/bin/bash
HEARTBEAT_FILE="/tmp/worker_heartbeat"
MAX_AGE=120

if [ ! -f "$HEARTBEAT_FILE" ]; then
    exit 1
fi

LAST_HEARTBEAT=$(cat "$HEARTBEAT_FILE")
CURRENT_TIME=$(date +%s)
AGE=$((CURRENT_TIME - LAST_HEARTBEAT))

if [ "$AGE" -gt "$MAX_AGE" ]; then
    exit 1
fi

exit 0