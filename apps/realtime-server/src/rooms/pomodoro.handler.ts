import { roomManager } from "./room.manager.js";
import type { AppServer, AppSocket } from "../types/socket.js";
import type { PomodoroPhase } from "shared-types";

interface RoomTimerRuntime {
  timeout: NodeJS.Timeout;
  startedAt: number;
  durationSeconds: number;
}

const runtimes = new Map<string, RoomTimerRuntime>();

export function registerPomodoroHandlers(io: AppServer, socket: AppSocket) {
  socket.on("pomodoro:start", ({ roomId, durationSeconds }) => {
    const phase = roomManager.getTimer(roomId).phase;
    const timer = { status: "running" as const, remainingSeconds: durationSeconds, phase };
    roomManager.setTimer(roomId, timer);
    scheduleCompletion(io, roomId, durationSeconds);
    io.to(roomId).emit("pomodoro:sync", timer);
  });

  socket.on("pomodoro:pause", ({ roomId }) => {
    const remainingSeconds = clearRoomTimeout(roomId);
    const current = roomManager.getTimer(roomId);
    const timer = { status: "paused" as const, remainingSeconds, phase: current.phase };
    roomManager.setTimer(roomId, timer);
    io.to(roomId).emit("pomodoro:sync", timer);
  });

  socket.on("pomodoro:reset", ({ roomId }) => {
    clearRoomTimeout(roomId);
    const timer = { status: "idle" as const, remainingSeconds: 0, phase: "focus" as PomodoroPhase };
    roomManager.setTimer(roomId, timer);
    io.to(roomId).emit("pomodoro:sync", timer);
  });
}

function scheduleCompletion(io: AppServer, roomId: string, durationSeconds: number) {
  clearRoomTimeout(roomId);
  const timeout = setTimeout(() => {
    runtimes.delete(roomId);
    const current = roomManager.getTimer(roomId);
    const nextPhase: PomodoroPhase = current.phase === "focus" ? "break" : "focus";
    const timer = { status: "idle" as const, remainingSeconds: 0, phase: nextPhase };
    roomManager.setTimer(roomId, timer);
    io.to(roomId).emit("pomodoro:sync", timer);
  }, durationSeconds * 1000);

  runtimes.set(roomId, { timeout, startedAt: Date.now(), durationSeconds });
}

function clearRoomTimeout(roomId: string): number {
  const runtime = runtimes.get(roomId);
  if (!runtime) {
    return roomManager.getTimer(roomId).remainingSeconds;
  }

  clearTimeout(runtime.timeout);
  runtimes.delete(roomId);

  const elapsedSeconds = (Date.now() - runtime.startedAt) / 1000;
  return Math.max(0, Math.round(runtime.durationSeconds - elapsedSeconds));
}
