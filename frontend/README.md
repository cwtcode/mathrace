# Math Race (Math Racers)

Math Race is a gamified math practice web app for primary school learners (roughly ages 6–9). Players answer quick questions to move their racer forward, build combos, earn points, and unlock new characters while the difficulty adapts to performance.

## Features

- Race-style practice with a ghost racer and time-limited questions
- Strands: Number, Measures, Shape
- Adaptive difficulty via a backend challenge engine
- Points + combo streaks + character unlocks (saved locally)
- Home and performance dashboards
- Optional AI-generated session/analytics feedback via OpenRouter (backend)

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript
- Shared types: [shared/challenge.ts]

## Getting Started (Local Dev)

### Prerequisites

- Node.js (recommended: latest LTS)

### Install dependencies

```bash
cd backend
npm install
cd ../frontend
npm install
```

### Run the backend

```bash
cd backend
npm run dev
```

Backend defaults to `http://localhost:5005`.

### Run the frontend

```bash
cd frontend
npm run dev
```

Frontend defaults to `http://localhost:3000`. During development, the Vite server proxies `/api/*` to `http://localhost:5005` (see [vite.config.ts]).

## Environment Variables

### Backend

Copy the example file and fill values as needed:

```bash
cd backend
cp .env.example .env
```

- `PORT` (default: `5005`)
- `OPENROUTER_API_KEY` (optional; enables AI feedback endpoints)
- `OPENROUTER_MODEL` (optional; default: `openrouter/free`)

If `OPENROUTER_API_KEY` is missing, AI feedback falls back to a local message and question generation falls back to rule-based logic.

### Frontend

- `VITE_API_BASE_URL` (optional; default: `/api`)

Use this when deploying the frontend without the dev proxy and you want to point at a separate backend URL.

## Useful Scripts

### Frontend

```bash
cd frontend
npm run lint
npm test
npm run build
```

### Backend

```bash
cd backend
npm run build
node dist/index.js
```

## Backend API (Summary)

Base path: `/api`

- `GET /challenge/start?category=number|measures|shape`
- `POST /challenge/next` (body: `{ state, isCorrect, category }`)
- `POST /feedback/session` (AI feedback, optional)
- `POST /feedback/analytics` (AI feedback, optional)
- `GET /stats/answers?range=daily|weekly|monthly`
- `POST /stats/answers` (records an answer event for stats)
- `POST /analytics/answer` (records a detailed answer event)
- `GET /analytics/summary`
- `GET /analytics/export?format=json|csv`
