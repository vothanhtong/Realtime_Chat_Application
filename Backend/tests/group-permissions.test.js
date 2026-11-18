import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startTestServer, nextEvent, sleep } from "./helpers/testServer.js";
import { createUser, makeFriends, auth } from "./helpers/factories.js";
import Conversation from "../src/models/Conversation.js";
import Message from "../src/models/Message.js";

let ctx;
let owner, member, member2, outsider;
let groupId;

beforeAll(async () => {
  ctx = await startTestServer();
  [owner, member, member2, outsider] = await Promise.all(
    ["owner", "member", "member2", "outsider"].map((n) => createUser(ctx.api, { firstName: n }))
  );
  await makeFriends(ctx.api, owner, member);
  await makeFriends(ctx.api, owner, member2);
});
afterAll(async () => {
  await ctx?.close();
});

beforeEach(async () => {
  const res = await ctx.api()
    .post("/api/conversations")
    .set(auth(owner))
    .send({ type: "group", name: "Team", memberIds: [member.id, member2.id] });
  expect(res.status).toBe(201);
  groupId = res.body.conversation._id;
  expect(res.body.conversation.group.createdBy).toBe(owner.id);

  await ctx.api().post("/api/messages/group").set(auth(member)).send({ conversationId: groupId, content: "hi team" });
});

describe("Deleting a group", () => {
  it("a regular member gets 403 and nothing is deleted", async () => {
    const res = await ctx.api().delete(`/api/conversations/${groupId}`).set(auth(member));
    expect(res.status).toBe(403);
    expect(await Conversation.exists({ _id: groupId })).not.toBeNull();
    expect(await Message.countDocuments({ conversationId: groupId })).toBe(1);
  });

  it("a non-member gets 403", async () => {
    const res = await ctx.api().delete(`/api/conversations/${groupId}`).set(auth(outsider));
    expect(res.status).toBe(403);
    expect(await Conversation.exists({ _id: groupId })).not.toBeNull();
  });

  it("only createdBy can delete — conversation and its messages are removed, members are notified", async () => {
    const sMember = await ctx.connectSocket(member.token);
    await sleep(150); // rooms joined asynchronously after connect
    const notified = nextEvent(sMember, "conversation-deleted", (p) => p.conversationId === groupId);

    const res = await ctx.api().delete(`/api/conversations/${groupId}`).set(auth(owner));
    expect(res.status).toBe(200);
    expect(await Conversation.exists({ _id: groupId })).toBeNull();
    expect(await Message.countDocuments({ conversationId: groupId })).toBe(0);
    await notified;
  });

  it("legacy groups without createdBy cannot be deleted by anyone (safe default)", async () => {
    await Conversation.updateOne({ _id: groupId }, { $unset: { "group.createdBy": "" } });
    const res = await ctx.api().delete(`/api/conversations/${groupId}`).set(auth(owner));
    expect(res.status).toBe(403);
  });

  it("rejects a malformed id with 400", async () => {
    const res = await ctx.api().delete("/api/conversations/not-an-id").set(auth(owner));
    expect(res.status).toBe(400);
  });
});

describe("Direct conversations", () => {
  it("either participant may delete a 1-1 conversation", async () => {
    const dm = await ctx.api()
      .post("/api/messages/direct")
      .set(auth(owner))
      .send({ recipientId: member.id, content: "psst" });
    expect(dm.status).toBe(201);
    const res = await ctx.api().delete(`/api/conversations/${dm.body.message.conversationId}`).set(auth(member));
    expect(res.status).toBe(200);
  });
});

describe("Creating groups", () => {
  it("rejects members who are not the creator's friends", async () => {
    const res = await ctx.api()
      .post("/api/conversations")
      .set(auth(owner))
      .send({ type: "group", name: "X", memberIds: [member.id, outsider.id] });
    expect(res.status).toBe(403);
  });

  it("de-duplicates memberIds and requires ≥2 other members", async () => {
    const res = await ctx.api()
      .post("/api/conversations")
      .set(auth(owner))
      .send({ type: "group", name: "Dup", memberIds: [member.id, member.id, owner.id] });
    expect(res.status).toBe(400);
  });
});
