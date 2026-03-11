import assert from "node:assert/strict";
import test from "node:test";
import nodemailer from "nodemailer";
import { sendPasswordResetEmail } from "../src/services/email.js";

test("sendPasswordResetEmail uses transporter and returns logged false when not in log-only mode", async () => {
  const previousLogOnly = process.env.LOG_EMAIL_ONLY;
  process.env.LOG_EMAIL_ONLY = "false";
  const sent = [];
  const transporter = {
    async sendMail(payload) {
      sent.push(payload);
    }
  };

  await sendPasswordResetEmail("user@example.com", "http://frontend/reset?token=x", { transporter });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "user@example.com");
  assert.ok(sent[0].text.includes("http://frontend/reset?token=x"));
  process.env.LOG_EMAIL_ONLY = previousLogOnly;
});

test("sendPasswordResetEmail creates nodemailer transporter when transporter not provided", async () => {
  const previousLogOnly = process.env.LOG_EMAIL_ONLY;
  const previousSmtpHost = process.env.SMTP_HOST;
  const previousSmtpUser = process.env.SMTP_USER;
  const previousSmtpPass = process.env.SMTP_PASS;
  const previousEmailFrom = process.env.EMAIL_FROM;
  const originalCreateTransport = nodemailer.createTransport;

  process.env.LOG_EMAIL_ONLY = "false";
  process.env.SMTP_HOST = "smtp.test";
  process.env.SMTP_USER = "smtp-user";
  process.env.SMTP_PASS = "smtp-pass";
  process.env.EMAIL_FROM = "no-reply@test.dev";

  const sent = [];
  nodemailer.createTransport = () => ({
    async sendMail(payload) {
      sent.push(payload);
    }
  });

  await sendPasswordResetEmail("user2@example.com", "http://frontend/reset?token=y");

  assert.equal(sent.length, 1);
  assert.equal(sent[0].from, "no-reply@test.dev");
  assert.equal(sent[0].to, "user2@example.com");

  nodemailer.createTransport = originalCreateTransport;
  process.env.LOG_EMAIL_ONLY = previousLogOnly;
  process.env.SMTP_HOST = previousSmtpHost;
  process.env.SMTP_USER = previousSmtpUser;
  process.env.SMTP_PASS = previousSmtpPass;
  process.env.EMAIL_FROM = previousEmailFrom;
});
