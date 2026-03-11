# Backend Build Plan: Twitter/X-Like App

This document is a step-by-step blueprint for building the **Node.js + MySQL** backend. It aligns with [spec.md](./spec.md) and assumes the [CS196-Database](https://github.com/anyabdch/CS196-Database) schema (or equivalent) is used. Steps are ordered so each builds on the previous; each step is sized for safe implementation and focused testing.

---

## Blueprint Overview

| Phase | Focus | Outcome |
|-------|--------|---------|
| 0 | Foundation | Runnalbe app, DB connection, env, structure |
| 1 | Auth core | Signup, login, logout, session, protected routes |
| 2 | Auth extended | Forgot password (token + email) |
| 3 | Profile | Get/update profile, profile picture upload |
| 4 | Posts | Create post, delete post, get post |
| 5 | Comments | Create reply, get replies, delete reply |
| 6 | Follow & block | Follow, unfollow, block, unblock, block-aware helpers |
| 7 | Feed | For You and Following feeds (20 items, blocking, retweets) |
| 8 | Like & retweet | Like, unlike, retweet, unretweet |

---

## Phase 0: Foundation

**Goal:** Project runs, connects to MySQL, and is ready for feature work.

### Chunk 0.1 — Project setup

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 0.1.1 | Initialize Node project (`package.json`), add `.gitignore` (node_modules, .env, uploads). | `npm install` runs. |
| 0.1.2 | Install core deps: `express`, `mysql2` (or driver per CS196), `dotenv`. Create `src/` (or `server/`) and entry file (e.g. `src/index.js`) that loads env and starts Express. | Server starts; GET `/` or `/health` returns 200. |
| 0.1.3 | Add `.env.example` with `PORT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SESSION_SECRET`. Document in README that these must be set. | App reads `process.env` and uses PORT. |

### Chunk 0.2 — Database connection

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 0.2.1 | Create a DB module (e.g. `src/db.js`) that creates a MySQL connection pool from env. Export a function to run a query and (optionally) get the pool. | Unit or small script: run `SELECT 1` and get a result. |
| 0.2.2 | Add a health route (e.g. `GET /api/health`) that runs a simple DB query and returns 200 only if DB responds. | Integration: call `/api/health` and confirm DB up/down behavior. |

### Chunk 0.3 — Schema and structure

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 0.3.1 | Document or add a script that runs the CS196 schema (e.g. run `schema/*.sql` in order per CS196 instructions). Ensure DB has users (with email), posts, comments/replies, follows, blocks, likes, retweets, and password_reset_tokens (or equivalent) as needed by spec. | After running schema, tables exist; user table has email and username. |
| 0.3.2 | Define folder structure: e.g. `src/routes/`, `src/middleware/`, `src/controllers/` or `src/handlers/`, `src/validation/`, `src/services/` (if used). Wire routes in entry file. | Request to a dummy route returns expected response. |

---

## Phase 1: Auth core

**Goal:** Users can sign up, log in, log out; session is stored in a cookie; protected routes require login.

### Chunk 1.1 — Validation and user creation

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 1.1.1 | Implement validation helpers (in code or small module): username (3–20 chars, letters/numbers/underscores only), password (min 8, ≥1 upper, lower, number, symbol), email (non-empty, valid format). Add unit tests. | Invalid inputs return clear failure; valid pass. |
| 1.1.2 | Add signup route `POST /api/auth/signup`: body `username`, `password`, `email`. Validate all three; check username uniqueness (case-insensitive) and email uniqueness; hash password (bcrypt); insert user. Return 201 + user id (no password) or 400 with message. | Signup with valid data creates user; duplicate username/email returns 400. |
| 1.1.3 | Add tests: signup success, duplicate username, duplicate email, invalid username/password/email. | All cases pass. |

### Chunk 1.2 — Session and login

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 1.2.1 | Install session middleware (e.g. `express-session`). Configure cookie (httpOnly, secure in prod, sameSite). Use a session store (memory for dev, or MySQL store per express-session docs). No auth routes yet. | Session cookie is set on any request that touches session. |
| 1.2.2 | Add login route `POST /api/auth/login`: body `username` (or email) and `password`. Look up user (case-insensitive for username); verify password with bcrypt; set `session.userId` (and optionally username); return 200 + minimal user info. Return 401 for wrong credentials. | Login sets session; 401 for bad credentials. |
| 1.2.3 | Add auth middleware: read `session.userId`; if missing, return 401. Apply to a test route. | Unauthenticated request to protected route gets 401; with valid session gets 200. |

### Chunk 1.3 — Logout and current user

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 1.3.1 | Add logout route `POST /api/auth/logout`: destroy session, clear cookie; return 204. | After logout, session cookie gone; next request unauthenticated. |
| 1.3.2 | Add `GET /api/auth/me`: if session exists, return current user (id, username, email, bio, profile_picture_url — no password). If not, return 401. | Logged-in user gets own info; logged-out gets 401. |

---

## Phase 2: Auth extended (forgot password)

**Goal:** User can request reset by email and set a new password via token.

### Chunk 2.1 — Reset token and email

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 2.1.1 | Ensure DB has password_reset_tokens (or equivalent): user_id, token (unique), expires_at. Add migration or document if using CS196 as-is. | Table exists; can insert/select by token. |
| 2.1.2 | Implement token service: generate secure random token (e.g. crypto.randomBytes(32)); save with user_id and expiry (e.g. 1 hour); expose function to create and one to find valid token. | Create token; find by token returns user_id when not expired. |
| 2.1.3 | Add email sending (e.g. Nodemailer + SMTP or Resend API): one function `sendPasswordResetEmail(email, resetLink)`. Config from env. Optional: in dev, log link instead of sending. | Link is generated and either sent or logged. |

### Chunk 2.2 — Forgot and reset routes

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 2.2.1 | Add `POST /api/auth/forgot-password`: body `email`. Find user by email; create reset token; build reset URL (frontend URL + token); send email (or log). Always return 200 with generic message (no user enumeration). | Request returns 200; token stored; email/log contains link. |
| 2.2.2 | Add `POST /api/auth/reset-password`: body `token`, `newPassword`. Validate token and expiry; validate newPassword (same rules as signup); hash and update user password; invalidate token; return 204. Return 400 for invalid/expired token or weak password. | Valid token + strong password updates password; invalid token returns 400. |

---

## Phase 3: Profile

**Goal:** Get and update profile (bio, username); upload and store profile picture (400×400, 2 MB, JPEG/PNG).

### Chunk 3.1 — Get and update (no picture)

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 3.1.1 | Add `GET /api/users/:id` or `GET /api/users/by-username/:username`: return public profile (id, username, bio, profile_picture_url, follower_count, following_count). Require auth. If user not found, 404. | Authenticated request returns profile; 404 for missing user. |
| 3.1.2 | Implement follower/following counts (queries or subqueries on follow table). Use in GET profile. | Counts match actual follow rows (manual check or test data). |
| 3.1.3 | Add `PATCH /api/users/me` (or `PUT`): body may include `bio` (≤200 chars), `username` (same rules as signup; case-insensitive unique; allow keeping current username). Validate; update only provided fields. Return updated user (no password). | Update bio/username; duplicate username returns 400. |

### Chunk 3.2 — Profile picture upload

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 3.2.1 | Install `multer` (and optionally `sharp` for resize). Configure multer: single file; max 2 MB; accept only image/jpeg, image/png. Reject others with 400. Save to e.g. `uploads/profiles/` with a unique filename (uuid + extension). | Upload returns 400 for oversized or wrong type; valid file saved. |
| 3.2.2 | Resize/crop to 400×400 (sharp or similar); overwrite or save as same path. Store path or URL in user profile (e.g. `profile_picture_url`). | Stored image is 400×400; DB has path/URL. |
| 3.2.3 | Add `PATCH /api/users/me/avatar` (or include in PATCH users/me with multipart): accept file upload; validate type/size; resize; save path to user; return updated user. Serve static files from uploads so frontend can display. | Upload updates user; GET profile returns correct avatar URL. |

---

## Phase 4: Posts

**Goal:** Create and delete posts (own only); fetch single post for thread view.

### Chunk 4.1 — Create and validate

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 4.1.1 | Add post validation: body length 1–280 characters (reject 0 and >280). Unit test. | Validation rejects 0 and >280; accepts 1–280. |
| 4.1.2 | Add `POST /api/posts`: body `content`. Require auth. Validate length; insert post with user_id from session. Return 201 + post (id, user_id, content, created_at). | Authenticated user creates post; 400 for invalid length. |

### Chunk 4.2 — Delete and get one

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 4.2.1 | Add `DELETE /api/posts/:id`: require auth; delete only if post exists and post.user_id === session.userId; else 403 or 404. Return 204. | Owner can delete; non-owner gets 403; missing post 404. |
| 4.2.2 | Add `GET /api/posts/:id`: require auth; return post (id, user_id, content, created_at, author username/avatar if needed). If viewer has blocked author or author has blocked viewer, return 404 or hide (per spec: no content from blocked). | Returns post when allowed; respects block. |

---

## Phase 5: Comments (replies)

**Goal:** Create reply, list replies for a post (oldest first, block-aware), delete own reply.

### Chunk 5.1 — Create and list

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 5.1.1 | Add reply validation: same as post (1–280 chars). Add `POST /api/posts/:id/replies`: body `content`; require auth; validate; insert with parent_post_id = :id and user_id from session. Return 201 + reply. | Reply created; 400 for invalid length; 404 if post missing. |
| 5.1.2 | Add `GET /api/posts/:id/replies`: require auth; return replies for post, **oldest first**; exclude replies where viewer has blocked author or author has blocked viewer. Return array with author info. | Order is ascending by time; blocked users’ replies omitted. |

### Chunk 5.2 — Delete reply

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 5.2.1 | Add `DELETE /api/replies/:id` (or `DELETE /api/posts/:postId/replies/:replyId`): require auth; delete only if reply exists and reply.user_id === session.userId; else 403/404. Return 204. | Owner can delete; non-owner 403. |

---

## Phase 6: Follow and block

**Goal:** Follow/unfollow; block/unblock with mutual unfollow on block; helpers for “blocked set” used in feeds and threads.

### Chunk 6.1 — Follow

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 6.1.1 | Add `POST /api/users/:id/follow`: require auth; :id must not equal session.userId (no self-follow → 400); insert follow row if not exists. Return 204 or 200. | Following works; self-follow returns 400. |
| 6.1.2 | Add `DELETE /api/users/:id/follow`: require auth; remove follow row. Return 204. | Unfollow removes row. |
| 6.1.3 | Ensure GET profile uses follower/following counts and (optional) “is_following” for current user. | Counts and state correct. |

### Chunk 6.2 — Block and unfollow on block

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 6.2.1 | Add helper: given viewer user_id, return set (or list) of user IDs that are “blocked for feed/thread” — either viewer blocked them OR they blocked viewer (mutual invisibility). Use in feed and reply queries. | Unit or integration: block in either direction hides content. |
| 6.2.2 | Add `POST /api/users/:id/block`: require auth; insert block row (blocker = session.userId, blocked = :id); remove follow in both directions (A unfollows B, B unfollows A). Return 204. | Block creates block; both follow rows removed. |
| 6.2.3 | Add `DELETE /api/users/:id/block`: require auth; remove block row. Return 204. No automatic refollow. | Unblock removes block only. |

---

## Phase 7: Feed

**Goal:** Two feed endpoints: For You (global, 20, no retweets, block-aware) and Following (20, followed users + retweets, block-aware).

### Chunk 7.1 — For You feed

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 7.1.1 | Add `GET /api/feed/for-you`: require auth; query posts (original only, no retweets) excluding authors in “blocked set” for current user; order by created_at DESC; limit 20. Return array with post + author (username, avatar, etc.). | Returns ≤20 posts; no blocked; no retweets; newest first. |

### Chunk 7.2 — Following feed (with retweets)

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 7.2.1 | Define “feed item”: either { type: 'post', post } or { type: 'retweet', retweeter (user), post (original) }. Fetch (1) posts from followed users and (2) retweets by followed users (pointing to original posts). Exclude blocked set for viewer; exclude original authors who are blocked. | Data shape and sources clear. |
| 7.2.2 | Add `GET /api/feed/following`: require auth; get 20 most recent items (posts + retweets from followed users); each retweet is one item with “retweeter” + original post; order by time (retweet time or post time); exclude blocked. Return array of feed items. | Returns ≤20 items; only from followed; retweets as “Alice retweeted” + original. |

---

## Phase 8: Like and retweet

**Goal:** Like/unlike and retweet/unretweet; feed and post responses include like/retweet state and counts where needed.

### Chunk 8.1 — Like

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 8.1.1 | Add `POST /api/posts/:id/like`: require auth; insert like (user_id, post_id) if not exists. Return 204. Allow self-like per spec. | Like idempotent; count increments. |
| 8.1.2 | Add `DELETE /api/posts/:id/like`: require auth; remove like. Return 204. | Unlike removes like. |
| 8.1.3 | Include like_count and (optional) liked_by_me in post/feed responses. | Frontend can show count and state. |

### Chunk 8.2 — Retweet

| Step | Task | Test / checkpoint |
|------|------|-------------------|
| 8.2.1 | Add `POST /api/posts/:id/retweet`: require auth; insert retweet row (user_id, post_id) or equivalent per schema. Return 204. Allow self-retweet. | Retweet stored; appears in Following feed. |
| 8.2.2 | Add `DELETE /api/posts/:id/retweet`: require auth; remove retweet. Return 204. | Unretweet removes row. |
| 8.2.3 | Include retweet_count and retweeted_by_me in post/feed responses where relevant. | Frontend can show count and state. |

---

## Implementation order summary

Execute in this order, completing tests at each step before moving on:

1. **0.1** → **0.2** → **0.3** (foundation)  
2. **1.1** → **1.2** → **1.3** (auth core)  
3. **2.1** → **2.2** (forgot password)  
4. **3.1** → **3.2** (profile)  
5. **4.1** → **4.2** (posts)  
6. **5.1** → **5.2** (comments)  
7. **6.1** → **6.2** (follow & block)  
8. **7.1** → **7.2** (feed)  
9. **8.1** → **8.2** (like & retweet)

---

## Testing strategy

- **Unit:** Validation helpers, token create/find, blocked-set helper.  
- **Integration:** Each route with a test DB or transactions: signup/login/logout, auth middleware, profile CRUD, post create/delete, replies, follow/block, feed responses, like/retweet.  
- **Manual:** Upload avatar, forgot-password email, full flow in browser.

Keep steps small so each can be merged after passing its checkpoint; this keeps the project stable and progress incremental.

---

## Step sizing review (second pass)

Steps were reviewed so that:

- **Most steps** are implementable in a short session (e.g. one or two small commits) with a clear test before moving on.
- **Heavier steps** are called out below; you can split them further if you want even smaller increments.

**Optional splits if you want finer granularity:**

- **2.2.1 (forgot-password route):** Split into (a) find user + create token + return 200, (b) add email sending.
- **3.2 (profile picture):** Already three steps (multer → resize → route); no change unless you add “delete old avatar on new upload” as a separate step.
- **7.2.2 (Following feed):** Split into (a) query posts from followed users only (no retweets yet), exclude blocked; (b) add retweets as items, merge and sort by time, limit 20.

**Steps that are intentionally small:**

- Validation helpers (1.1.1, 4.1.1, 5.1.1) are separate so they can be unit-tested in isolation.
- Session (1.2.1) before login (1.2.2) so cookie/session behavior can be verified without auth logic.
- Block helper (6.2.1) before block route (6.2.2) so feed/thread logic can rely on a tested “blocked set.”

No further breakdown is required for the rest; each step delivers a testable outcome and builds on the previous one.
