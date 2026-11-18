import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { startTestServer } from "./helpers/testServer.js";
import { createUser } from "./helpers/factories.js";
import User from "../src/models/User.js";
import Session from "../src/models/Session.js";

// Firebase Admin is replaced by a fake verifier: the "ID token" is the JSON of
// the decoded claims we want the backend to see.
vi.mock("../src/config/firebase.js", () => ({
  initializeFirebase: vi.fn(),
  verifyFirebaseToken: vi.fn(async (idToken) => JSON.parse(idToken)),
}));

const firebaseToken = (claims) => JSON.stringify(claims);

let ctx;
beforeAll(async () => {
  ctx = await startTestServer();
});
afterAll(async () => {
  await ctx?.close();
});

describe("Sign up & sign in", () => {
  it("creates an account, rejects duplicates and reserved email domains", async () => {
    const user = await createUser(ctx.api);
    expect(user.id).toMatch(/^[a-f\d]{24}$/);

    const dupUsername = await ctx.api()
      .post("/api/auth/signup")
      .send({ username: user.username, password: "secret123", email: "other@test.dev", firstName: "A", lastName: "B" });
    expect(dupUsername.status).toBe(409);

    const dupEmail = await ctx.api()
      .post("/api/auth/signup")
      .send({ username: "brandnew1", password: "secret123", email: user.email, firstName: "A", lastName: "B" });
    expect(dupEmail.status).toBe(409);

    // <uid>@github.local is reserved for GitHub accounts without a verified email
    const reserved = await ctx.api()
      .post("/api/auth/signup")
      .send({ username: "squatter1", password: "secret123", email: "abc@GitHub.Local", firstName: "A", lastName: "B" });
    expect(reserved.status).toBe(400);
  });

  it("signs in with username or email, sets an httpOnly refresh cookie, hides user enumeration", async () => {
    const user = await createUser(ctx.api);

    const byEmail = await ctx.api().post("/api/auth/signin").send({ username: user.email, password: user.password });
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.accessToken).toBeTypeOf("string");
    const cookie = byEmail.headers["set-cookie"].find((c) => c.startsWith("refreshToken="));
    expect(cookie).toMatch(/HttpOnly/i);

    const wrongPassword = await ctx.api().post("/api/auth/signin").send({ username: user.username, password: "nope-nope" });
    const unknownUser = await ctx.api().post("/api/auth/signin").send({ username: "ghost-user-x", password: "nope-nope" });
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownUser.body.message);
  });
});

describe("Access & refresh tokens", () => {
  it("returns 401 (not 403) for expired, forged or missing access tokens", async () => {
    const user = await createUser(ctx.api);
    const me = (token) => ctx.api().get("/api/users/me").set("Authorization", `Bearer ${token}`);

    expect((await me(user.token)).status).toBe(200);

    const expired = jwt.sign(
      { userId: user.id, exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.ACCESS_TOKEN_SECRET
    );
    expect((await me(expired)).status).toBe(401);

    const forged = jwt.sign({ userId: user.id }, "attacker-secret", { expiresIn: "15m" });
    expect((await me(forged)).status).toBe(401);

    expect((await ctx.api().get("/api/users/me")).status).toBe(401);
  });

  it("refresh: valid cookie → new token; missing / unknown / expired session → 401", async () => {
    const user = await createUser(ctx.api);

    const ok = await ctx.api().post("/api/auth/refresh").set("Cookie", user.cookie);
    expect(ok.status).toBe(200);
    const fresh = await ctx.api().get("/api/users/me").set("Authorization", `Bearer ${ok.body.accessToken}`);
    expect(fresh.status).toBe(200);

    expect((await ctx.api().post("/api/auth/refresh")).status).toBe(401);
    expect((await ctx.api().post("/api/auth/refresh").set("Cookie", "refreshToken=bogus")).status).toBe(401);

    // Session past its expiry → 401 and the stale session is cleaned up
    const raw = user.cookie.split("=")[1];
    await Session.updateOne({ refreshToken: raw }, { expiresAt: new Date(Date.now() - 1000) });
    const expired = await ctx.api().post("/api/auth/refresh").set("Cookie", user.cookie);
    expect(expired.status).toBe(401);
    expect(await Session.exists({ refreshToken: raw })).toBeNull();
  });

  it("sign out revokes the refresh session", async () => {
    const user = await createUser(ctx.api);
    const out = await ctx.api().post("/api/auth/signout").set("Cookie", user.cookie);
    expect(out.status).toBe(204);
    expect((await ctx.api().post("/api/auth/refresh").set("Cookie", user.cookie)).status).toBe(401);
  });
});

describe("OAuth account linking — pre-account takeover protection", () => {
  it("refuses to merge a verified OAuth login into an UNVERIFIED password account", async () => {
    // Attacker registers first with the victim's email (no email verification at signup)
    const attacker = await createUser(ctx.api, { email: "victim@gmail.com" });

    const res = await ctx.api()
      .post("/api/auth/oauth/google")
      .send({ idToken: firebaseToken({ uid: "google-victim", email: "victim@gmail.com", email_verified: true }) });

    expect(res.status).toBe(409);
    expect(res.headers["set-cookie"]).toBeUndefined(); // no session issued
    const stored = await User.findById(attacker.id).select("+firebaseUids");
    expect(stored.firebaseUids).toHaveLength(0);
  });

  it("links only after the owner proves the email via password reset (and old sessions are revoked)", async () => {
    const planted = await createUser(ctx.api, { email: "owner@gmail.com" });

    // Simulate the reset link the real owner receives by email
    const rawToken = crypto.randomBytes(32).toString("hex");
    await User.updateOne(
      { _id: planted.id },
      {
        passwordResetToken: crypto.createHash("sha256").update(rawToken).digest("hex"),
        passwordResetExpires: new Date(Date.now() + 60_000),
      }
    );
    const reset = await ctx.api().post("/api/auth/reset-password").send({ token: rawToken, password: "newSecret1" });
    expect(reset.status).toBe(200);

    // The planter's refresh session no longer works
    expect((await ctx.api().post("/api/auth/refresh").set("Cookie", planted.cookie)).status).toBe(401);

    const login = await ctx.api()
      .post("/api/auth/oauth/google")
      .send({ idToken: firebaseToken({ uid: "google-owner", email: "owner@gmail.com", email_verified: true }) });
    expect(login.status).toBe(200);
    expect(login.body.user._id).toBe(planted.id);

    // Same Firebase UID logs straight into the same account afterwards
    const again = await ctx.api()
      .post("/api/auth/oauth/google")
      .send({ idToken: firebaseToken({ uid: "google-owner", email: "changed@gmail.com", email_verified: true }) });
    expect(again.body.user._id).toBe(planted.id);
  });

  it("Google without a verified email → 401; GitHub with an unverified email never claims it", async () => {
    const google = await ctx.api()
      .post("/api/auth/oauth/google")
      .send({ idToken: firebaseToken({ uid: "g-unverified", email: "x@gmail.com", email_verified: false }) });
    expect(google.status).toBe(401);

    const target = await ctx.api()
      .post("/api/auth/oauth/google")
      .send({ idToken: firebaseToken({ uid: "g-real", email: "real@gmail.com", email_verified: true }) });
    expect(target.status).toBe(200);

    // A GitHub account claiming the same (unverified) email gets a placeholder identity
    const github = await ctx.api()
      .post("/api/auth/oauth/github")
      .send({ idToken: firebaseToken({ uid: "GH-Imposter", email: "real@gmail.com", email_verified: false }) });
    expect(github.status).toBe(200);
    expect(github.body.user._id).not.toBe(target.body.user._id);
    expect(github.body.user.email).toBe("gh-imposter@github.local");
  });

  it("rejects a missing ID token", async () => {
    expect((await ctx.api().post("/api/auth/oauth/google").send({})).status).toBe(400);
  });
});
