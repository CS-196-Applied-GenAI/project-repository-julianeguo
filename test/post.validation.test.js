import assert from "node:assert/strict";
import test from "node:test";
import { validatePostContent } from "../src/validation/post.js";

test("validatePostContent fails for length 0", () => {
  const result = validatePostContent("");
  assert.equal(result.valid, false);
});

test("validatePostContent fails for length 281", () => {
  const result = validatePostContent("a".repeat(281));
  assert.equal(result.valid, false);
});

test("validatePostContent passes for length 1", () => {
  const result = validatePostContent("a");
  assert.deepEqual(result, { valid: true });
});

test("validatePostContent passes for length 280", () => {
  const result = validatePostContent("a".repeat(280));
  assert.deepEqual(result, { valid: true });
});

test("validatePostContent passes for length 100", () => {
  const result = validatePostContent("a".repeat(100));
  assert.deepEqual(result, { valid: true });
});
