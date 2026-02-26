import { Router } from "express";
import bcrypt from "bcryptjs";
import { query as dbQuery } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../services/email.js";
import {
  createPasswordResetToken,
  findValidToken,
  invalidatePasswordResetToken
} from "../services/passwordResetToken.js";
import { validateEmail, validatePassword, validateUsername } from "../validation/auth.js";

export function createSignupHandler({ queryFn = dbQuery } = {}) {
  return async (req, res) => {
    try {
      const { username, password, email } = req.body ?? {};

      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return res.status(400).json(usernameValidation);
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json(passwordValidation);
      }

      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return res.status(400).json(emailValidation);
      }

      const normalizedUsername = username.toLowerCase();
      const normalizedEmail = email.trim().toLowerCase();

      const existingUsername = await queryFn(
        "SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1",
        [normalizedUsername]
      );
      if (existingUsername.length > 0) {
        return res.status(400).json({ valid: false, message: "Username is already taken." });
      }

      const existingEmail = await queryFn("SELECT id FROM users WHERE email = ? LIMIT 1", [
        normalizedEmail
      ]);
      if (existingEmail.length > 0) {
        return res.status(400).json({ valid: false, message: "Email is already in use." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const insertResult = await queryFn(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        [normalizedUsername, normalizedEmail, passwordHash]
      );

      res.status(201).json({
        id: insertResult.insertId,
        username: normalizedUsername,
        email: normalizedEmail
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error." });
    }
  };
}

export function createAuthRouter({
  queryFn = dbQuery,
  createTokenFn = createPasswordResetToken,
  findValidTokenFn = findValidToken,
  invalidateTokenFn = invalidatePasswordResetToken,
  sendResetEmailFn = sendPasswordResetEmail,
  frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
} = {}) {
  const router = Router();
  router.post("/signup", createSignupHandler({ queryFn }));
  router.post("/login", createLoginHandler({ queryFn }));
  router.post(
    "/forgot-password",
    createForgotPasswordHandler({ queryFn, createTokenFn, sendResetEmailFn, frontendUrl })
  );
  router.post(
    "/reset-password",
    createResetPasswordHandler({ queryFn, findValidTokenFn, invalidateTokenFn })
  );
  router.post("/logout", createLogoutHandler());
  router.get("/me", requireAuth, createMeHandler({ queryFn }));

  return router;
}

export function createLoginHandler({ queryFn = dbQuery } = {}) {
  return async (req, res) => {
    try {
      const { username, password } = req.body ?? {};

      if (typeof username !== "string" || typeof password !== "string") {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      const normalizedUsername = username.toLowerCase();
      const users = await queryFn(
        "SELECT id, username, password_hash FROM users WHERE LOWER(username) = ? LIMIT 1",
        [normalizedUsername]
      );

      if (users.length === 0) {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      const user = users[0];
      const passwordMatches = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatches) {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      req.session.userId = user.id;
      req.session.username = user.username;

      return res.status(200).json({
        id: user.id,
        username: user.username
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  };
}

export function createLogoutHandler() {
  return (req, res) => {
    if (!req.session) {
      return res.status(204).send();
    }

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.status(204).send();
    });
  };
}

export function createMeHandler({ queryFn = dbQuery } = {}) {
  return async (req, res) => {
    try {
      const users = await queryFn(
        "SELECT id, username, email, bio, profile_picture_url FROM users WHERE id = ? LIMIT 1",
        [req.session.userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = users[0];
      return res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio ?? null,
        profile_picture_url: user.profile_picture_url ?? null
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  };
}

export function createForgotPasswordHandler({
  queryFn = dbQuery,
  createTokenFn = createPasswordResetToken,
  sendResetEmailFn = sendPasswordResetEmail,
  frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
} = {}) {
  return async (req, res) => {
    try {
      const genericMessage = { message: "If an account exists, you will receive an email." };
      const { email } = req.body ?? {};
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return res.status(200).json(genericMessage);
      }

      const normalizedEmail = email.trim().toLowerCase();
      const users = await queryFn("SELECT id, email FROM users WHERE email = ? LIMIT 1", [
        normalizedEmail
      ]);

      if (users.length === 0) {
        return res.status(200).json(genericMessage);
      }

      const user = users[0];
      const { token } = await createTokenFn(user.id, { queryFn });
      const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
      await sendResetEmailFn(user.email, resetUrl);

      return res.status(200).json(genericMessage);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  };
}

export function createResetPasswordHandler({
  queryFn = dbQuery,
  findValidTokenFn = findValidToken,
  invalidateTokenFn = invalidatePasswordResetToken
} = {}) {
  return async (req, res) => {
    try {
      const { token, newPassword } = req.body ?? {};
      if (typeof token !== "string" || token.trim().length === 0) {
        return res.status(400).json({ message: "Invalid or expired token." });
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json(passwordValidation);
      }

      const tokenRow = await findValidTokenFn(token, { queryFn });
      if (!tokenRow) {
        return res.status(400).json({ message: "Invalid or expired token." });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await queryFn("UPDATE users SET password_hash = ? WHERE id = ?", [
        passwordHash,
        tokenRow.user_id
      ]);
      await invalidateTokenFn(token, { queryFn });

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  };
}

const authRoutes = createAuthRouter();

export default authRoutes;
