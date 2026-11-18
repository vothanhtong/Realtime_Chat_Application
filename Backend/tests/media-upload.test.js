import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { startTestServer } from "./helpers/testServer.js";
import { createUser, auth } from "./helpers/factories.js";
import User from "../src/models/User.js";

let ctx;
let user;

const png = (width, height) =>
  sharp({ create: { width, height, channels: 3, background: { r: 30, g: 144, b: 255 } } }).png().toBuffer();

/** Local storage id "local:avatars/x.webp" or URL "/uploads/chat/x.webp" → file on disk */
const diskPath = (relative) =>
  path.join(process.env.UPLOADS_DIR, relative.replace(/^local:/, "").replace(/^\/uploads\//, ""));

beforeAll(async () => {
  ctx = await startTestServer();
  user = await createUser(ctx.api);
});
afterAll(async () => {
  await ctx?.close();
});

describe("Magic-byte validation", () => {
  it("rejects a non-image disguised with an image mimetype and extension", async () => {
    const res = await ctx.api()
      .post("/api/users/uploadImage")
      .set(auth(user))
      .attach("file", Buffer.from("<script>alert(1)</script> definitely not a png"), {
        filename: "evil.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(400);
  });

  it("rejects a real image in a disallowed format (SVG) even if labelled image/png", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    const res = await ctx.api()
      .post("/api/users/uploadAvatar")
      .set(auth(user))
      .attach("file", svg, { filename: "a.png", contentType: "image/png" });
    expect(res.status).toBe(400);
  });
});

describe("Chat image pipeline", () => {
  it("keeps the aspect ratio and caps the width at 1280px", async () => {
    const res = await ctx.api()
      .post("/api/users/uploadImage")
      .set(auth(user))
      .attach("file", await png(3000, 2000), { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(200);
    expect(res.body.width).toBe(1280);
    expect(res.body.height).toBe(853);

    const meta = await sharp(diskPath(res.body.url)).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1280);
    expect(meta.height).toBe(853);
  });

  it("never upscales small images", async () => {
    const res = await ctx.api()
      .post("/api/users/uploadImage")
      .set(auth(user))
      .attach("file", await png(400, 300), { filename: "small.png", contentType: "image/png" });
    expect(res.status).toBe(200);
    expect([res.body.width, res.body.height]).toEqual([400, 300]);
  });
});

describe("Avatar pipeline", () => {
  it("crops to 200x200, versions the id, and deletes the previous avatar only after success", async () => {
    const first = await ctx.api()
      .post("/api/users/uploadAvatar")
      .set(auth(user))
      .attach("file", await png(800, 500), { filename: "a.png", contentType: "image/png" });
    expect(first.status).toBe(200);
    const firstId = (await User.findById(user.id)).avatarId;
    expect(firstId).toMatch(new RegExp(`^local:avatars/user_${user.id}_\\d+\\.webp$`));
    expect(fs.existsSync(diskPath(firstId))).toBe(true);

    const meta = await sharp(diskPath(firstId)).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([200, 200, "webp"]);

    await new Promise((r) => setTimeout(r, 5)); // distinct timestamp
    const second = await ctx.api()
      .post("/api/users/uploadAvatar")
      .set(auth(user))
      .attach("file", await png(300, 300), { filename: "b.png", contentType: "image/png" });
    expect(second.status).toBe(200);
    const secondId = (await User.findById(user.id)).avatarId;

    expect(secondId).not.toBe(firstId); // new asset, no overwrite race
    expect(fs.existsSync(diskPath(secondId))).toBe(true);
    expect(fs.existsSync(diskPath(firstId))).toBe(false); // old one cleaned up
    expect(second.body.user.avatarUrl).toBe(`/uploads/${secondId.replace(/^local:/, "")}`);
  });
});

describe("Size limits (kept in sync with frontend/src/config/upload.ts)", () => {
  it("avatar over 2MB → 413", async () => {
    const res = await ctx.api()
      .post("/api/users/uploadAvatar")
      .set(auth(user))
      .attach("file", Buffer.alloc(2 * 1024 * 1024 + 1, 1), { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/2MB/);
  });

  it("chat image over 5MB → 413", async () => {
    const res = await ctx.api()
      .post("/api/users/uploadImage")
      .set(auth(user))
      .attach("file", Buffer.alloc(5 * 1024 * 1024 + 1, 1), { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(413);
  });

  it("JSON bodies over 1mb → 413", async () => {
    const res = await ctx.api()
      .patch("/api/users/profile")
      .set(auth(user))
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ bio: "x".repeat(1024 * 1024 + 10) }));
    expect(res.status).toBe(413);
  });
});
