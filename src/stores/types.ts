// 房间类型
export interface Room {
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

// 场景类型
export interface Scene {
  id: string;
  room_id: string;
  name: string;
  description: string;
  goal: string;
  setup: string;
  summary: string;
  max_rounds: number;
  round_plan?: any; // 轮次计划 JSON
  order: number;
  created_at: number;
  updated_at: number;
}

// 角色类型
export interface Character {
  id: string;
  room_id: string;
  name: string;
  background: string;
  dialogue_style: string;
  memory: string | null;
  is_user: boolean;
  type: "user" | "ai";
  order: number;
  created_at: number;
  updated_at: number;
}

// 演出记录类型
export interface Performance {
  id: string;
  scene_id: string;
  character_id: string;
  // JSON 格式存储多种类型的内容：{ dialogue?: string, action?: string, thought?: string, emotion?: string }
  content: string;
  // 主要类型（用于兼容查询）
  primary_type: "dialogue" | "action" | "thought" | "emotion";
  // 兼容旧代码的 type 字段（已废弃，使用 primary_type）
  type?: "dialogue" | "action" | "thought" | "emotion" | "behavior";
  round: number;
  order: number;
  created_at: number;
}

// 系统设置类型
export interface SystemSetting {
  key: string;
  value: string;
}

// AI Provider 配置
export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  api_key: string;
  base_url?: string;
  model?: string;
  is_active: boolean;
  custom_models?: string[];
  // 是否支持思考模式
  supports_thinking?: boolean;
  // 思考参数配置
  thinking_param_key?: string;
  thinking_param_type?: "boolean" | "object";
  thinking_param_default?: any;
  thinking_param_disabled?: any; // 禁用思考时的参数值
  reasoning_effort?: "low" | "medium" | "high"; // OpenAI reasoning_effort
}

// Provider 类型
export type ProviderType =
  | "openai"
  | "gemini"
  | "deepseek"
  | "zhipu"
  | "groq"
  | "cerebras"
  | "mistral"
  | "custom";

// 全局状态
export interface AppState {
  currentRoom: Room | null;
  currentScene: Scene | null;
  currentCharacter: Character | null;
  rooms: Room[];
  scenes: Scene[];
  characters: Character[];
  performances: Performance[];
  settings: Record<string, string>;
  providerConfig: ProviderConfig | null;
  ui: {
    isLoading: boolean;
    error: string | null;
    sidebarOpen: boolean;
    modalOpen: boolean;
  };
}

export type Action =
  | { type: "SET_CURRENT_ROOM"; payload: Room | null }
  | { type: "SET_CURRENT_SCENE"; payload: Scene | null }
  | { type: "SET_CURRENT_CHARACTER"; payload: Character | null }
  | { type: "SET_ROOMS"; payload: Room[] }
  | { type: "SET_SCENES"; payload: Scene[] }
  | { type: "SET_CHARACTERS"; payload: Character[] }
  | { type: "SET_PERFORMANCES"; payload: Performance[] }
  | { type: "ADD_PERFORMANCE"; payload: Performance }
  | { type: "SET_SETTINGS"; payload: Record<string, string> }
  | { type: "SET_PROVIDER_CONFIG"; payload: ProviderConfig | null }
  | { type: "SET_UI_STATE"; payload: Partial<AppState["ui"]> }
  | { type: "RESET_STATE" };

export interface Store {
  state: AppState;
  dispatch: (action: Action) => void;
}

export const initialState: AppState = {
  currentRoom: null,
  currentScene: null,
  currentCharacter: null,
  rooms: [],
  scenes: [],
  characters: [],
  performances: [],
  settings: {},
  providerConfig: null,
  ui: { isLoading: false, error: null, sidebarOpen: false, modalOpen: false },
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_CURRENT_ROOM":
      return { ...state, currentRoom: action.payload };
    case "SET_CURRENT_SCENE":
      return { ...state, currentScene: action.payload };
    case "SET_CURRENT_CHARACTER":
      return { ...state, currentCharacter: action.payload };
    case "SET_ROOMS":
      return { ...state, rooms: action.payload };
    case "SET_SCENES":
      return { ...state, scenes: action.payload };
    case "SET_CHARACTERS":
      return { ...state, characters: action.payload };
    case "SET_PERFORMANCES":
      return { ...state, performances: action.payload };
    case "ADD_PERFORMANCE":
      return {
        ...state,
        performances: [...state.performances, action.payload],
      };
    case "SET_SETTINGS":
      return { ...state, settings: action.payload };
    case "SET_PROVIDER_CONFIG":
      return { ...state, providerConfig: action.payload };
    case "SET_UI_STATE":
      return { ...state, ui: { ...state.ui, ...action.payload } };
    case "RESET_STATE":
      return initialState;
    default:
      return state;
  }
}

// 预定义 Provider 配置
export interface ProviderPreset {
  type: ProviderType;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  models?: string[];
  supportsThinking?: boolean;
  thinkingParamKey?: string;
  thinkingParamType?: "boolean" | "object";
  thinkingParamDefault?: any;
  thinkingParamDisabled?: any; // 禁用思考时的参数值
  reasoningEffort?: "low" | "medium" | "high"; // OpenAI reasoning_effort 参数
}
