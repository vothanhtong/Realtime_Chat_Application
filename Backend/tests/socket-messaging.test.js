import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { startTestServer, nextEvent, emitWithAck, sleep } from "./helpers/testServer.js";
import { createUser, makeFriends, auth } from "./helpers/factories.js";
import Message from "../src/models/Message.js";
import Conversation from "../src/models/Conversation.js";

let ctx;
let alice, bob, carol, dave; // alice↔bob, alice↔dave, bob↔dave friends; carol is a stranger
let sAlice, sBob;

beforeAll(async () => {
  ctx = await startTestServer();
  [alice, bob, carol, dave] = await Promise.all(
    ["alice", "bob", "carol", "dave"].map((n) => createUser(ctx.api, { firstName: n }))
  );
  await makeFriends(ctx.api, alice, bob);
  await makeFriends(ctx.api, alice, dave);
  await makeFriends(ctx.api, bob, dave);
  [sAlice, sBob] = await Promise.all([ctx.connectSocket(alice.token), ctx.connectSocket(bob.token)]);
});
afterAll(async () => {
  await ctx?.close();
});

const messageCount = () => Message.countDocuments();

describe("Socket authentication", () => {
  it("rejects sockets without a valid token", async () => {
    await expect(ctx.connectSocket("not-a-jwt")).rejects.toThrow(/Unauthorized/);
  });
});

describe("send-message authorization & validation", () => {
  it("blocks direct messages to a non-friend (nothing is stored)", async () => {
    const before = await messageCount();
    const ack = await emitWithAck(sAlice, "send-message", {
      type: "direct",
      recipientId: carol.id,
      content: "hi stranger",
    });
    expect(ack.success).toBe(false);
    expect(ack.error).toMatch(/kết bạn/);
    expect(await messageCount()).toBe(before);
    expect(await Conversation.countDocuments({ "participants.userId": carol.id })).toBe(0);
  });

  it.each([
    ["whitespace only", { content: "   " }],
    ["no content and no image", {}],
    ["content as an object (operator injection)", { content: { $ne: "" } }],
    ["content over 5000 chars", { content: "a".repeat(5001) }],
    ["image from a foreign domain", { content: "", imgUrl: "https://evil.example/pixel.gif" }],
  ])("rejects %s", async (_label, body) => {
    const before = await messageCount();
    const ack = await emitWithAck(sAlice, "send-message", { type: "direct", recipientId: bob.id, ...body });
    expect(ack.success).toBe(false);
    expect(await messageCount()).toBe(before);
  });

  it("accepts an image-only message from our own storage", async () => {
    const ack = await emitWithAck(sAlice, "send-message", {
      type: "direct",
      recipientId: bob.id,
      content: "",
      imgUrl: "/uploads/chat/msg_test.webp",
    });
    expect(ack.success).toBe(true);
    expect(ack.message.imgUrl).toBe("/uploads/chat/msg_test.webp");
  });

  it("rejects non-object payloads without crashing the connection", async () => {
    const ack = await emitWithAck(sAlice, "send-message", "garbage");
    expect(ack.success).toBe(false);
    expect(sAlice.connected).toBe(true);
  });
});

describe("delivery & unreadCounts", () => {
  it("delivers to the recipient and counts unread for them only", async () => {
    const received = nextEvent(sBob, "new-message", (p) => p.message.content === "hello bob");
    const ack = await emitWithAck(sAlice, "send-message", {
      type: "direct",
      recipientId: bob.id,
      content: "hello bob",
    });
    expect(ack.success).toBe(true);

    const payload = await received;
    expect(payload.message.senderId).toBe(alice.id);
    expect(payload.conversation.lastMessage.sender.displayName).toMatch(/alice/i);

    const convo = await Conversation.findById(payload.message.conversationId);
    expect(convo.unreadCounts.get(bob.id)).toBeGreaterThanOrEqual(1);
    expect(convo.unreadCounts.get(alice.id)).toBe(0); // sender never accrues unread
    expect(payload.unreadCounts[alice.id]).toBe(0);
  });

  it("markAsSeen resets the reader's unread count and notifies the room", async () => {
    const convo = await Conversation.findOne({ type: "direct", "participants.userId": { $all: [alice.id, bob.id] } });
    const read = nextEvent(sAlice, "read-message", (p) => p.conversationId === convo._id.toString());
    const res = await ctx.api().patch(`/api/conversations/${convo._id}/seen`).set(auth(bob));
    expect(res.status).toBe(200);
    expect(res.body.myUnreadCount).toBe(0);
    await read;
    expect((await Conversation.findById(convo._id)).unreadCounts.get(bob.id)).toBe(0);
  });

  it("keeps unreadCounts exact under concurrent sends (atomic $inc)", async () => {
    const group = await ctx.api()
      .post("/api/conversations")
      .set(auth(alice))
      .send({ type: "group", name: "Race", memberIds: [bob.id, dave.id] });
    expect(group.status).toBe(201);
    const groupId = group.body.conversation._id;

    const sDave = await ctx.connectSocket(dave.token);
    await sleep(150); // rooms are joined asynchronously after connect

    const N = 10;
    const acks = await Promise.all([
      ...Array.from({ length: N }, (_, i) =>
        emitWithAck(sBob, "send-message", { type: "group", conversationId: groupId, content: `b${i}` })
      ),
      ...Array.from({ length: N }, (_, i) =>
        emitWithAck(sDave, "send-message", { type: "group", conversationId: groupId, content: `d${i}` })
      ),
    ]);
    expect(acks.every((a) => a.success)).toBe(true);

    const convo = await Conversation.findById(groupId);
    expect(convo.unreadCounts.get(alice.id)).toBe(2 * N); // received every message
    // bob/dave: unread = messages from the OTHER sender after their own last send
    expect(convo.unreadCounts.get(bob.id)).toBeLessThanOrEqual(N);
    expect(convo.unreadCounts.get(dave.id)).toBeLessThanOrEqual(N);
    expect(await Message.countDocuments({ conversationId: new mongoose.Types.ObjectId(groupId) })).toBe(2 * N);
  });

  it("a non-member cannot post into a group", async () => {
    const group = await Conversation.findOne({ type: "group", "group.name": "Race" });
    const sCarol = await ctx.connectSocket(carol.token);
    const ack = await emitWithAck(sCarol, "send-message", {
      type: "group",
      conversationId: group._id.toString(),
      content: "let me in",
    });
    expect(ack.success).toBe(false);
  });
});
