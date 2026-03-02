/**
 * AIGenerate 相关类型定义
 */

export type AIGenerateMode = "room" | "character" | "scene" | "custom";

export interface AIGenerateProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (result: AIGenerateResult) => void;
  providers: import("@stores").ProviderConfig[];
  activeProviderId?: string | null;
  mode?: AIGenerateMode;
  roomContext?: {
    name?: string;
    setting?: string;
    plot_summary?: string;
    worldview?: string;
  };
  characters?: Array<{
    name: string;
    background: string;
    dialogue_style: string;
  }>;
  scenes?: Array<{ name: string; description: string; goal: string }>;
  isLoading?: boolean;
}

export interface AIGenerateResult {
  name?: string;
  setting?: string;
  plot_summary?: string;
  worldview?: string;
  tone?: string;
  max_scenes?: number;
  characters?: Array<{
    name: string;
    background: string;
    dialogue_style: string;
    is_user: boolean;
  }>;
  scenes?: Array<{
    name: string;
    description: string;
    goal: string;
    setup: string;
    max_rounds: number;
  }>;
  content?: string;
}
