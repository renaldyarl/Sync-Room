import type { Participant, PomodoroState } from "shared-types";

interface RoomState {
  participants: Map<string, Participant>;
  timer: PomodoroState;
}

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      participants: new Map(),
      timer: { status: "idle", remainingSeconds: 0, phase: "focus" },
    };
    rooms.set(roomId, room);
  }
  return room;
}

export const roomManager = {
  addParticipant(roomId: string, participant: Participant) {
    const room = getOrCreateRoom(roomId);
    room.participants.set(participant.userId, participant);
  },

  removeParticipant(roomId: string, userId: string) {
    const room = rooms.get(roomId);
    room?.participants.delete(userId);
  },

  getParticipants(roomId: string): Participant[] {
    return Array.from(rooms.get(roomId)?.participants.values() ?? []);
  },

  getTimer(roomId: string): PomodoroState {
    return getOrCreateRoom(roomId).timer;
  },

  setTimer(roomId: string, timer: PomodoroState) {
    getOrCreateRoom(roomId).timer = timer;
  },

  isEmpty(roomId: string): boolean {
    return (rooms.get(roomId)?.participants.size ?? 0) === 0;
  },
};
