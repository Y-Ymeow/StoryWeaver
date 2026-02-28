import type { Scene, Performance } from "@stores";

/**
 * PerformanceBubble 组件 Props
 */
export interface PerformanceBubbleProps {
  performance: Performance;
  characterName?: string;
  isCurrentUser?: boolean;
}

/**
 * 解析后的内容
 */
export interface ParsedContent {
  dialogue?: string;
  action?: string;
  thought?: string;
  emotion?: string;
}

/**
 * PerformanceList 组件 Props
 */
export interface PerformanceListProps {
  performances: Performance[];
  currentRound?: number;
}

/**
 * ScenePerformanceModal 组件 Props
 */
export interface ScenePerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneId: string;
}

/**
 * SceneEditor 组件 Props
 */
export interface SceneEditorProps {
  isOpen: boolean;
  onClose: () => void;
  sceneId?: string;
  roomId?: string;
}

/**
 * 轮次计划类型
 */
export interface RoundPlan {
  round: number;
  description: string;
  characters: string[];
}

/**
 * 场景出场角色设置
 */
export interface SceneCharacter {
  id: string;
  name: string;
  role: string;
}

/**
 * ScenePerformance 组件 Props
 */
export interface ScenePerformanceProps {
  scene: Scene;
}
