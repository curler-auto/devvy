#!/bin/bash

echo "🔑 Starting License Activator API..."
echo ""

cd backend

# Kill any existing process on port 8001
lsof -ti:8001 | xargs kill -9 2>/dev/null

# Start the API
python3 temp_license_activator.py
