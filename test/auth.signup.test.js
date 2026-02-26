import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { createSignupHandler } from "../src/routes/auth.js";

function createQueryMock() {
  const users = [];
  let nextId = 1;

  async function queryFn(sql, params = []) {
    if (sql.startsWith("SELECT id FROM users WHERE LOWER(username)")) {
      const [normalizedUsername] = params;
      return users
        .filter((user) => user.username.toLowerCase() === normalizedUsername)
        .map((user) => ({ id: user.id }));
    }

    if (sql.startsWith("SELECT id FROM users WHERE email")) {
      const [email] = params;
      return users.filter((user) => user.email === email).map((user) => ({ id: user.id }));
    }

    if (sql.startsWith("INSERT INTO users")) {
      const [username, email, passwordHash] = params;
      const user = {
        id: nextId,
        username,
        email,
        password_hash: passwordHash
      };
      users.push(user);
      nextId += 1;
      return { insertId: user.id };
    }

    throw new Error(`Unexpected SQL in test mock: ${sql}`);
  }

  return { queryFn, users };
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test("POST /api/auth/signup returns 201 for valid signup", async () => {
  const { queryFn, users } = createQueryMock();
  const signupHandler = createSignupHandler({ queryFn });
  const req = {
    body: {
      username: "Valid_User",
      password: "StrongPass1!",
      email: "User@Example.com"
    }
  };
  const res = createMockRes();

  await signupHandler(req, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    id: 1,
    username: "valid_user",
    email: "user@example.com"
  });
  assert.equal(users.length, 1);
  assert.equal(users[0].password_hash === "StrongPass1!", false);
  assert.equal(await bcrypt.compare("StrongPass1!", users[0].password_hash), true);
  assert.equal(Object.hasOwn(res.body, "password"), false);
  assert.equal(Object.hasOwn(res.body, "password_hash"), false);
});

test("POST /api/auth/signup returns 400 for duplicate username (case-insensitive)", async () => {
  const { queryFn } = createQueryMock();
  const signupHandler = createSignupHandler({ queryFn });

  const firstReq = {
    body: {
      username: "ExistingUser",
      password: "StrongPass1!",
      email: "existing@example.com"
    }
  };
  const firstRes = createMockRes();
  await signupHandler(firstReq, firstRes);

  const req = {
    body: {
      username: "existinguser",
      password: "StrongPass1!",
      email: "another@example.com"
    }
  };
  const res = createMockRes();
  await signupHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Username is already taken.");
});

test("POST /api/auth/signup returns 400 for duplicate email", async () => {
  const { queryFn } = createQueryMock();
  const signupHandler = createSignupHandler({ queryFn });

  const firstReq = {
    body: {
      username: "firstuser",
      password: "StrongPass1!",
      email: "duplicate@example.com"
    }
  };
  const firstRes = createMockRes();
  await signupHandler(firstReq, firstRes);

  const req = {
    body: {
      username: "seconduser",
      password: "StrongPass1!",
      email: "duplicate@example.com"
    }
  };
  const res = createMockRes();
  await signupHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Email is already in use.");
});

test("POST /api/auth/signup returns 400 for invalid username", async () => {
  const { queryFn } = createQueryMock();
  const signupHandler = createSignupHandler({ queryFn });
  const req = {
    body: {
      username: "x",
      password: "StrongPass1!",
      email: "user@example.com"
    }
  };
  const res = createMockRes();

  await signupHandler(req, res);

  assert.equal(res.statusCode, 400);
});

test("POST /api/auth/signup returns 400 for invalid password", async () => {
  const { queryFn } = createQueryMock();
  const signupHandler = createSignupHandler({ queryFn });
  const req = {
    body: {
      username: "validuser",
      password: "weakpass",
      email: "user@example.com"
    }
  };
  const res = createMockRes();

  await signupHandler(req, res);

  assert.equal(res.statusCode, 400);
});

test("POST /api/auth/signup returns 400 for invalid email", async () => {
  const { queryFn } = createQueryMock();
  const signupHandler = createSignupHandler({ queryFn });
  const req = {
    body: {
      username: "validuser",
      password: "StrongPass1!",
      email: "bad-email"
    }
  };
  const res = createMockRes();

  await signupHandler(req, res);

  assert.equal(res.statusCode, 400);
});
