/**
 * 场景演出模态框
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import { PerformanceList } from "./PerformanceList";
import { ScenePerformanceHeader } from "./ScenePerformanceHeader";
import { ScenePerformanceFooter } from "./ScenePerformanceFooter";
import { SummaryEditModal } from "./SummaryEditModal";
import { useAIChatStream } from "@/hooks/useAIChatStream";
import type { Room, Scene, Character, Performance } from "@/stores";
import {
  getPerformancesBySceneId,
  createPerformance,
  deletePerformance,
  deletePerformancesBySceneId,
} from "@/db/models/performances";
import { updateScene } from "@/db/models/scenes";
import { generateSceneSummary } from "@/lib/memory";
import { parseMultiplePerformances } from "@/lib/parser";
import { buildSceneRoundPrompt } from "@/lib/prompts/scene";
import {
  getNextPerformer,
  isRoundComplete,
} from "@/lib/rules/performance";
import { findOrCreateCharacter } from "@/lib/rules/character-helper";

interface ScenePerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene;
  room: Room;
  characters: Character[];
  onPerformancesChange: () => void;
}

export type PerformanceStatus = "idle" | "performing" | "completed";

export const ScenePerformanceModal: FunctionalComponent<
  ScenePerformanceModalProps
> = ({ isOpen, onClose, scene, room, characters, onPerformancesChange }) => {
  // ===== 核心状态 =====
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [status, setStatus] = useState<PerformanceStatus>("idle");
  const [currentRound, setCurrentRound] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [roundPlan, setRoundPlan] = useState<any[]>([]);

  // 模型配置
  const [modelConfig, setModelConfig] = useState<{
    provider: any;
    model: string;
    thinking: any;
  } | null>(null);

  // 摘要状态
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [isProcessingSummary, setIsProcessingSummary] = useState(false);

  // AI Stream Hook
  const { chatStream, isStreaming, cancel } = useAIChatStream();

  // 流式显示状态
  const [streamingContent, setStreamingContent] = useState("");
  const [thinkingContent, setThinkingContent] = useState("");
  const [currentActor, setCurrentActor] = useState("");

  // ===== 初始化 =====
  useEffect(() => {
    if (isOpen) {
      if (scene.round_plan) {
        try {
          const plan =
            typeof scene.round_plan === "string"
              ? JSON.parse(scene.round_plan)
              : scene.round_plan;
          setRoundPlan(plan);
        } catch (e) {
          console.error("解析轮次计划失败:", e);
        }
      }
    }
  }, [isOpen, scene.round_plan]);

  const loadPerformances = useCallback(async () => {
    const perfs = await getPerformancesBySceneId(scene.id);
    setPerformances(perfs);

    if (perfs.length === 0) {
      setStatus("idle");
      setCurrentRound(1);
      setIsLoaded(true);
      return;
    }

    const maxRound = Math.max(...perfs.map((p) => p.round));
    const complete = isRoundComplete(maxRound, roundPlan, perfs, characters);

    if (complete) {
      if (maxRound >= (scene.max_rounds || 5)) {
        setStatus("completed");
      } else {
        setStatus("performing");
        setCurrentRound(maxRound + 1);
      }
    } else {
      setStatus("performing");
      setCurrentRound(maxRound);
    }
    setIsLoaded(true);
  }, [scene.id, scene.max_rounds, roundPlan, characters]);

  useEffect(() => {
    if (roundPlan.length > 0 || scene.round_plan === null) {
      loadPerformances();
    }
  }, [loadPerformances, roundPlan.length, scene.round_plan]);

  // ===== 计算属性 =====
  const totalRounds = scene.max_rounds || 5;

  const currentPerformer = useMemo(() => {
    if (!isLoaded) return null;
    return getNextPerformer(currentRound, roundPlan, performances, characters);
  }, [isLoaded, currentRound, roundPlan, performances, characters]);

  const currentRoundPlan = roundPlan.find((r) => r.round === currentRound);

  const progress = totalRounds > 0 && isLoaded
    ? Math.round((currentRound / totalRounds) * 100)
    : 0;

  // ===== AI 表演核心逻辑 =====
  const performAI = useCallback(async (
    performer: NonNullable<ReturnType<typeof getNextPerformer>>,
    provider: any,
    model: string,
    thinking: any,
    onStream?: (content: string, thinking: string) => void,
  ) => {
    // 查找或创建角色对象（支持临时角色）
    const character = findOrCreateCharacter(
      performer.characterName,
      characters,
      {
        characterId: performer.characterId,
        isTemp: performer.isTemp,
      },
    );

    setCurrentActor(character.name);
    setStreamingContent("");
    setThinkingContent("");

    const currentRoundGoal = currentRoundPlan?.goal || currentRoundPlan?.description || scene.goal;
    const turns: any[] = (currentRoundPlan as any)?.turns || (currentRoundPlan as any)?.performances || [];
    const turn = turns.find((t) => t.characterName === character.name);
    const lineHint = turn?.lineHint;

    const prompt = buildSceneRoundPrompt(
      room,
      scene,
      character,
      characters,
      performances,
      currentRound,
      currentRoundGoal,
      lineHint,
    );
    const messages = [
      { role: "system", content: "你是专业演员。根据角色设定和剧情生成符合角色性格的表演内容。" },
      { role: "user", content: prompt },
    ];

    try {
      const { content, thinkingContent } = await chatStream(
        provider,
        messages,
        {
          temperature: 0.7,
          max_tokens: 2048,
          model,
          thinking,
        },
        (fullContent, thinkingContent) => {
          setStreamingContent(fullContent);
          setThinkingContent(thinkingContent);
          onStream?.(fullContent, thinkingContent);
        },
      );

      // 解析并保存
      const parsedList = parseMultiplePerformances(content);
      let currentOrder = performances.length;

      for (const parsed of parsedList) {
        const contentObj: Record<string, string> = {};
        if (parsed.dialogue) contentObj.dialogue = parsed.dialogue;
        if (parsed.action) contentObj.action = parsed.action;
        if (parsed.thought) contentObj.thought = parsed.thought;
        if (parsed.emotion) contentObj.emotion = parsed.emotion;
        if (Object.keys(contentObj).length === 0) continue;

        await createPerformance({
          scene_id: scene.id,
          character_id: character.id,
          content: contentObj,
          primary_type: (Object.keys(contentObj)[0] as any) || "dialogue",
          round: currentRound,
          order: currentOrder++,
        });
      }

      setStreamingContent("");
      setThinkingContent("");
      setCurrentActor("");
      await loadPerformances();
    } catch (error) {
      console.error("AI 表演失败:", error);
      setCurrentActor("");
      throw error;
    }
  }, [characters, currentRoundPlan, room, scene, performances, currentRound, loadPerformances, chatStream]);

  // ===== 用户输入保存 =====
  const saveUserPerformance = useCallback(async (
    characterId: string,
    content: { dialogue?: string; action?: string; thought?: string; emotion?: string }
  ) => {
    const contentObj: Record<string, string> = {};
    if (content.dialogue?.trim()) contentObj.dialogue = content.dialogue.trim();
    if (content.action?.trim()) contentObj.action = content.action.trim();
    if (content.thought?.trim()) contentObj.thought = content.thought.trim();
    if (content.emotion?.trim()) contentObj.emotion = content.emotion.trim();

    if (Object.keys(contentObj).length === 0) return;

    await createPerformance({
      scene_id: scene.id,
      character_id: characterId,
      content: contentObj,
      primary_type: (Object.keys(contentObj)[0] as any) || "dialogue",
      round: currentRound,
      order: performances.length,
    });

    await loadPerformances();
  }, [scene.id, currentRound, performances.length, loadPerformances]);

  // ===== 摘要相关 =====
  const handleGenerateSummary = async () => {
    setIsProcessingSummary(true);
    try {
      const summary = await generateSceneSummary(scene, performances, characters);
      setGeneratedSummary(summary);
    } catch (error) {
      console.error("生成摘要失败:", error);
      setGeneratedSummary("生成摘要失败，请手动输入摘要。");
    } finally {
      setIsProcessingSummary(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!generatedSummary.trim()) {
      alert("请输入场景摘要");
      return;
    }
    setIsProcessingSummary(true);
    try {
      await updateScene(scene.id, { summary: generatedSummary });
      setGeneratedSummary("");
      setStatus("completed");
      onPerformancesChange();
    } catch (error) {
      console.error("保存摘要失败:", error);
      alert("保存摘要失败，请重试");
    } finally {
      setIsProcessingSummary(false);
    }
  };

  const handleSkipSummary = () => {
    setGeneratedSummary("");
    setStatus("completed");
    onPerformancesChange();
  };

  // ===== 删除操作 =====
  const clearHistory = useCallback(async () => {
    if (!confirm("确定要清空所有演出记录吗？")) return;
    await deletePerformancesBySceneId(scene.id);
    await loadPerformances();
    setCurrentRound(1);
    setStatus("idle");
  }, [scene.id, loadPerformances]);

  const deletePerf = useCallback(async (id: string) => {
    await deletePerformance(id);
    await loadPerformances();
    onPerformancesChange();
  }, [loadPerformances, onPerformancesChange]);

  const deleteRound = useCallback(async (round: number) => {
    const roundPerfs = performances.filter((p) => p.round === round);
    for (const perf of roundPerfs) {
      await deletePerformance(perf.id);
    }
    await loadPerformances();
    onPerformancesChange();
  }, [performances, loadPerformances, onPerformancesChange]);

  const handleClose = () => {
    if (isStreaming) {
      cancel();
    }
    onPerformancesChange();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div class="w-full h-full max-w-7xl mx-auto p-2 md:p-4 flex flex-col">
        <div class="bg-dark-surface rounded-lg shadow-2xl flex flex-col h-full overflow-hidden">
          {/* 头部 */}
          <ScenePerformanceHeader
            scene={scene}
            status={status}
            currentRound={currentRound}
            totalRounds={totalRounds}
            progress={progress}
            currentRoundGoal={currentRoundPlan?.goal || currentRoundPlan?.description || scene.goal}
            onClearHistory={clearHistory}
            onClose={handleClose}
            onModelConfigChange={setModelConfig}
          />

          {/* 演出记录区域 */}
          <div class="flex-1 overflow-y-auto p-2 md:p-4">
            <PerformanceList
              performances={performances}
              characters={characters}
              onDeletePerformance={deletePerf}
              onDeleteRound={deleteRound}
            />
          </div>

          {/* 底部控制区域 */}
          <ScenePerformanceFooter
            status={status}
            currentRound={currentRound}
            totalRounds={totalRounds}
            currentPerformer={currentPerformer}
            currentRoundPlan={currentRoundPlan}
            isLoaded={isLoaded}
            characters={characters}
            modelConfig={modelConfig}
            performAI={performAI}
            saveUserPerformance={saveUserPerformance}
            onEndPerformance={() => setStatus("completed")}
            onFinish={handleGenerateSummary}
            generatedSummary={generatedSummary}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            thinkingContent={thinkingContent}
            currentActor={currentActor}
          />
        </div>
      </div>

      {/* 摘要编辑弹窗 */}
      <SummaryEditModal
        isOpen={status === "completed" && !!generatedSummary}
        totalRounds={totalRounds}
        performanceCount={performances.length}
        generatedSummary={generatedSummary}
        isProcessing={isProcessingSummary}
        onSummaryChange={setGeneratedSummary}
        onSave={handleSaveSummary}
        onSkip={handleSkipSummary}
      />
    </div>
  );
};
