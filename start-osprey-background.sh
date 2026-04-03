#!/bin/bash

# Osprey Auto-Start Script (Background Mode)
# This script starts Osprey in the background

# Change to Osprey directory
cd /Users/tayloranderson/dev/spektrum/Osprey

# Start Docker Compose in detached mode (background)
/usr/local/bin/docker-compose up -d

# Optional: Log output
echo "Osprey started at $(date)" >> /Users/tayloranderson/dev/spektrum/Osprey/startup.log
