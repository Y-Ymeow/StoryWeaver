import type { ProviderConfig } from "@stores/types";

/**
 * CreateRoomWizard 组件 Props
 */
export interface CreateRoomWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoomData) => Promise<void>;
  isLoading: boolean;
  providers?: ProviderConfig[];
  activeProviderId?: string | null;
  editingMode?: boolean;
  initialData?: Partial<CreateRoomData>;
}

/**
 * 创建房间的数据
 */
export interface CreateRoomData {
  room: {
    name: string;
    setting: string;
    plot_summary: string;
    worldview: string;
    tone: string;
    current_performance_summary?: string;
  };
  characters: CharacterFormData[];
  scenes: SceneFormData[];
}

/**
 * 创建房间时的角色表单数据
 */
export interface CharacterFormData {
  name: string;
  background: string;
  dialogue_style: string;
  is_user: boolean;
  type: "user" | "ai";
}

/**
 * 创建房间时的场景表单数据
 */
export interface SceneFormData {
  name: string;
  description: string;
  goal: string;
  setup: string;
  max_rounds: number;
}

/**
 * AIGenerate 组件 Props
 */
export interface AIGenerateProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (result: AIGenerateResult) => void;
  providers: ProviderConfig[];
  activeProviderId?: string | null;
  mode?: "room" | "character" | "scene" | "custom";
  roomContext?: {
    name?: string;
    setting?: string;
    plot_summary?: string;
    worldview?: string;
  };
  characters?: Array<{ name: string; background: string; dialogue_style: string }>;
  scenes?: Array<{ name: string; description: string; goal: string }>;
}

/**
 * AI 生成结果
 */
export interface AIGenerateResult {
  name?: string;
  setting?: string;
  plot_summary?: string;
  worldview?: string;
  tone?: string;
  characters?: Array<{ name: string; background: string; dialogue_style: string; is_user: boolean }>;
  scenes?: Array<{ name: string; description: string; goal: string; setup: string; max_rounds: number }>;
  content?: string;
}

/**
 * AIModelSettings 组件 Props
 */
export interface AIModelSettingsProps {
  onClose: () => void;
  providers: ProviderConfig[];
  activeProviderId?: string | null;
  onAddProvider: (config: Omit<ProviderConfig, "id">) => void;
  onUpdateProvider: (id: string, updates: Partial<ProviderConfig>) => void;
  onDeleteProvider: (id: string) => void;
  onSetActive: (id: string) => void;
  onFetchModels: (providerId: string) => Promise<string[]>;
}

/**
 * Settings 组件 Props
 */
export interface SettingsProps {
  onClose: () => void;
}
