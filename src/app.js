import express from "express";
import path from "node:path";
import session from "express-session";
import apiRoutes from "./routes/index.js";
import { createAuthRouter } from "./routes/auth.js";
import { createFeedRouter } from "./routes/feed.js";
import { createUploadTestRouter } from "./routes/uploadTest.js";
import { createPostsRouter } from "./routes/posts.js";
import { createRepliesRouter } from "./routes/replies.js";
import { createUsersRouter } from "./routes/users.js";

export function createApp({
  authQueryFn,
  authCreateTokenFn,
  authFindValidTokenFn,
  authInvalidateTokenFn,
  authSendResetEmailFn,
  feedQueryFn,
  postsQueryFn,
  repliesQueryFn,
  usersQueryFn,
  enableUploadTestRoute = process.env.NODE_ENV !== "production",
  frontendUrl,
  sessionSecret
} = {}) {
  const app = express();

  app.use(express.json());
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.use(
    session({
      secret: sessionSecret || process.env.SESSION_SECRET || "dev-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      }
    })
  );

  app.use("/api", apiRoutes);
  app.use(
    "/api/auth",
    createAuthRouter({
      queryFn: authQueryFn,
      createTokenFn: authCreateTokenFn,
      findValidTokenFn: authFindValidTokenFn,
      invalidateTokenFn: authInvalidateTokenFn,
      sendResetEmailFn: authSendResetEmailFn,
      frontendUrl
    })
  );
  app.use("/api/feed", createFeedRouter({ queryFn: feedQueryFn }));
  app.use("/api/posts", createPostsRouter({ queryFn: postsQueryFn }));
  app.use("/api/replies", createRepliesRouter({ queryFn: repliesQueryFn }));
  app.use("/api/users", createUsersRouter({ queryFn: usersQueryFn }));
  if (enableUploadTestRoute) {
    app.use("/api", createUploadTestRouter());
  }

  return app;
}
