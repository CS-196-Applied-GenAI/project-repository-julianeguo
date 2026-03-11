# Code-generation prompts: backend (test-driven)

Use these prompts **in order** with a code-generation LLM. Each prompt assumes the previous ones are done. After each response, run the described tests before moving to the next prompt. Everything is wired into the app so there is no orphaned code.

**Context to supply to the LLM when using this file:**  
- Project: Node.js + Express + MySQL backend for a Twitter/X-like app.  
- Spec: [spec.md](./spec.md).  
- Development plan: [plan.md](./plan.md).  
- Database: Use the [CS196-Database](https://github.com/anyabdch/CS196-Database) schema; table and column names should match that schema (or the plan’s equivalents).

---

## Prompt 1 — Project setup and minimal server

**Context:** Starting from an empty or minimal repo. No backend yet.

**Goal:** A runnable Node + Express app that reads env and exposes a simple health check. Tests: `npm install` works; server starts; a health or root route returns 200.

```
Implement the following in a new Node.js backend for this repo:

1. Initialize the project: create package.json (with "type": "module" or use CommonJS consistently), add .gitignore with node_modules, .env, and uploads.
2. Install dependencies: express, mysql2, dotenv.
3. Create src/ (or server/) with an entry file (e.g. src/index.js) that: loads dotenv, reads PORT from process.env (default 5000), creates an Express app, and starts the server on PORT.
4. Add a GET route that returns 200 for health check: either GET "/" or GET "/api/health" with a simple JSON body like { "ok": true }.
5. Add .env.example listing: PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, SESSION_SECRET. Update README to say these env vars must be set for the app to run.

Write no database or auth code yet. After implementation, running "npm install" and "node src/index.js" (or the same with your entry path) should start the server, and requesting GET / or GET /api/health should return 200. Prefer minimal, clean code and a single entry point that we will extend in the next steps.
```

---

## Prompt 2 — Database connection and health route

**Context:** Express app exists with a health (or root) route. No DB yet.

**Goal:** A DB module and a health route that depends on MySQL. Tests: DB module can run a query; health route returns 200 when DB is up and fails or returns 503 when DB is down.

```
Building on the existing Express app in this repo:

1. Create a database module (e.g. src/db.js) that: uses mysql2 to create a connection pool from env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME), and exports a function to run a query (e.g. query(sql, params)) and optionally the pool. Use the same module system (ESM or CommonJS) as the rest of the app.
2. Change the health route (GET /api/health or GET /) so it: runs a simple DB query (e.g. SELECT 1) using the new db module, and returns 200 with a body like { "ok": true, "db": "ok" } only when the query succeeds. If the query fails, return 503 or 500 and indicate the DB is unavailable.

Do not add any other routes or auth. After implementation, the health endpoint should succeed when MySQL is running and configured, and fail appropriately when the DB is down or missing. Add a brief note in README on how to run the CS196 schema if that is the intended DB.
```

---

## Prompt 3 — Folder structure and route wiring

**Context:** App has entry file and DB module; health route uses DB.

**Goal:** Clear folder structure and a pattern for adding routes so nothing is orphaned. Test: a dummy API route returns an expected response.

```
Building on the existing Express app and db module:

1. Define a folder structure for the backend, for example: src/routes/, src/middleware/, src/controllers/ (or src/handlers/), src/validation/, and src/services/ if you use them. Create these directories.
2. Move or refactor the health route into a dedicated route file (e.g. src/routes/health.js or src/routes/index.js) and mount it in the main entry file (e.g. app.use('/api', healthRoutes) or app.use('/api/health', ...)). Keep the health route behavior unchanged (DB check, 200/503).
3. Add one dummy route (e.g. GET /api/ping that returns { "pong": true }) to confirm route wiring works. Mount it in the same entry file so all API routes are registered in one place.

Do not add auth or business logic. The goal is a clear, extensible structure and a single place in the entry file where routes are wired. After implementation, GET /api/health and GET /api/ping (or your paths) should work as described.
```

---

## Prompt 4 — Auth validation helpers and unit tests

**Context:** App has structure and health + ping. No auth or user tables yet.

**Goal:** Reusable validation helpers and unit tests only. No routes, no DB writes. Tests: invalid inputs fail; valid inputs pass.

```
Building on the existing backend structure:

1. Add a validation module (e.g. src/validation/auth.js or src/validation/user.js) with pure functions:
   - validateUsername(username): 3–20 chars, only letters (a-z, A-Z), numbers, and underscores. Return { valid: true } or { valid: false, message: "..." }.
   - validatePassword(password): min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 symbol. Same return shape.
   - validateEmail(email): non-empty, valid email format. Same return shape.
2. Add a test script or use a test runner (e.g. Node built-in test runner or Jest). Write unit tests for these validators: invalid usernames (too short, too long, invalid chars), invalid passwords (too short, missing character types), invalid emails (empty, bad format); and valid inputs for all three.

Do not create signup or login routes yet. Do not touch the database. After implementation, running the test suite should pass for all validation cases. Export the validation functions so they can be used by auth routes in the next step.
```

---

## Prompt 5 — Signup route and integration tests

**Context:** Validation helpers exist and are tested. DB schema is assumed to have a users table (id, username, email, password_hash, and any columns required by CS196).

**Goal:** POST /api/auth/signup that validates input, checks uniqueness (username case-insensitive, email unique), hashes password, inserts user. Tests: valid signup returns 201; duplicate username/email return 400; invalid body returns 400.

```
Building on the existing backend and validation module:

1. Ensure the app uses the CS196 (or equivalent) users table: at least id, username, email, password_hash. If the schema uses different column names, align with that. Store username in a consistent case (e.g. lowercase) for uniqueness checks.
2. Install bcrypt (or bcryptjs). Add a signup route POST /api/auth/signup. Body: { username, password, email }. Use the existing validation helpers for all three. If validation fails, return 400 with a clear message. Check that username (case-insensitive) and email are unique; if taken, return 400. Hash the password and insert the user (no plaintext password in DB). On success return 201 and a JSON body with user id and safe fields (e.g. id, username, email) — never return password or password_hash.
3. Wire the route in the main entry file under /api/auth (e.g. app.use('/api/auth', authRoutes)).
4. Add integration tests for signup: (a) valid body creates user and returns 201, (b) duplicate username returns 400, (c) duplicate email returns 400, (d) invalid username/password/email each return 400. Use a test DB or transactions so tests don't pollute production data.

After implementation, all signup tests should pass and the route should be reachable at POST /api/auth/signup.
```

---

## Prompt 6 — Session middleware and login route

**Context:** Signup route exists and is wired. No session or login yet.

**Goal:** Session stored in cookie; POST /api/auth/login sets session and returns user info. Tests: login with valid credentials sets session cookie and returns 200; invalid credentials return 401.

```
Building on the existing auth routes and user table:

1. Install express-session. In the main entry file, add the session middleware before any routes that need it. Configure: cookie httpOnly, secure in production (e.g. NODE_ENV === 'production'), sameSite. Use a session store: in-memory store is fine for development; if the plan specifies a MySQL store, use that. Do not add login or logout yet — just ensure the app uses session (e.g. a temporary route that sets session.userId and returns it, then remove that route after verifying the cookie is set).
2. Add POST /api/auth/login. Body: { username, password }. Look up user by username (case-insensitive: compare with lowercase or use LOWER() in SQL). If not found or password does not match (bcrypt compare), return 401. If valid, set session.userId (and optionally session.username), then return 200 with minimal user info (id, username, no password). Wire this route under /api/auth.
3. Add integration tests: login with valid credentials returns 200 and sets session cookie; wrong password or unknown username returns 401.

After implementation, login should work and tests should pass. Remove any temporary session-test route.
```

---

## Prompt 7 — Auth middleware, logout, and current-user route

**Context:** Session and login are implemented and wired.

**Goal:** Auth middleware for protected routes; logout and GET /api/auth/me. Tests: unauthenticated request to a protected route gets 401; logout clears session; GET /api/auth/me returns current user when logged in and 401 when not.

```
Building on the existing session and login:

1. Add an auth middleware (e.g. requireAuth in src/middleware/auth.js). It should read session.userId; if missing, respond with 401 and a short message (e.g. "Unauthorized"). Export it for use in routes.
2. Add POST /api/auth/logout: destroy the session (req.session.destroy), clear the session cookie if needed for your session store, return 204. Wire under /api/auth.
3. Add GET /api/auth/me: if session.userId is set, load the user from the database (id, username, email, bio, profile_picture_url or equivalent — never password) and return 200 with that object. If not logged in, return 401. Apply the requireAuth middleware to this route. Wire under /api/auth.
4. Ensure the auth middleware is applied only to routes that require login (e.g. /api/auth/me). Signup and login must remain public. Document that any new protected route should use requireAuth.

Add integration tests: (a) request to GET /api/auth/me without session returns 401; (b) after login, GET /api/auth/me returns the user; (c) after logout, GET /api/auth/me returns 401. After implementation, all auth routes should be wired and tests should pass.
```

---

## Prompt 8 — Password reset token service and DB

**Context:** Auth core is done (signup, login, logout, me, requireAuth).

**Goal:** Password reset token table and a small service to create/find tokens. No routes yet. Tests: create token and find by token returns user_id when not expired; expired token is not found.

```
Building on the existing backend and DB:

1. Ensure the database has a table for password reset tokens (e.g. password_reset_tokens with columns: id, user_id, token, expires_at). If the CS196 schema already has this, use it; otherwise add a migration or SQL script and document how to run it. The token column should be unique; expires_at should be a timestamp (e.g. 1 hour from creation).
2. Create a token service (e.g. src/services/passwordReset.js): 
   - createResetToken(userId): generate a secure random token (e.g. crypto.randomBytes(32).toString('hex')), set expires_at to now + 1 hour, insert row, return the token.
   - findValidToken(token): find row by token; if not found or expires_at < now, return null; otherwise return { userId, token } or similar. Optionally delete the token after use or in a separate step.
3. Add unit or integration tests: createResetToken inserts a row; findValidToken returns userId for a valid token; findValidToken returns null for expired or invalid token.

Do not add forgot-password or reset-password routes yet. After implementation, the token service is tested and ready to be used by those routes.
```

---

## Prompt 9 — Forgot-password route and email sending

**Context:** Token service exists. No email or forgot-password route yet.

**Goal:** Email sending helper and POST /api/auth/forgot-password. Tests: request returns 200; token is stored; in dev, reset link is logged or sent.

```
Building on the existing token service and auth routes:

1. Add an email helper (e.g. src/services/email.js): one function sendPasswordResetEmail(email, resetLink). Use Nodemailer with SMTP or a provider like Resend (config from env: e.g. SMTP_HOST, SMTP_USER, SMTP_PASS, or RESEND_API_KEY). In development, if a "log only" mode is set (e.g. LOG_EMAIL_ONLY=true), log the reset link to the console instead of sending. This avoids requiring real SMTP in dev.
2. Add POST /api/auth/forgot-password. Body: { email }. Find user by email. If user exists: call token service to create a reset token, build a reset URL (e.g. FRONTEND_URL from env + /reset-password?token=...), call sendPasswordResetEmail(user.email, url). Always return 200 with a generic message like { "message": "If an account exists, you will receive an email." } (no user enumeration). Wire the route under /api/auth.
3. Add an integration test: POST with an existing email returns 200 and a token is stored (and in log mode the link is logged); POST with unknown email still returns 200.

After implementation, the route is wired and the token + email (or log) flow works.
```

---

## Prompt 10 — Reset-password route

**Context:** Forgot-password creates tokens and sends (or logs) email. No reset-password endpoint yet.

**Goal:** POST /api/auth/reset-password that accepts token and new password, validates and updates user, invalidates token. Tests: valid token + strong password updates password and returns 204; invalid/expired token or weak password returns 400.

```
Building on the existing token service and auth routes:

1. Add POST /api/auth/reset-password. Body: { token, newPassword }. Use the existing password validation helper (same rules as signup). If validation fails, return 400. Call findValidToken(token); if null, return 400 (invalid or expired). Hash newPassword and update the user's password in the database; then delete or invalidate the token row. Return 204 on success.
2. Wire the route under /api/auth.
3. Add integration tests: valid token + valid new password updates user and returns 204; invalid token returns 400; expired token returns 400; weak password returns 400.

After implementation, the full forgot-password → email → reset-password flow is complete and tested.
```

---

## Prompt 11 — GET user profile with follower/following counts

**Context:** Auth and password reset are done. No user profile or follow data yet.

**Goal:** GET /api/users/:id (or GET /api/users/by-username/:username) that returns public profile and counts. Tests: authenticated request returns profile and counts; 404 for missing user.

```
Building on the existing routes and DB (CS196 schema):

1. Assume a follows table (e.g. follower_id, following_id or follower_id, followee_id). Add GET /api/users/:id (or by-username if your schema uses usernames for lookups). Require auth (requireAuth). Return public profile: id, username, bio, profile_picture_url (or equivalent), follower_count, following_count. Do not return email or password. If user not found, return 404.
2. Implement follower_count and following_count: either two subqueries or a single query with JOINs/aggregates so the response includes the current counts from the follow table. Use the same table/column names as the CS196 schema.
3. Wire the route (e.g. GET /api/users/:id) and mount under /api/users with requireAuth.
4. Add integration tests: authenticated request to existing user returns 200 with correct counts; request to non-existent user id returns 404; unauthenticated request returns 401.

After implementation, profile fetch is wired and counts are correct.
```

---

## Prompt 12 — PATCH /api/users/me (bio and username)

**Context:** GET user profile exists. No update-profile route yet.

**Goal:** PATCH /api/users/me to update bio (≤200 chars) and/or username (same rules as signup; case-insensitive unique; allow keeping current username). Tests: valid update returns 200 with updated user; duplicate username returns 400.

```
Building on the existing auth and validation:

1. Add validation for bio: length 0–200 characters. Add it to the validation module or a profile validation helper.
2. Add PATCH /api/users/me. Body may include { bio, username }. Require auth. If bio is provided: validate length ≤200; update. If username is provided: validate with existing validateUsername; if unchanged from current user's username (case-insensitive), treat as no-op and allow; otherwise check uniqueness (case-insensitive); if taken return 400; update. Return 200 with updated user (id, username, email, bio, profile_picture_url — no password).
3. Wire under /api/users (e.g. router.patch('/me', requireAuth, ...)).
4. Add integration tests: update bio only; update username to new unique value; update username to same value (success); update username to existing other user (400); bio over 200 chars (400).

After implementation, profile update is wired and tested.
```

---

## Prompt 13 — Profile picture upload (multer and resize)

**Context:** PATCH /api/users/me exists for bio/username. No file upload yet.

**Goal:** Multer config, file validation, resize to 400×400, save to disk. No route yet or a minimal test route. Tests: oversized or wrong type rejected; valid file saved and resized.

```
Building on the existing backend structure:

1. Install multer and sharp. Create uploads/profiles/ if it doesn't exist; add it to .gitignore if not already (e.g. uploads/).
2. Add a multer config (e.g. in src/middleware/upload.js or src/config/upload.js): single file field (e.g. 'avatar'); max file size 2 MB; accept only image/jpeg and image/png (use fileFilter). Save to disk with a unique filename (e.g. uuid v4 + extension from mimetype). Destination: uploads/profiles/.
3. Add a resize step: after multer, use sharp to resize/crop the image to 400×400 (e.g. cover or fit) and overwrite the saved file (or save to same path). This can be a middleware or a function called from the route.
4. Optionally add a temporary route POST /api/upload-test that uses this multer + resize and returns the saved filename, so we can verify upload and resize work. Remove or guard this route in production.

Add an integration test or manual check: uploading a valid JPEG/PNG under 2 MB results in a 400×400 file in uploads/profiles/; uploading a file over 2 MB or wrong type returns 400. After implementation, the upload pipeline is ready to be used by the profile avatar route.
```

---

## Prompt 14 — PATCH /api/users/me/avatar and static uploads

**Context:** Multer and sharp resize are implemented; user table has a profile_picture_url (or equivalent) column.

**Goal:** PATCH /api/users/me/avatar that accepts upload, resizes, saves path to user, returns updated user; serve static files so frontend can display avatars. Tests: upload updates user and GET /api/auth/me returns correct avatar URL.

```
Building on the existing multer + sharp upload and PATCH /api/users/me:

1. Add PATCH /api/users/me/avatar (or a multipart PATCH /api/users/me that accepts an optional file). Use the existing multer config (single file, 2 MB, jpeg/png) and resize to 400×400. On success: save the file path or URL (e.g. /uploads/profiles/<filename>) to the user's profile_picture_url in the DB; return 200 with updated user (same shape as GET /api/auth/me). Require auth. If no file or invalid file, return 400.
2. In the main entry file, serve static files from the uploads directory (e.g. app.use('/uploads', express.static('uploads'))). So a saved path like /uploads/profiles/abc.jpg is reachable at GET /uploads/profiles/abc.jpg.
3. Wire the avatar route under /api/users (e.g. router.patch('/me/avatar', requireAuth, uploadMiddleware, resizeMiddleware, handler). Ensure the handler updates the user row and returns the same user shape as GET /api/auth/me (including profile_picture_url).
4. Add integration test: authenticated user uploads a valid image; GET /api/auth/me includes the new profile_picture_url; the URL is reachable (static serve).

After implementation, profile picture upload is fully wired and there is no orphaned upload code.
```

---

## Prompt 15 — Post content validation helper

**Context:** Posts table exists (CS196). No post routes yet.

**Goal:** Validation for post content (1–280 chars) and unit test only. No routes. Tests: 0 and >280 fail; 1–280 pass.

```
Building on the existing validation patterns:

1. Add a post validation helper (e.g. in src/validation/post.js): validatePostContent(content). Rules: length must be between 1 and 280 characters (inclusive). Return { valid: true } or { valid: false, message: "..." }. Treat null/undefined as invalid.
2. Add unit tests: content length 0 returns invalid; content length 281 returns invalid; content length 1 and 280 and 100 return valid.

Do not add POST /api/posts or any route yet. Export the function for use in the next step. After implementation, the test suite passes for post content validation.
```

---

## Prompt 16 — Posts: create, delete, get one

**Context:** Post validation exists. Auth middleware and user/post tables exist.

**Goal:** POST /api/posts, DELETE /api/posts/:id, GET /api/posts/:id. All require auth. Delete only for owner; GET respects blocking (viewer blocked author or author blocked viewer → 404 or hide). Tests: create returns 201; delete owner 204 / non-owner 403; GET returns post when allowed, 404 when blocked or missing.

```
Building on the existing auth, validation, and DB:

1. Add POST /api/posts. Body: { content }. Require auth. Validate with validatePostContent; if invalid return 400. Insert post with user_id from session.userId. Return 201 with post (id, user_id, content, created_at). Wire under /api/posts with requireAuth.
2. Add DELETE /api/posts/:id. Require auth. Load post by id; if not found return 404; if post.user_id !== session.userId return 403; else delete and return 204. Wire under /api/posts.
3. Add GET /api/posts/:id. Require auth. Load post; if not found return 404. Check block: if the viewer (session.userId) has blocked the author or the author has blocked the viewer (using the blocks table), return 404 so blocked content is never shown. Otherwise return 200 with post (id, user_id, content, created_at, and author username/avatar if useful for thread view). If you don't have a block helper yet, implement a minimal check: query blocks table for (viewer, author) or (author, viewer). Wire under /api/posts.
4. Add integration tests: create post success and 400 for invalid length; delete own post 204, delete other's post 403; GET post when not blocked returns 200, when blocked returns 404.

After implementation, all three post routes are wired and tested.
```

---

## Prompt 17 — Replies: create and list (oldest first)

**Context:** Posts and auth exist. Comments/replies table exists (CS196). Block check exists for GET post.

**Goal:** POST /api/posts/:id/replies, GET /api/posts/:id/replies. Reply validation same as post (1–280). List oldest first. Filter out replies where viewer blocked author or author blocked viewer (use same block logic as GET post). Tests: create reply 201; invalid length 400; GET returns replies in ascending order; blocked user's replies omitted.

```
Building on the existing posts and block check logic:

1. Reuse post content validation for reply body (1–280 chars). Add POST /api/posts/:id/replies. Body: { content }. Require auth. Validate content; if invalid return 400. Ensure post :id exists; if not return 404. Insert reply with parent_post_id (or equivalent) = :id and user_id from session. Return 201 with reply (id, user_id, parent_post_id, content, created_at). Wire under /api/posts.
2. Add GET /api/posts/:id/replies. Require auth. Return replies for that post only, ordered by created_at ASC (oldest first). Exclude replies where the reply author is in the "blocked set" for the viewer: either viewer blocked them or they blocked viewer (same logic as GET /api/posts/:id). Include author info (username, avatar) in each reply. Wire under /api/posts.
3. Add integration tests: create reply success; 400 for empty or >280 content; 404 for missing post; GET returns ascending order; when a reply author is blocked (either direction), that reply is not in the list.

After implementation, reply create and list are wired; use the same block semantics as the rest of the app.
```

---

## Prompt 18 — Delete reply

**Context:** Create and list replies exist. No delete reply yet.

**Goal:** DELETE /api/replies/:id (or DELETE /api/posts/:postId/replies/:replyId) that deletes only the current user's reply. Tests: owner gets 204; non-owner gets 403; missing reply 404.

```
Building on the existing reply routes:

1. Add DELETE /api/replies/:id (or DELETE /api/posts/:postId/replies/:replyId to match your routing). Require auth. Load reply by id; if not found return 404; if reply.user_id !== session.userId return 403; else delete reply and return 204.
2. Wire the route in the same router as other reply routes.
3. Add integration tests: delete own reply returns 204; delete another user's reply returns 403; delete non-existent reply returns 404.

After implementation, reply delete is wired and tested.
```

---

## Prompt 19 — Follow and unfollow; profile counts and is_following

**Context:** GET user profile exists with follower/following counts. Follows table exists.

**Goal:** POST /api/users/:id/follow, DELETE /api/users/:id/follow; no self-follow. GET profile includes is_following for current user. Tests: follow/unfollow work; self-follow returns 400; counts and is_following correct.

```
Building on the existing GET /api/users/:id and follow table:

1. Add POST /api/users/:id/follow. Require auth. If :id === session.userId return 400 (no self-follow). Otherwise insert a follow row (follower_id = session.userId, following_id = :id or equivalent). Use INSERT IGNORE or ON CONFLICT so duplicate follow is idempotent. Return 204 or 200. Wire under /api/users.
2. Add DELETE /api/users/:id/follow. Require auth. Remove the follow row. Return 204. Wire under /api/users.
3. Update GET /api/users/:id so the response includes is_following: true/false based on whether the current user (session.userId) follows :id. Use the same follow table. Ensure follower_count and following_count remain correct.
4. Add integration tests: follow another user then GET profile shows is_following true and counts updated; unfollow then is_following false; POST follow self returns 400.

After implementation, follow/unfollow and profile state are fully wired.
```

---

## Prompt 20 — Block helper and use it in replies

**Context:** Follow/block tables exist. GET post and GET replies already check block for single author; we need a reusable "blocked set" for the viewer for use in feeds and replies.

**Goal:** A getBlockedSet(viewerId) helper and use it in GET replies. Tests: helper returns correct set when A blocks B or B blocks A; GET replies excludes those authors.

```
Building on the existing block checks in GET post and GET replies:

1. Add a helper getBlockedSet(viewerId) (e.g. in src/services/block.js or src/db/queries.js). It should return a Set (or array) of user IDs such that either the viewer blocked them OR they blocked the viewer (mutual invisibility). Query the blocks table: (blocker = viewerId OR blocked = viewerId); collect the other user_id in each row. Return as Set for fast lookup. Add a unit or integration test: when A blocks B, getBlockedSet(A) contains B and getBlockedSet(B) contains A.
2. Refactor GET /api/posts/:id/replies to use getBlockedSet(session.userId). Filter out replies whose author id is in this set. Keep ordering oldest first. No other behavior change.
3. Optionally refactor GET /api/posts/:id (single post) to use getBlockedSet for consistency. Ensure GET /api/posts/:id still returns 404 when author is in viewer's blocked set.

After implementation, the block helper is the single source of truth for "blocked set" and is used by replies (and optionally single post). No duplicate block logic.
```

---

## Prompt 21 — Block and unblock routes

**Context:** getBlockedSet exists and is used in replies (and possibly GET post). No block/unblock routes yet.

**Goal:** POST /api/users/:id/block, DELETE /api/users/:id/block. On block, unfollow both directions. GET profile can expose is_blocked if needed. Tests: block creates row and removes follow both ways; unblock removes block only.

```
Building on the existing getBlockedSet and follow routes:

1. Add POST /api/users/:id/block. Require auth. Insert block row (blocker = session.userId, blocked = :id). Then remove follow in both directions: delete where (follower_id = session.userId AND following_id = :id) and delete where (follower_id = :id AND following_id = session.userId). Return 204. Wire under /api/users.
2. Add DELETE /api/users/:id/block. Require auth. Delete the block row (blocker = session.userId, blocked = :id). Do not auto-refollow. Return 204. Wire under /api/users.
3. Optionally add is_blocked to GET /api/users/:id response (whether current user has blocked this profile user) so the frontend can show Block/Unblock correctly.
4. Add integration tests: block user removes follow both ways; unblock removes only block; getBlockedSet reflects block state so feed/replies will hide content.

After implementation, block and unblock are wired and consistent with the spec.
```

---

## Prompt 22 — For You feed

**Context:** getBlockedSet exists. Posts table has original posts only (retweets are in a separate table or structure per CS196).

**Goal:** GET /api/feed/for-you returns up to 20 most recent original posts (no retweets), excluding authors in viewer's blocked set. Tests: returns ≤20; newest first; no blocked authors; no retweets.

```
Building on the existing getBlockedSet and posts:

1. Add GET /api/feed/for-you. Require auth. Query posts that are original only (no retweets — if your schema has a retweets table, exclude post ids that appear there as retweeted; or if original posts have a flag, filter by that). Exclude posts whose author is in getBlockedSet(session.userId). Order by created_at DESC. Limit 20. For each post, include author info (username, profile_picture_url, etc.) so the frontend can render "For You" without extra requests.
2. Wire under /api/feed (e.g. app.use('/api/feed', feedRoutes)).
3. Add integration tests: with test data, response has at most 20 items; order is newest first; posts from blocked users are not included; only original posts (no retweet-only entries).

After implementation, the For You feed is wired and ready for the frontend.
```

---

## Prompt 23 — Following feed (with retweets)

**Context:** For You feed exists. Retweets table or equivalent exists (user_id, post_id). Follow table exists.

**Goal:** GET /api/feed/following returns up to 20 feed items: each item is either a post or a retweet. Retweet items include retweeter + original post. Order by time (retweet time or post time); only from followed users; exclude blocked. Tests: ≤20 items; only from followed; retweets appear as "retweeter + original post".

```
Building on the existing For You feed and getBlockedSet:

1. Define a feed item shape: either { type: 'post', post, author } or { type: 'retweet', retweeter (user), post (original), author (original post author) }. Original posts from followed users and retweets by followed users (pointing to original posts) are both included. Exclude any item whose author or retweeter is in getBlockedSet(session.userId); also exclude if the original post's author (for retweets) is in the blocked set.
2. Add GET /api/feed/following. Require auth. Fetch (a) posts authored by users that session.userId follows, and (b) retweets by those same followed users (join retweets table with posts to get original post). Build a combined list of items: each post as { type: 'post', ... }, each retweet as { type: 'retweet', retweeter, post: originalPost, author: originalAuthor }. Sort by timestamp (post created_at or retweet created_at) DESC. Take first 20. Return the array.
3. Wire under /api/feed. Add integration tests: only followed users' posts and retweets appear; retweets show retweeter and original post; blocked users' content is excluded; max 20 items; order newest first.

After implementation, both feeds are complete and wired.
```

---

## Prompt 24 — Like and unlike; like_count and liked_by_me

**Context:** Posts and feed exist. Likes table exists (user_id, post_id).

**Goal:** POST /api/posts/:id/like, DELETE /api/posts/:id/like; include like_count and liked_by_me in post and feed responses. Tests: like/unlike work; count and state correct.

```
Building on the existing posts and feed:

1. Add POST /api/posts/:id/like. Require auth. Insert like (user_id = session.userId, post_id = :id) if not exists (idempotent). Return 204. Allow self-like per spec. Wire under /api/posts.
2. Add DELETE /api/posts/:id/like. Require auth. Remove like row. Return 204. Wire under /api/posts.
3. Add like_count and liked_by_me to: (a) GET /api/posts/:id response, (b) GET /api/feed/for-you items, (c) GET /api/feed/following items (for the post inside each item). like_count = count of likes for that post; liked_by_me = true if session.userId has a like for that post. Use a single query or subquery per response so the frontend doesn't need extra calls.
4. Add integration tests: like a post then GET post shows like_count 1 and liked_by_me true; unlike shows 0 and false; like idempotent (double like still 204).

After implementation, like/unlike are wired and all post/feed responses include like state.
```

---

## Prompt 25 — Retweet and unretweet; retweet_count and retweeted_by_me

**Context:** Following feed already includes retweets. Likes are implemented.

**Goal:** POST /api/posts/:id/retweet, DELETE /api/posts/:id/retweet; include retweet_count and retweeted_by_me in post and feed responses where relevant. Tests: retweet/unretweet work; counts and state correct.

```
Building on the existing Following feed and likes:

1. Add POST /api/posts/:id/retweet. Require auth. Ensure the post exists; if not return 404. Insert retweet row (user_id = session.userId, post_id = :id) if not exists (idempotent). Return 204. Allow self-retweet per spec. Wire under /api/posts.
2. Add DELETE /api/posts/:id/retweet. Require auth. Remove retweet row. Return 204. Wire under /api/posts.
3. Add retweet_count and retweeted_by_me to: (a) GET /api/posts/:id response, (b) post objects inside GET /api/feed/for-you and GET /api/feed/following (so the frontend can show "Retweeted by you" etc.). retweet_count = count of retweets for that post; retweeted_by_me = true if session.userId has a retweet for that post. Use the same pattern as like_count/liked_by_me (subquery or join).
4. Add integration tests: retweet then GET post shows retweet_count 1 and retweeted_by_me true; unretweet removes it; retweet is idempotent. Confirm Following feed still returns retweet items with correct shape.

After implementation, all backend features from the plan are wired: auth, profile, posts, replies, follow, block, feeds, like, and retweet. There is no orphaned code; every new piece is integrated into routes and tested.
```
