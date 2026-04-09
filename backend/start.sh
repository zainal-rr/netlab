#!/bin/bash
# NetLab Backend Startup Script
# Run on your 32GB server

set -e

echo "🌐 NetLab AI Backend Starting..."

# Check Ollama
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama not found. Install: curl -fsSL https://ollama.com/install.sh | sh"
    exit 1
fi

# Pull model if not present
echo "📦 Checking Ollama model..."
ollama list | grep -q "llama3.1:8b" || {
    echo "⬇️  Pulling llama3.1:8b (~4.7GB)..."
    ollama pull llama3.1:8b
}

# Install Python deps
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt -q

# Seed knowledge base
echo "🧠 Seeding knowledge base..."
python seed_knowledge.py

# Start Ollama in background if not running
pgrep -x ollama > /dev/null || {
    echo "🚀 Starting Ollama..."
    ollama serve &
    sleep 3
}

# Start FastAPI
echo "🚀 Starting FastAPI backend on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

echo "✅ NetLab backend running at http://localhost:8000"
echo "📖 API docs at http://localhost:8000/docs"
