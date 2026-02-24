# Specification: Twitter/X-Like Web App

**Purpose:** Learning/portfolio project.  
**Stack:** React (frontend), Node.js (backend), MySQL (database).  
**Database:** Use the [CS196-Database](https://github.com/anyabdch/CS196-Database) repository; implement according to its schema and setup instructions (MySQL, `/schema` files, etc.). The provided schema includes support for comments and other required features.

---

## 1. Authentication & Access

### 1.1 Create account
- **Username:** 3–20 characters; only letters, numbers, and underscores. **Case-insensitive uniqueness** (e.g. "John" and "john" cannot both exist; store or compare in a consistent case, e.g. lowercase). Validate in UI and enforce on backend.
- **Password:** Minimum 8 characters, with at least 1 uppercase, 1 lowercase, 1 number, and 1 symbol. Validate in UI and enforce on backend.
- **Email:** Required at signup. Must be **unique** per account. Validate in UI and enforce on backend.

### 1.2 Login
- Users must be logged in to perform actions or view app content (feed, profiles, etc.).
- **Login state:** Session-based auth using **cookies** (server stores session; browser sends session cookie).
- After successful login → redirect to **main feed** with **"For You"** tab selected.

### 1.3 Logout
- Invalidate session and clear cookie.
- After logout → redirect to **public landing page**.
- Logged-out users cannot perform tasks or view content (except the landing page).

### 1.4 Forgot password
- User can request a password reset via a form (e.g. enter email).
- Server generates a secure reset token, stores it with an expiry (e.g. 1 hour), and sends an email to the user’s address with a link containing the token.
- User clicks link → page with token in URL → form to enter new password (same rules as signup) → submit → password updated, token invalidated.
- Email delivery may use a transactional email service (e.g. Resend, SendGrid) or SMTP; implementation detail left to developer.

---

## 2. Unauthenticated Experience

- **Public landing page:** Shown when not logged in. Includes a way to **login** and **sign up**. No feed or other app content until the user is logged in.

---

## 3. Profile

### 3.1 Update profile
- **Bio:** Maximum **200 characters**. Enforce in UI (e.g. counter) and on backend.
- **Username:** Same rules as signup (3–20 chars, letters/numbers/underscores, case-insensitive uniqueness). If the user keeps the same username (no change), treat as success; otherwise ensure the new username is not taken.
- **Profile picture:** Upload from the user’s device.
  - **Max file size:** 2 MB.
  - **Allowed formats:** JPEG, PNG.
  - **Dimensions:** Store/display at **400×400** (resize/crop on upload if needed; accept larger uploads up to e.g. 1024×1024 then normalize to 400×400).
  - Backend stores path or reference to the saved image (schema may define this).

---

## 4. Posts (tweets)

### 4.1 Create post
- **Character limit:** **280 characters**. Enforce in UI (e.g. character counter) and on backend.
- **Validation:** Reject posts that are **0 characters** or **over 280 characters** on the backend.

### 4.2 Delete post
- Users may delete **only their own** posts. Enforce on backend.
- **Confirmation step** required before delete (e.g. “Are you sure you want to delete this post?”).

---

## 5. Feed

### 5.1 Two feeds (tabs at the very top)
- **"For You":** Global timeline — recent tweets from **everyone** (excluding blocked users; see Blocking). **No retweets** in this tab; only original posts.
- **"Following":** Timeline of recent tweets **only from people the user follows**, plus **retweets** from those users. Retweets appear only in this tab.

### 5.2 Feed behavior
- **20 tweets per page.** Single page (no infinite scroll); **Refresh** button reloads the current feed (For You or Following).
- **Order:** Most recent to least recent.
- Blocking: Tweets from blocked users do not appear in either feed; users who have blocked the viewer do not appear (no content from them). Mutual invisibility (see Blocking).

### 5.3 Retweet display (Following tab only)
- Each retweet is **one feed item**: show “**Alice** retweeted” and then the **full original tweet** (author, text, etc.). Each retweet counts as one of the 20 items.

---

## 6. Comments (replies)

- **Character limit:** Same as posts — **280 characters**. Enforce in UI and on backend.
- **Where replies appear:** Replies **only** appear when viewing **that post’s thread**; they do **not** appear in the main “For You” or “Following” feeds.
- **Order in thread:** **Oldest first** (first reply at top).
- Users may like, comment, and retweet **their own** posts.
- **Blocking:** Replies from blocked users are **hidden** in threads (viewer does not see them). Replies from the viewer are **hidden** to users who have blocked them.

### 6.1 Delete comment
- Users may delete **only their own** comments. Enforce on backend.
- **Confirmation step** required before delete (e.g. “Delete this comment?”).

---

## 7. Follow / Unfollow

- Users can **follow** and **unfollow** other users.
- **No self-follow:** Users cannot follow themselves. Prevent in UI (e.g. no Follow on own profile) and reject on backend.

---

## 8. Block / Unblock

- **Block:** User A blocks User B → neither sees the other’s content (tweets, replies) in feed or threads. Enforce in feed queries and thread views.
- **Unblock:** Restores visibility (no automatic refollow).
- **On block:** When A blocks B, **automatically unfollow both directions:** A unfollows B (if applicable), and B is removed from A’s followers (so B no longer follows A). Match Twitter/X behavior.

---

## 9. Like / Unlike

- Users can **like** and **unlike** posts.
- Users may like their own posts.

---

## 10. Retweet / Unretweet

- Users can **retweet** and **unretweet** posts.
- Users may retweet their own posts.
- Retweets appear **only in the "Following" tab**, displayed as “**Alice** retweeted” plus the full original tweet (one item per retweet).

---

## 11. Viewing other users’ profiles

When a logged-in user views **another user’s profile**, show:
- Bio  
- Profile picture  
- That user’s posts (replies only in thread view, as elsewhere)  
- **Follow / Unfollow** button  
- **Block / Unblock** button  
- **Follower and following counts** (e.g. “42 Followers · 100 Following”)

---

## 12. Summary of validations (UI + backend)

| Area            | Rule |
|-----------------|------|
| Username        | 3–20 chars; letters, numbers, underscores only; case-insensitive unique |
| Password        | Min 8 chars; ≥1 uppercase, ≥1 lowercase, ≥1 number, ≥1 symbol |
| Email           | Required; unique |
| Post            | 1–280 characters |
| Comment         | 1–280 characters |
| Bio             | 0–200 characters |
| Profile picture | Max 2 MB; JPEG/PNG; normalize to 400×400 |
| Delete post     | Only own posts; confirmation required |
| Delete comment  | Only own comments; confirmation required |
| Follow          | No self-follow |
| Block           | Unfollow both directions on block |

---

## 13. Technical notes for developer

- **Database:** Follow CS196-Database repo for MySQL schema and setup. Extend or align schema only where needed (e.g. profile picture storage, reset tokens for forgot password if not already present).
- **Auth:** Session-based (cookies). Ensure all protected routes and feed/thread queries respect session and blocking rules.
- **Feed queries:** Exclude tweets/replies from blocked users and from users who have blocked the viewer. “For You” = global minus blocked; “Following” = from followed users only, including their retweets, minus blocked.
- **Refresh:** Reloads the currently selected feed (For You or Following) with the same 20-item, most-recent-first behavior.
