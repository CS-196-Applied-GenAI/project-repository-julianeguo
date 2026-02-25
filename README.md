# Backend Setup

Minimal Node.js + Express backend scaffold for the Twitter/X-like app.

## Requirements

- Node.js 18+ (recommended)
- npm

## Environment Variables

Create a `.env` file (you can copy from `.env.example`) and set:

- `PORT`
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `SESSION_SECRET`

These environment variables must be set for the app to run.

## Install

```bash
npm install
```

## Run

```bash
node src/index.js
```

## Health Check

`GET /api/health` returns:

```json
{ "ok": true }
```
