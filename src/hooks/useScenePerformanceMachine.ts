/**
 * 场景演出状态机 Hook
 * 封装场景演出的所有状态和动作，减少 Props 传递
 */

import { useState, useCallback, useMemo } from "preact/hooks";
import type { Room, Scene, Character, Performance } from "@/stores/types";
import type { ProviderConfig } from "@/stores/types";
import { useScenePerformance, type SceneDirective, type AICandidate } from "./useScenePerformance";
import { useDirectivePersistence } from "./useDirectivePersistence";
import { useSceneSummary } from "./useSceneSummary";

export type PerformanceStatus = "idle" | "performing" | "completed";

export interface ScenePerformanceState {
  // 基础状态
  status: PerformanceStatus;
  isOpen: boolean;
  isLoaded: boolean;

  // 进度信息
  currentStep: number;
  totalSteps: number;
  progress: number;
  maxPerformedStep: number;

  // AI 状态
  isStreaming: boolean;
  isPlanningDirective: boolean;
  isGeneratingCandidates: boolean;
  streamingContent: string;
  thinkingContent: string;
  currentActor: string;

  // 导演指令
  nextDirective: SceneDirective | null;
  aiCandidates: AICandidate[];
  completionReason: string;

  // 场景总结
  generatedSummary: string;
  isProcessingSummary: boolean;

  // 模型配置
  modelConfig: { provider: ProviderConfig; model: string; thinking: any } | null;
}

export interface ScenePerformanceActions {
  // 状态控制
  setStatus: (status: PerformanceStatus) => void;
  setIsLoaded: (loaded: boolean) => void;
  setModelConfig: (config: { provider: ProviderConfig; model: string; thinking: any } | null) => void;

  // 核心动作
  handleContinue: () => Promise<void>;
  handleGenerateCandidates: (directive: SceneDirective) => Promise<void>;
  handleSelectCandidate: (directive: SceneDirective, candidate: AICandidate) => Promise<void>;
  handleEndPerformance: () => void;
  handleGenerateSummary: () => Promise<void>;
  handleSaveSummary: () => Promise<void>;
  handleSkipSummary: () => void;
  handleClose: () => void;
  handleClearHistory: () => Promise<void>;
  handleDeletePerformance: (id: string) => Promise<void>;

  // 数据加载
  loadPerformances: () => Promise<void>;
  loadState: () => void;

  // 直接设置
  setNextDirective: (directive: SceneDirective | null) => void;
  setAICandidates: (candidates: AICandidate[]) => void;
  setGeneratedSummary: (summary: string) => void;
}

export interface UseScenePerformanceMachineOptions {
  isOpen: boolean;
  scene: Scene;
  room: Room;
  characters: Character[];
  onClose: () => void;
  onPerformancesChange: () => void;
}

/**
 * 场景演出状态机 Hook
 * 将所有状态和动作封装在一个 hook 中，简化组件逻辑
 */
export function useScenePerformanceMachine({
  isOpen,
  scene,
  room,
  characters,
  onClose,
  onPerformancesChange,
}: UseScenePerformanceMachineOptions) {
  // 基础状态
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [status, setStatus] = useState<PerformanceStatus>("idle");
  const [isLoaded, setIsLoaded] = useState(false);
  const [aiCandidates, setAICandidates] = useState<AICandidate[]>([]);
  const [completionReason, setCompletionReason] = useState("");
  const [modelConfig, setModelConfig] = useState<{
    provider: ProviderConfig;
    model: string;
    thinking: any;
  } | null>(null);

  // 使用持久化 Hook
  const {
    nextDirective,
    directiveHistory,
    tempCharacterProfiles,
    loadState,
    saveState,
    clearState,
    setNextDirective,
    addDirectiveToHistory,
    updateTempCharacterProfile,
  } = useDirectivePersistence(scene.id);

  // 使用场景总结 Hook
  const {
    generatedSummary,
    isProcessingSummary,
    handleGenerateSummary,
    handleSaveSummary,
    handleSkipSummary,
    setGeneratedSummary,
  } = useSceneSummary({
    scene,
    performances,
    characters,
    modelConfig,
    onPerformancesChange,
  });

  // 使用场景演出 Hook
  const {
    isStreaming,
    isPlanningDirective,
    isGeneratingCandidates,
    streamingContent,
    thinkingContent,
    currentActor,
    generateNextDirective,
    performDirectiveAI,
    generateAICandidates,
    saveUserPerformance,
    cancel,
    mergedCharactersForPrompt,
  } = useScenePerformance({
    scene,
    room,
    characters,
    performances,
    tempCharacterProfiles,
    modelConfig,
    onPerformancesChange: async () => {
      await loadPerformances();
      onPerformancesChange();
    },
  });

  // 计算属性
  const totalSteps = scene.max_rounds || 10;
  const maxPerformedStep = useMemo(
    () => (performances.length > 0 ? Math.max(...performances.map((p) => p.round), 0) : 0),
    [performances]
  );
  const currentStep = Math.min(nextDirective?.step || maxPerformedStep + 1, totalSteps);
  const progress = useMemo(
    () => (totalSteps > 0 && isLoaded ? Math.min(100, Math.round((maxPerformedStep / totalSteps) * 100)) : 0),
    [totalSteps, isLoaded, maxPerformedStep]
  );

  // 加载演出记录
  const loadPerformances = useCallback(async () => {
    const perfs = await import("@/db/models/performances").then(m => m.getPerformancesBySceneId(scene.id));
    setPerformances(perfs);

    if (perfs.length === 0) {
      setStatus("idle");
    } else if (status !== "completed") {
      setStatus("performing");
    }

    setIsLoaded(true);
  }, [scene.id, status]);

  // 初始化
  useCallback(() => {
    if (!isOpen) return;
    loadPerformances();
    loadState();
  }, [isOpen, loadPerformances, loadState]);

  // 加载模型配置
  useCallback(() => {
    if (!isOpen || modelConfig) return;
    try {
      const data = localStorage.getItem("ai-providers");
      const loadedProviders = data ? JSON.parse(data) : [];
      const target = loadedProviders.find((p: any) => p.is_active) || loadedProviders[0];
      if (!target) return;
      const model = target.custom_models?.[0] || target.model;
      if (!model) return;
      setModelConfig({ provider: target, model, thinking: undefined });
    } catch {
      // ignore bootstrap errors
    }
  }, [isOpen, modelConfig]);

  // 处理继续按钮
  const handleContinue = useCallback(async () => {
    if (status === "idle") setStatus("performing");

    if (!modelConfig) {
      alert("未检测到可用模型，请先在顶部模型按钮中选择模型");
      if (performances.length === 0 && !nextDirective) {
        setStatus("idle");
      }
      return;
    }

    if (status === "completed") {
      return;
    }

    if (!nextDirective && maxPerformedStep >= totalSteps) {
      setCompletionReason("已达到场景设定的最大步数");
      setStatus("completed");
      return;
    }

    // 如果已有 nextDirective，处理它
    if (nextDirective) {
      if (nextDirective.speaker.isUser) {
        // 用户回合，等待用户输入
        return;
      }
      try {
        await performDirectiveAI(nextDirective);
        addDirectiveToHistory(nextDirective);
        setNextDirective(null);
      } catch (error: any) {
        console.error("AI 表演失败:", error);
        alert(`AI 表演失败：${error?.message || "请重试"}`);
      }
      return;
    }

    // 生成新的 directive
    const directive = await generateNextDirective();
    if (!directive) return;

    setAICandidates([]);
    if (status === "idle") setStatus("performing");

    // 保存 directive 状态
    setNextDirective(directive);
    if (directive.speaker.isTemp) {
      updateTempCharacterProfile({
        id: directive.speaker.characterId,
        name: directive.speaker.characterName,
        isUser: directive.speaker.isUser,
        background: directive.speaker.background,
        dialogueStyle: directive.speaker.dialogueStyle,
      });
    }

    // 如果不是用户回合，立即执行 AI 表演
    if (!directive.speaker.isUser) {
      try {
        await performDirectiveAI(directive);
        addDirectiveToHistory(directive);
        setNextDirective(null);
      } catch (error: any) {
        console.error("AI 表演失败:", error);
        alert(`AI 表演失败：${error?.message || "请重试"}`);
      }
    }
  }, [
    modelConfig,
    status,
    nextDirective,
    maxPerformedStep,
    totalSteps,
    generateNextDirective,
    performDirectiveAI,
    performances.length,
    setNextDirective,
    addDirectiveToHistory,
    updateTempCharacterProfile,
  ]);

  // 处理生成候选
  const handleGenerateCandidates = useCallback(
    async (directive: SceneDirective) => {
      try {
        const candidates = await generateAICandidates(directive);
        setAICandidates(candidates);
      } catch (error: any) {
        console.error("生成候选失败:", error);
        alert(`生成候选失败：${error?.message || "请重试"}`);
      }
    },
    [generateAICandidates],
  );

  // 处理选择候选
  const handleSelectCandidate = useCallback(
    async (directive: SceneDirective, candidate: AICandidate) => {
      try {
        await saveUserPerformance(directive, candidate.content);
        addDirectiveToHistory(directive);
        setNextDirective(null);
        setAICandidates([]);
        await loadPerformances();
      } catch (error: any) {
        console.error("保存候选失败:", error);
        alert(`保存失败：${error?.message || "请重试"}`);
      }
    },
    [saveUserPerformance, addDirectiveToHistory, setNextDirective, loadPerformances],
  );

  // 处理结束演出
  const handleEndPerformance = useCallback(() => {
    setAICandidates([]);
    setCompletionReason("手动结束演出");
    setStatus("completed");
  }, []);

  // 处理关闭
  const handleClose = useCallback(() => {
    if (isStreaming) {
      cancel();
    }
    onPerformancesChange();
    onClose();
  }, [isStreaming, cancel, onPerformancesChange, onClose]);

  // 清空历史
  const handleClearHistory = useCallback(async () => {
    if (!confirm("确定要清空所有演出记录吗？")) return;
    const { deletePerformancesBySceneId } = await import("@/db/models/performances");
    await deletePerformancesBySceneId(scene.id);
    clearState();
    await loadPerformances();
    setStatus("idle");
  }, [scene.id, clearState, loadPerformances]);

  // 删除单条演出
  const handleDeletePerformance = useCallback(
    async (id: string) => {
      const { deletePerformance } = await import("@/db/models/performances");
      await deletePerformance(id);
      await loadPerformances();
      onPerformancesChange();
    },
    [loadPerformances, onPerformancesChange],
  );

  // 状态对象
  const state: ScenePerformanceState = {
    status,
    isOpen,
    isLoaded,
    currentStep,
    totalSteps,
    progress,
    maxPerformedStep,
    isStreaming,
    isPlanningDirective,
    isGeneratingCandidates,
    streamingContent,
    thinkingContent,
    currentActor,
    nextDirective,
    aiCandidates,
    completionReason,
    generatedSummary,
    isProcessingSummary,
    modelConfig,
  };

  // 动作对象
  const actions: ScenePerformanceActions = {
    setStatus,
    setIsLoaded,
    setModelConfig,
    handleContinue,
    handleGenerateCandidates,
    handleSelectCandidate,
    handleEndPerformance,
    handleGenerateSummary,
    handleSaveSummary,
    handleSkipSummary,
    handleClose,
    handleClearHistory,
    handleDeletePerformance,
    loadPerformances,
    loadState,
    setNextDirective,
    setAICandidates,
    setGeneratedSummary,
  };

  return {
    state,
    actions,
    // 额外导出的数据（用于子组件）
    performances,
    characters: mergedCharactersForPrompt,
    tempCharacterProfiles,
  };
}
