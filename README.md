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
- `FRONTEND_URL`
- `LOG_EMAIL_ONLY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

These environment variables must be set for the app to run.

## Database Setup (CS196 Schema)

Use the CS196 schema for this project:

- Repo: [CS196-Database](https://github.com/anyabdch/CS196-Database)
- Create a MySQL database and import/run the schema from that repository.
- Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in your `.env` to match it.

## Install

```bash
npm install
```

## Run

```bash
node src/index.js
```

## Health Check

`GET /api/health` runs a DB check (`SELECT 1`):

- Returns `200` when DB is reachable:

```json
{ "ok": true, "db": "ok" }
```

- Returns `503` when DB is unavailable:

```json
{ "ok": false, "db": "unavailable" }
```

## Auth Notes

- Public auth routes: `POST /api/auth/signup`, `POST /api/auth/login`
- Protected auth route: `GET /api/auth/me` (requires session cookie)
- Logout route: `POST /api/auth/logout`
- Any new protected route should use `requireAuth` from `src/middleware/auth.js`.
- User profile route: `GET /api/users/:id` (requires auth) returns public profile + follower/following counts.
- Profile update route: `PATCH /api/users/me` (requires auth) updates `bio` and/or `username` with backend validation.
- Avatar route: `PATCH /api/users/me/avatar` (requires auth, multipart `avatar`) stores `/uploads/profiles/<file>` and returns updated user.
- Static uploads are served at `/uploads` so `profile_picture_url` can be loaded directly by the frontend.
- Posts routes (require auth): `POST /api/posts`, `GET /api/posts/:id`, `DELETE /api/posts/:id`.
- Replies routes (require auth): `POST /api/posts/:id/replies`, `GET /api/posts/:id/replies` (oldest first, block-aware).
- Reply delete route (require auth): `DELETE /api/replies/:id` (owner-only).
- Follow routes (require auth): `POST /api/users/:id/follow`, `DELETE /api/users/:id/follow`; self-follow is rejected.
- Block routes (require auth): `POST /api/users/:id/block`, `DELETE /api/users/:id/block`; blocking removes follow in both directions.
- `GET /api/users/:id` includes `is_following` for the current viewer.
- Feed route (require auth): `GET /api/feed/for-you` returns up to 20 newest original posts, excluding blocked authors.
- Feed route (require auth): `GET /api/feed/following` returns up to 20 newest items from followed users (posts + retweets), excluding blocked users.
- Like routes (require auth): `POST /api/posts/:id/like`, `DELETE /api/posts/:id/like` (idempotent like).
- Retweet routes (require auth): `POST /api/posts/:id/retweet`, `DELETE /api/posts/:id/retweet` (idempotent retweet).
- Post and feed responses include `like_count`, `liked_by_me`, `retweet_count`, and `retweeted_by_me`.
- Temporary upload test route: `POST /api/upload-test` (enabled only when `NODE_ENV !== production`) validates avatar upload (JPEG/PNG, max 2MB) and resizes to 400×400.
- Forgot-password route: `POST /api/auth/forgot-password` always returns `200` with a generic message.
- Reset-password route: `POST /api/auth/reset-password` accepts `token` and `newPassword`, returns `204` on success.
- In development, set `LOG_EMAIL_ONLY=true` to log reset links instead of sending SMTP email.
