import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "shared-types";
import { buildRedisAdapter } from "./redis-adapter.js";
import { registerPresenceHandlers } from "./rooms/presence.handler.js";
import { registerPomodoroHandlers } from "./rooms/pomodoro.handler.js";

const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CORS_ORIGIN },
});

async function main() {
  io.adapter(await buildRedisAdapter());

  io.on("connection", (socket) => {
    registerPresenceHandlers(io, socket);
    registerPomodoroHandlers(io, socket);
  });

  httpServer.listen(PORT, () => {
    console.log(`realtime-server listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error("failed to start realtime-server", err);
  process.exit(1);
});
