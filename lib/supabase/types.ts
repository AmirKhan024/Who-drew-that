import type { GameSettings } from "@/lib/game/settings";

export type RoomStatus = "lobby" | "in_game" | "ended";

export type GamePhase =
  | "lobby"
  | "word"
  | "drawing"
  | "discussion"
  | "voting"
  | "reveal"
  | "scoreboard"
  | "starting"
  | "ended";

export interface RevealPayload {
  roundNumber: number;
  crewWord: string;
  imposterWord: string;
  imposterIds: string[];
  accusedId: string | null;
  counts: Record<string, number>;
  deltas: Record<string, number>;
  crewCaught: boolean;
}

export interface RoomRow {
  code: string;
  host_id: string;
  settings: GameSettings;
  status: RoomStatus;
  created_at: string;
  // game-loop columns
  phase: GamePhase;
  current_round: number;
  total_rounds: number;
  turn_order: string[];
  turn_index: number;
  phase_ends_at: string | null;
  reveal: RevealPayload | null;
}

export interface StrokeRow {
  id: string;
  room_code: string;
  round_number: number;
  player_id: string;
  seq: number;
  color: string;
  points: { x: number; y: number }[];
  created_at: string;
}

export interface PlayerRow {
  id: string;
  room_code: string;
  name: string;
  avatar_seed: string;
  is_ready: boolean;
  is_host: boolean;
  score: number;
  joined_at: string;
}

// Minimal shape passed to supabase-js generics.
export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: RoomRow;
        Insert: Omit<RoomRow, "created_at"> & { created_at?: string };
        Update: Partial<RoomRow>;
      };
      players: {
        Row: PlayerRow;
        Insert: Omit<PlayerRow, "joined_at" | "score"> & {
          joined_at?: string;
          score?: number;
        };
        Update: Partial<PlayerRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
