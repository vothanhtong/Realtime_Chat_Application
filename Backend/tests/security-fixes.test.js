import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import crypto from "crypto";
import request from "supertest";
import { io as ioClient } from "socket.io-client";
import { startTestServer } from "./helpers/testServer.js";
import { createUser, auth, makeFriends } from "./helpers/factories.js";
import { createApp } from "../src/app.js";
import User from "../src/models/User.js";

// SMTP giả: đếm số thư thay vì gửi thật
const sendMail = vi.fn(async () => ({}));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ctx;
beforeAll(async () => {
  ctx = await startTestServer();
});
afterAll(async () => {
  await ctx?.close();
});

/** Simulate the email link the owner receives, then reset the password */
const resetPassword = async (user, password = "brandNew99") => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  await User.updateOne(
    { _id: user.id },
    {
      passwordResetToken: crypto.createHash("sha256").update(rawToken).digest("hex"),
      passwordResetExpires: new Date(Date.now() + 60_000),
    }
  );
  // iat tính theo giây: đảm bảo token cũ thuộc giây TRƯỚC lần đổi mật khẩu
  await sleep(1100);
  return ctx.api().post("/api/auth/reset-password").send({ token: rawToken, password });
};

describe("Password reset revokes every live credential", () => {
  it("old access token → 401, open socket is closed and cannot reconnect; new login works", async () => {
    const user = await createUser(ctx.api);
    const socket = await ctx.connectSocket(user.token);
    const disconnected = new Promise((resolve) => socket.once("disconnect", resolve));

    const reset = await resetPassword(user);
    expect(reset.status).toBe(200);

    expect(await disconnected).toBe("io server disconnect");
    expect((await ctx.api().get("/api/users/me").set(auth(user))).status).toBe(401);
    await expect(ctx.connectSocket(user.token)).rejects.toThrow(/Unauthorized/);

    const login = await ctx.api()
      .post("/api/auth/signin")
      .send({ username: user.username, password: "brandNew99" });
    expect(login.status).toBe(200);
    const me = await ctx.api().get("/api/users/me").set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.passwordChangedAt).toBeUndefined(); // không lộ field nội bộ
    expect(me.body.user.hashedPassword).toBeUndefined();
  });
});

describe("Forgot-password anti-spam", () => {
  it("sends at most one email per address per minute (same response either way)", async () => {
    const user = await createUser(ctx.api);
    sendMail.mockClear();

    const first = await ctx.api().post("/api/auth/forgot-password").send({ email: user.email });
    const second = await ctx.api().post("/api/auth/forgot-password").send({ email: user.email });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.message).toBe(first.body.message);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("rate-limits forgot-password per IP even though it always answers 200", async () => {
    const app = createApp({ rateLimit: true });
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: `nobody${i}@test.dev` });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });
});

describe("Incognito survives connection state recovery", () => {
  it("a recovered socket does not announce 'online' for a user who turned incognito", async () => {
    const [alice, bob] = await Promise.all([createUser(ctx.api), createUser(ctx.api)]);
    await makeFriends(ctx.api, alice, bob);

    const bobSocket = await ctx.connectSocket(bob.token);
    const aliceSocket = ioClient(ctx.url, {
      auth: { token: alice.token },
      transports: ["websocket"],
      forceNew: true,
      reconnectionDelay: 50,
      reconnectionDelayMax: 50,
    });
    await new Promise((resolve, reject) => {
      aliceSocket.once("connect", resolve);
      aliceSocket.once("connect_error", reject);
    });

    try {
      // Turn incognito while connected (socket.data.user still says visible)
      const toggle = await ctx.api()
        .patch("/api/users/status-visible")
        .set(auth(alice))
        .send({ statusVisible: false });
      expect(toggle.status).toBe(200);
      await sleep(100);

      const onlineEvents = [];
      bobSocket.on("user-online", (id) => onlineEvents.push(id));

      // Drop the transport (network blip) → client reconnects with recovery
      const reconnected = new Promise((resolve) => aliceSocket.io.once("reconnect", resolve));
      aliceSocket.io.engine.close();
      await reconnected;
      await sleep(300);

      expect(aliceSocket.recovered).toBe(true);
      expect(onlineEvents).not.toContain(alice.id);
    } finally {
      aliceSocket.close();
    }
  });
});
