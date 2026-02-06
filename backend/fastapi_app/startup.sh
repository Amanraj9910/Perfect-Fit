#!/bin/bash

# Explicitly install dependencies on startup to ensure they exist
echo "--- Installing Dependencies ---"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Start the application
echo "--- Starting Uvicorn ---"
python -m uvicorn main:app --host 0.0.0.0 --port 8000
