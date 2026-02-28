import type { Character, Scene, Performance } from "@stores";

/**
 * RoomInfoEditor 组件 Props
 */
export interface RoomInfoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
}

/**
 * CharacterManager 组件 Props
 */
export interface CharacterManagerProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
}

/**
 * RoomExportImport 组件 Props
 */
export interface RoomExportImportProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
}

/**
 * RoomSummaryGenerator 组件 Props
 */
export interface RoomSummaryGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
}

/**
 * 场景摘要数据
 */
export interface SceneSummaryData {
  scene: Scene;
  summary: string;
}

/**
 * PerformanceHistory 组件 Props
 */
export interface PerformanceHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  sceneId?: string;
}

/**
 * 带有详情的演出记录
 */
export interface PerformanceWithDetails extends Performance {
  characterName?: string;
}

/**
 * UserPerformanceInput 组件 Props
 */
export interface UserPerformanceInputProps {
  character: Character;
  sceneId: string;
  onSubmit: (content: Record<string, string>) => void;
  onCancel?: () => void;
}

/**
 * 用户输入类型
 */
export type InputTab = "dialogue" | "action" | "thought" | "emotion";

/**
 * AIActor 组件 Props
 */
export interface AIActorProps {
  character: Character;
  sceneId: string;
  onComplete?: () => void;
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
