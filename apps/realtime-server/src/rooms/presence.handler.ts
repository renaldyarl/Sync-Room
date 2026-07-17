import { nanoid } from "nanoid";
import { roomManager } from "./room.manager.js";
import type { AppServer, AppSocket } from "../types/socket.js";

export function registerPresenceHandlers(io: AppServer, socket: AppSocket) {
  socket.on("room:join", ({ roomId, displayName }, ack) => {
    const userId = nanoid(10);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    socket.join(roomId);
    roomManager.addParticipant(roomId, { userId, displayName, online: true });

    ack(userId);

    socket.emit("room:state", {
      participants: roomManager.getParticipants(roomId),
      timer: roomManager.getTimer(roomId),
      mode: "pomodoro",
    });

    io.to(roomId).emit("presence:update", {
      participants: roomManager.getParticipants(roomId),
    });
  });

  socket.on("room:leave", ({ roomId }) => {
    leaveRoom(io, socket, roomId);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId as string | undefined;
    if (roomId) {
      leaveRoom(io, socket, roomId);
    }
  });
}

function leaveRoom(io: AppServer, socket: AppSocket, roomId: string) {
  const userId = socket.data.userId as string | undefined;
  if (!userId) return;

  roomManager.removeParticipant(roomId, userId);
  socket.leave(roomId);

  io.to(roomId).emit("presence:update", {
    participants: roomManager.getParticipants(roomId),
  });
}
