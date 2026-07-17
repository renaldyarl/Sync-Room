export type RoomMode = "pomodoro" | "whiteboard";

export type PomodoroPhase = "focus" | "break";

export type PomodoroStatus = "running" | "paused" | "idle";

export interface Participant {
  userId: string;
  displayName: string;
  online: boolean;
}

export interface PomodoroState {
  status: PomodoroStatus;
  remainingSeconds: number;
  phase: PomodoroPhase;
}

export interface Stroke {
  id: string;
  points: [number, number, number?][];
  color: string;
  width: number;
}

// Client -> Server

export interface RoomJoinPayload {
  roomId: string;
  displayName: string;
}

export interface RoomLeavePayload {
  roomId: string;
}

export interface PomodoroStartPayload {
  roomId: string;
  durationSeconds: number;
}

export interface PomodoroPausePayload {
  roomId: string;
}

export interface PomodoroResetPayload {
  roomId: string;
}

export interface CursorMovePayload {
  roomId: string;
  x: number;
  y: number;
}

export interface StrokeAddPayload {
  roomId: string;
  stroke: Stroke;
}

export interface ClientToServerEvents {
  "room:join": (payload: RoomJoinPayload, ack: (userId: string) => void) => void;
  "room:leave": (payload: RoomLeavePayload) => void;
  "pomodoro:start": (payload: PomodoroStartPayload) => void;
  "pomodoro:pause": (payload: PomodoroPausePayload) => void;
  "pomodoro:reset": (payload: PomodoroResetPayload) => void;
  "cursor:move": (payload: CursorMovePayload) => void;
  "stroke:add": (payload: StrokeAddPayload) => void;
}

// Server -> Client

export interface RoomStatePayload {
  participants: Participant[];
  timer: PomodoroState;
  mode: RoomMode;
}

export interface PresenceUpdatePayload {
  participants: Participant[];
}

export interface StrokeAddedPayload {
  stroke: Stroke;
}

export interface ServerToClientEvents {
  "room:state": (payload: RoomStatePayload) => void;
  "presence:update": (payload: PresenceUpdatePayload) => void;
  "pomodoro:sync": (payload: PomodoroState) => void;
  "stroke:added": (payload: StrokeAddedPayload) => void;
}
