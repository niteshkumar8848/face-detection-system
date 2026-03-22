# FaceAI Scan

A full-stack real-time facial analytics system built with **React + face-api.js** (frontend) and **Node.js + Express + MongoDB** (backend).

The app performs live webcam analysis and provides:
- real-time face detection and expression analysis
- age and gender estimation
- behavioral insights (mood trend, engagement score, stress risk)
- session analytics and playback timeline
- dashboard-level aggregate analytics (emotion, gender, heatmap)

## Tech Stack

### Frontend
- React (Create React App)
- face-api.js
- react-chartjs-2 / chart.js
- axios

### Backend
- Node.js
- Express
- Mongoose
- MongoDB

## Features

### Scanner
- Live webcam stream with AI overlay (face box + track info)
- Continuous frame analysis (every 500ms)
- Multi-face tracking with per-track IDs
- Smoothed emotion prediction
- Alerting for sustained negative emotional streaks
- Real-time behavioral insights:
  - Mood Trend (`improving`, `stable`, `declining`)
  - Engagement Score (0–100)
  - Stress Risk (`HIGH` / `LOW`)
  - Average Confidence
  - Dominant Emotion
- Session summary after camera stop

### Dashboard
- Emotion distribution chart
- Gender distribution chart
- Day-hour heatmap
- Session playback:
  - timeline chart (faces + confidence over time)
  - event timeline (emotion shifts, alerts, face-count changes)
  - playback summary and insights

## Project Structure

```text
face-detection-system/
├── client/
│   ├── public/
│   │   └── models/                # face-api model files
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   ├── pages/
│   │   ├── App.js
│   │   └── App.css
│   ├── .env.example
│   └── package.json
├── server/
│   ├── controllers/
│   ├── events/
│   ├── models/
│   ├── routes/
│   ├── .env.example
│   ├── server.js
│   └── package.json
└── package.json
```

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or Atlas)

## Environment Variables

### Server (`server/.env`)
Copy from `server/.env.example` and set values:

```env
MONGO_URI=mongodb://localhost:27017/face-detection
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
```

### Client (`client/.env`)
Copy from `client/.env.example`:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Installation

From project root:

```bash
npm run install-all
```

Or manually:

```bash
cd client && npm install
cd ../server && npm install
```

## Run (Development)

From project root:

```bash
npm run dev
```

This starts:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

If port `3000` or `5000` is already used, stop old processes first.

## Build (Frontend)

```bash
cd client
npm run build
```

## API Overview

Base URL: `http://localhost:5000/api`

### Core Ingestion
- `POST /face-data`

### Stats
- `GET /stats/emotions`
- `GET /stats/gender`
- `GET /stats/heatmap`
- `GET /stats/insights/realtime?sessionId=<id>`

### Sessions
- `GET /sessions`
- `GET /sessions/:sessionId/playback`

### Profiles (internal consent/session bootstrapping)
- `POST /profiles/consent`
- `GET /profiles`
- `GET /stats/profile/:profileId`

### Realtime Stream
- `GET /stream` (SSE)

### Health
- `GET /health`

## Production Notes

- Set strict `CLIENT_ORIGIN` to your deployed frontend domain.
- Use MongoDB Atlas or secured managed MongoDB.
- Add reverse proxy (Nginx/Caddy) and HTTPS in production.
- Consider enabling auth/rate limiting for public deployments.
- Keep model assets (`client/public/models`) versioned and cached.

## Known Warning

You may see this non-blocking build warning from `face-api.js`:

```text
Module not found: Can't resolve 'fs' in face-api.js/build/es6/env
```

This does not break runtime in this project setup.

## License

ISC
