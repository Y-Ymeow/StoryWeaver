/**
 * 场景总结 Hook
 * 封装场景总结的生成和保存逻辑
 */

import { useState, useCallback } from "preact/hooks";
import type { Scene, Performance, Character } from "@/stores/types";
import { updateScene } from "@/db/models/scenes";
import { generateSceneSummary } from "@/lib/memory";

interface UseSceneSummaryOptions {
  scene: Scene;
  performances: Performance[];
  characters: Character[];
  modelConfig?: { provider: any; model: string } | null;
  onPerformancesChange?: () => void;
}

export function useSceneSummary({
  scene,
  performances,
  characters,
  modelConfig,
  onPerformancesChange,
}: UseSceneSummaryOptions) {
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [isProcessingSummary, setIsProcessingSummary] = useState(false);

  /**
   * 生成场景总结
   */
  const handleGenerateSummary = useCallback(async () => {
    setIsProcessingSummary(true);
    try {
      const summary = await generateSceneSummary(
        scene,
        performances,
        characters,
        modelConfig
          ? {
              provider: modelConfig.provider,
              model: modelConfig.model,
            }
          : undefined,
      );
      setGeneratedSummary(summary);
    } catch (error) {
      console.error("生成摘要失败:", error);
      setGeneratedSummary("生成摘要失败，请手动输入摘要。");
    } finally {
      setIsProcessingSummary(false);
    }
  }, [scene, performances, characters, modelConfig]);

  /**
   * 保存场景总结
   */
  const handleSaveSummary = useCallback(async () => {
    if (!generatedSummary.trim()) {
      throw new Error("请输入场景摘要");
    }
    setIsProcessingSummary(true);
    try {
      await updateScene(scene.id, { summary: generatedSummary });
      setGeneratedSummary("");
      onPerformancesChange?.();
    } catch (error) {
      console.error("保存摘要失败:", error);
      throw new Error("保存摘要失败，请重试");
    } finally {
      setIsProcessingSummary(false);
    }
  }, [generatedSummary, scene.id, onPerformancesChange]);

  /**
   * 跳过总结
   */
  const handleSkipSummary = useCallback(() => {
    setGeneratedSummary("");
    onPerformancesChange?.();
  }, [onPerformancesChange]);

  return {
    // 状态
    generatedSummary,
    isProcessingSummary,

    // 方法
    handleGenerateSummary,
    handleSaveSummary,
    handleSkipSummary,
    setGeneratedSummary,
  };
}
