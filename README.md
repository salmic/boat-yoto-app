# Boat Scanner Yoto App

A connected Yoto card app inspired by [Dreaming of a Jet Plane](https://dreamingofajetplane.com/). It turns a Yoto player into a ship scanner that streams kid-friendly narrations about real vessels near the player.

## What it does

- Resolves the Yoto player's location from its network IP
- Finds nearby ships via [VesselAPI](https://vesselapi.com)
- Generates narration scripts with ship name, last port, destination, and fun facts
- Converts scripts to MP3 with free Microsoft Edge TTS via `node-edge-tts`
- Publishes a connected MYO card with 7 streaming chapters to your Yoto library

## Project structure

- `server/` — Express API that serves dynamic audio streams and ship previews
- `src/` — React admin UI for OAuth login, ship preview, and card publishing

## Prerequisites

1. A [Yoto developer client](https://dashboard.yoto.dev/) with callback URL configured
2. A free [VesselAPI](https://vesselapi.com) API key (optional; fallback ship data is used without it)
3. Node.js 20+

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment files:

   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```

3. Fill in `.env`:

   ```env
   VITE_CLIENT_ID=your_yoto_client_id
   VITE_API_BASE_URL=http://localhost:3001
   ```

4. Fill in `server/.env`:

   ```env
   PORT=3001
   PUBLIC_BASE_URL=http://localhost:3001
   VESSEL_API_KEY=your_vessel_api_key
   CORS_ORIGINS=http://localhost:3000
   ```

5. In the Yoto dashboard, allow these scopes for your client:

   ```
   family:library:view user:content:manage offline_access
   ```

   Request `offline_access` pre-approval if needed.

6. Add callback URL:

   ```
   http://localhost:3000
   ```

7. Start both frontend and backend:

   ```bash
   npm run dev
   ```

## Usage

1. Open `http://localhost:3000` and log in with Yoto
2. Review the nearby ship preview on the dashboard
3. Go to **Create Connected Card**
4. Click **Create Connected Card**
5. Link the new playlist to a Make Your Own card in the Yoto app
6. Play the card on a Wi-Fi connected Yoto player

## Connected card chapters

1. Scanning the Waters
2. A Ship
3. Listening...
4. Another Ship
5. Listening...
6. And Another Ship
7. Over and Out

## API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Health check |
| `GET /api/preview` | JSON preview of ships and scripts |
| `GET /audio/intro` | Intro MP3 stream |
| `GET /audio/ship/:index` | Ship narration MP3 stream |
| `GET /audio/transition/:index` | Transition MP3 stream |
| `GET /audio/outro` | Outro MP3 stream |
| `GET /audio/metadata` | Track duration metadata for card creation |

## Railway deployment

Deploy as a single Docker service that serves both the API and built frontend.

Set these Railway variables:

| Variable | Example |
|----------|---------|
| `VESSEL_API_KEY` | your VesselAPI key |
| `PUBLIC_BASE_URL` | `https://your-app.up.railway.app` |
| `CORS_ORIGINS` | `https://your-app.up.railway.app` |
| `VITE_CLIENT_ID` | build arg / env for frontend |
| `VITE_API_BASE_URL` | `https://your-app.up.railway.app` |

Build command uses the included `Dockerfile`. After deploy:

1. Update your Yoto callback URL to the deployed frontend URL
2. Log in, create the connected card, and link it to a MYO card

## Notes

- Ship AIS data is strongest near coasts and ports; inland players hear curated fallback ships
- MP3 files are cached on disk to reduce TTS and API calls
- The Yoto player must be online to play this connected card

## Scripts

- `npm run dev` — start frontend and backend together
- `npm run start:server` — backend only
- `npm start` — frontend only
- `npm run build` — build frontend into `dist/`
- `npm run start:prod` — run production server (serves `dist/`)
- `npm run test:server` — run narration and playlist tests
