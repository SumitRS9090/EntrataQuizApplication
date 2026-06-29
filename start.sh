#!/bin/bash
# Start both backend and frontend in parallel

echo "Starting QuizBuilder..."

# Backend
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠  Created backend/.env — add your ANTHROPIC_API_KEY before running."
  exit 1
fi

source venv/bin/activate 2>/dev/null || python -m venv venv && source venv/bin/activate
pip install -r requirements.txt -q

uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
cd ../frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!

echo "✓ Backend  → http://localhost:8000"
echo "✓ Frontend → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" INT
wait
