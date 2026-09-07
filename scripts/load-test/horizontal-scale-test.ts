import "./load-env.js";
import http from "http";
import express from "express";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { io as ClientIo, type Socket } from "socket.io-client";
import { createRedisClient } from "../../api/src/db/redis.js";
import { setupChatSocket, emitToUser } from "../../api/src/services/ai/chatSocket.js";
import { setupTestUsers, closeTestDb } from "./test-users.js";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/lifeos";

async function createInstance(port: number) {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*" },
    transports: ["websocket", "polling"],
    pingInterval: 10000,
    pingTimeout: 5000
  });

  const pubClient = createRedisClient();
  const subClient = createRedisClient();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  setupChatSocket(io);

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      resolve();
    });
  });

  return {
    port,
    server,
    io,
    pubClient,
    subClient,
    close: async () => {
      io.close();
      server.close();
      await pubClient.quit();
      await subClient.quit();
    }
  };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runHorizontalScalingTest() {
  console.log("============================================================");
  console.log("HORIZONTAL SCALING & REDIS PUB/SUB ADAPTER VERIFICATION TEST");
  console.log("============================================================\n");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // 1. Setup 2 test users
  console.log("[1/5] Setting up test users...");
  const users = await setupTestUsers(5);
  const userA = users[0];
  const userB = users[1];

  // 2. Launch 2 independent API server instances with Redis adapter
  const PORT_1 = 4011;
  const PORT_2 = 4012;
  console.log(`[2/5] Starting 2 independent API server instances on ports ${PORT_1} and ${PORT_2}...`);
  const instance1 = await createInstance(PORT_1);
  const instance2 = await createInstance(PORT_2);
  console.log(`Instance 1 listening on :${PORT_1} (with Redis adapter)`);
  console.log(`Instance 2 listening on :${PORT_2} (with Redis adapter)`);

  // 3. Connect Client A to Instance 1, Client B to Instance 2
  console.log(`[3/5] Connecting Client A to Instance 1 (:4011) and Client B to Instance 2 (:4012)...`);
  const clientA: Socket = ClientIo(`http://localhost:${PORT_1}`, {
    transports: ["websocket"],
    forceNew: true,
    auth: { token: userA.token }
  });

  const clientB: Socket = ClientIo(`http://localhost:${PORT_2}`, {
    transports: ["websocket"],
    forceNew: true,
    auth: { token: userB.token }
  });

  await Promise.all([
    new Promise<void>((resolve) => clientA.on("connect", () => resolve())),
    new Promise<void>((resolve) => clientB.on("connect", () => resolve()))
  ]);

  console.log(`--> Client A connected to Instance 1. Socket ID: ${clientA.id}`);
  console.log(`--> Client B connected to Instance 2. Socket ID: ${clientB.id}`);

  // 4. Test cross-instance routing via Redis Pub/Sub:
  // Instance 1 emits an event targeting userB (`user_${userB.userId}`).
  // Since userB is connected to Instance 2, Redis adapter must forward the message to Instance 2!
  console.log(`[4/5] Testing cross-instance fan-out via Redis pub/sub...`);
  
  const testPayload = {
    notificationId: "cross-instance-msg-123",
    text: "Hello across instances via Redis!",
    timestamp: Date.now()
  };

  const receivePromise = new Promise<{ received: boolean; latencyMs: number; data: any }>((resolve) => {
    const sendTime = Date.now();
    clientB.on("test_cross_instance_event", (data: any) => {
      const latencyMs = Date.now() - sendTime;
      resolve({ received: true, latencyMs, data });
    });
  });

  // Emit on instance1 to userB's room
  emitToUser(instance1.io, userB.userId, "test_cross_instance_event", testPayload);

  // Wait for delivery on Client B (max 5s timeout)
  const timeoutPromise = new Promise<{ received: boolean; latencyMs: number; data: any }>((resolve) =>
    setTimeout(() => resolve({ received: false, latencyMs: -1, data: null }), 5000)
  );

  const result = await Promise.race([receivePromise, timeoutPromise]);

  if (result.received) {
    console.log(`\nSUCCESS: Client B on Instance 2 received message emitted from Instance 1!`);
    console.log(`Cross-instance propagation latency: ${result.latencyMs} ms`);
    console.log(`Payload verified: ${result.data?.text === testPayload.text}`);
  } else {
    console.error(`\nFAILURE: Message emitted from Instance 1 did NOT reach Client B on Instance 2!`);
  }

  // 5. Test instance isolation and failover resilience
  console.log(`\n[5/5] Testing instance isolation resilience...`);
  console.log(`Stopping Instance 1 (:4011)...`);
  await instance1.close();
  clientA.disconnect();

  // Verify Client B on Instance 2 remains fully active and connected
  await sleep(1000);
  console.log(`Client B on Instance 2 connection state: connected=${clientB.connected}`);

  clientB.disconnect();
  await instance2.close();
  await closeTestDb();

  console.log("\n============================================================");
  console.log(`HORIZONTAL SCALING TEST RESULT: ${result.received && clientB.connected ? "PASS" : "FAIL"}`);
  console.log("============================================================\n");

  return {
    crossInstanceDelivery: result.received,
    latencyMs: result.latencyMs,
    instanceResilience: clientB.connected
  };
}

runHorizontalScalingTest().catch((err) => {
  console.error("Horizontal scaling test error:", err);
  process.exit(1);
});
