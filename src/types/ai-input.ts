/**
 * AIInputConfig 相关类型定义
 */

export type AIInputMode = "room" | "character" | "scene" | "custom";

export interface RoomContext {
  name?: string;
  setting?: string;
  plot_summary?: string;
  worldview?: string;
  max_scenes?: number;
}

export interface CharacterContext {
  name: string;
  background: string;
  dialogue_style: string;
}

export interface SceneContext {
  name: string;
  description: string;
  goal: string;
}

export interface AIInputConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (result: {
    content: string;
    providerId: string;
    model: string;
    thinkingEnabled: boolean;
  }) => void;
  providers: import("@stores").ProviderConfig[];
  activeProviderId?: string | null;
  presetPrompt?: string;
  presetKeywords?: string;
  mode?: AIInputMode;
  roomContext?: RoomContext;
  characters?: CharacterContext[];
  scenes?: SceneContext[];
  isLoading?: boolean;
}

export interface AIStreamChunkHandler {
  (content: string, thinking: string): void;
}

export interface AIGenerateOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  thinking?: any;
  reasoning_effort?: string;
}
