import Dexie, { type Table } from "dexie";

export interface RoomRow {
  id: string;
  name: string;
  setting: string;
  plot_summary: string;
  worldview: string;
  tone: string;
  current_performance_summary: string | null;
  max_scenes: number;
  created_at: number;
  updated_at: number;
}

export interface SceneRow {
  id: string;
  room_id: string;
  name: string;
  description: string;
  goal: string;
  setup: string;
  summary: string;
  max_rounds: number;
  round_plan: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface CharacterRow {
  id: string;
  room_id: string;
  name: string;
  background: string;
  dialogue_style: string;
  memory: string | null;
  is_user: number;
  type: "user" | "ai";
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface PerformanceRow {
  id: string;
  scene_id: string;
  character_id: string;
  content: string;
  primary_type: "dialogue" | "action" | "thought" | "emotion";
  type: string;
  round: number;
  sort_order: number;
  created_at: number;
}

export interface SystemSettingRow {
  key: string;
  value: string;
}

export interface ProviderConfigRow {
  id: string;
  name: string;
  type: string;
  api_key: string;
  base_url: string | null;
  model: string | null;
  custom_models: string | null;
  is_active: number;
  supports_thinking: number;
  thinking_param_key: string | null;
  thinking_param_type: string | null;
  thinking_param_default: string | null;
}

export interface ScenePerformanceSettingRow {
  scene_id: string;
  provider_id: string;
  model: string;
}

class AICinamaDexie extends Dexie {
  rooms!: Table<RoomRow, string>;
  scenes!: Table<SceneRow, string>;
  characters!: Table<CharacterRow, string>;
  performances!: Table<PerformanceRow, string>;
  system_settings!: Table<SystemSettingRow, string>;
  provider_configs!: Table<ProviderConfigRow, string>;
  scene_performance_settings!: Table<ScenePerformanceSettingRow, string>;

  constructor() {
    super("ai-cinama-dexie");

    this.version(1).stores({
      rooms: "&id, updated_at, created_at",
      scenes: "&id, room_id, sort_order, updated_at, created_at",
      characters: "&id, room_id, sort_order, is_user, type, updated_at",
      performances: "&id, scene_id, character_id, round, sort_order, created_at",
      system_settings: "&key",
      provider_configs: "&id, is_active, type, name",
      scene_performance_settings: "&scene_id, provider_id",
    });
  }
}

export const dexieDB = new AICinamaDexie();
