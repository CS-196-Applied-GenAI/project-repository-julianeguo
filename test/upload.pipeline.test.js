import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { UPLOAD_DIR } from "../src/middleware/upload.js";

test("POST /api/upload-test rejects wrong file type with 400", async () => {
  const app = createApp({ enableUploadTestRoute: true, sessionSecret: "test-secret" });

  const response = await request(app)
    .post("/api/upload-test")
    .attach("avatar", Buffer.from("not an image"), {
      filename: "file.txt",
      contentType: "text/plain"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Only JPEG and PNG files are allowed.");
});

test("POST /api/upload-test rejects oversized file with 400", async () => {
  const app = createApp({ enableUploadTestRoute: true, sessionSecret: "test-secret" });
  const largeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1, 1);

  const response = await request(app).post("/api/upload-test").attach("avatar", largeBuffer, {
    filename: "big.jpg",
    contentType: "image/jpeg"
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "File must be 2MB or smaller.");
});

test("POST /api/upload-test saves and resizes valid image to 400x400", async () => {
  const app = createApp({ enableUploadTestRoute: true, sessionSecret: "test-secret" });
  const imageBuffer = await sharp({
    create: {
      width: 900,
      height: 600,
      channels: 3,
      background: { r: 120, g: 80, b: 20 }
    }
  })
    .jpeg()
    .toBuffer();

  const response = await request(app).post("/api/upload-test").attach("avatar", imageBuffer, {
    filename: "avatar.jpg",
    contentType: "image/jpeg"
  });

  assert.equal(response.status, 200);
  assert.ok(response.body.filename);

  const savedPath = path.join(UPLOAD_DIR, response.body.filename);
  assert.equal(fs.existsSync(savedPath), true);

  const metadata = await sharp(savedPath).metadata();
  assert.equal(metadata.width, 400);
  assert.equal(metadata.height, 400);

  fs.unlinkSync(savedPath);
});

test("POST /api/upload-test without file returns 400", async () => {
  const app = createApp({ enableUploadTestRoute: true, sessionSecret: "test-secret" });
  const response = await request(app).post("/api/upload-test");
  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Avatar file is required.");
});
