import assert from "node:assert/strict";
import test from "node:test";
import { validateBio, validateEmail, validatePassword, validateUsername } from "../src/validation/auth.js";

test("validateUsername fails for too short username", () => {
  const result = validateUsername("ab");
  assert.equal(result.valid, false);
});

test("validateUsername fails for too long username", () => {
  const result = validateUsername("a".repeat(21));
  assert.equal(result.valid, false);
});

test("validateUsername fails for invalid characters", () => {
  const result = validateUsername("bad-name!");
  assert.equal(result.valid, false);
});

test("validateUsername passes for valid username", () => {
  const result = validateUsername("valid_user123");
  assert.deepEqual(result, { valid: true });
});

test("validatePassword fails for too short password", () => {
  const result = validatePassword("Aa1!");
  assert.equal(result.valid, false);
});

test("validatePassword fails when missing uppercase letter", () => {
  const result = validatePassword("lowercase1!");
  assert.equal(result.valid, false);
});

test("validatePassword fails when missing lowercase letter", () => {
  const result = validatePassword("UPPERCASE1!");
  assert.equal(result.valid, false);
});

test("validatePassword fails when missing number", () => {
  const result = validatePassword("NoNumber!");
  assert.equal(result.valid, false);
});

test("validatePassword fails when missing symbol", () => {
  const result = validatePassword("NoSymbol1");
  assert.equal(result.valid, false);
});

test("validatePassword passes for valid password", () => {
  const result = validatePassword("StrongPass1!");
  assert.deepEqual(result, { valid: true });
});

test("validateEmail fails for empty email", () => {
  const result = validateEmail("");
  assert.equal(result.valid, false);
});

test("validateEmail fails for bad format", () => {
  const result = validateEmail("not-an-email");
  assert.equal(result.valid, false);
});

test("validateEmail passes for valid email", () => {
  const result = validateEmail("user@example.com");
  assert.deepEqual(result, { valid: true });
});

test("validateBio fails when bio exceeds 200 characters", () => {
  const result = validateBio("a".repeat(201));
  assert.equal(result.valid, false);
});

test("validateBio passes for empty or short bio", () => {
  const result = validateBio("Short bio");
  assert.deepEqual(result, { valid: true });
});
