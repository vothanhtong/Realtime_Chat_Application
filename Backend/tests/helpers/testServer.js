import http from "http";
import fs from "fs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { io as ioClient } from "socket.io-client";

import { createApp } from "../../src/app.js";
import { initSocket } from "../../src/socket/index.js";

/**
 * Boots the REAL app (Express + Socket.IO) against an in-memory MongoDB on a
 * random port. Rate limiting is off so tests can create many users.
 */
export const startTestServer = async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const app = createApp({ rateLimit: false });
  const server = http.createServer(app);
  const io = initSocket(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  // Unique indexes (Conversation.directKey, Friend pair...) must exist before
  // race-condition tests — Mongoose builds them asynchronously otherwise.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));

  const sockets = new Set();

  return {
    url,
    server,
    api: () => request(server),

    /** Connected socket.io-client; resolves on "connect", rejects on connect_error */
    connectSocket(token) {
      return new Promise((resolve, reject) => {
        const socket = ioClient(url, {
          auth: { token },
          transports: ["websocket"],
          reconnection: false,
          forceNew: true,
        });
        sockets.add(socket);
        socket.once("connect", () => resolve(socket));
        socket.once("connect_error", (err) => reject(err));
      });
    },

    async close() {
      // Order matters: sockets → io/http server → (let disconnect handlers settle) → DB
      sockets.forEach((s) => s.close());
      await new Promise((resolve) => io.close(() => resolve()));
      await sleep(50);
      await mongoose.disconnect();
      await mongo.stop();
      fs.rmSync(process.env.UPLOADS_DIR, { recursive: true, force: true });
    },
  };
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolve with the next `event` payload matching `predicate`, or reject after `ms` */
export const nextEvent = (socket, event, predicate = () => true, ms = 2000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for "${event}"`));
    }, ms);
    const handler = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });

/** Emit with acknowledgement (rejects if the server never acks) */
export const emitWithAck = (socket, event, payload, ms = 5000) =>
  socket.timeout(ms).emitWithAck(event, payload);
