/**
 * 场景演出模态框 - 底部控制区域组件
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect, useCallback } from "preact/hooks";
import { Button } from "@components/ui/common";
import { UserPerformanceInput } from "@components/ui/room/UserPerformanceInput";
import type { Character } from "@/stores";
import { findCharacterByName } from "@/lib/rules/performance";

interface ModelConfig {
  provider: any;
  model: string;
  thinking: any;
}

import type { Performer } from "@/lib/rules/performance";

interface ScenePerformanceFooterProps {
  status: "idle" | "performing" | "completed";
  currentRound: number;
  totalRounds: number;
  currentPerformer: Performer | null;
  currentRoundPlan: any;
  isLoaded: boolean;
  characters: Character[];
  modelConfig: ModelConfig | null;
  performAI: (
    performer: Performer,
    provider: any,
    model: string,
    thinking: any,
    onStream: (content: string, thinking: string) => void,
  ) => Promise<void>;
  saveUserPerformance: (
    characterId: string,
    content: {
      dialogue?: string;
      action?: string;
      thought?: string;
      emotion?: string;
    },
  ) => Promise<void>;
  onStart: () => void; // 开始演出（从 idle 切换到 performing）
  onEndPerformance: () => void;
  onFinish: () => void;
  generatedSummary: string;
  isProcessingSummary?: boolean;
  // 流式显示状态（由父组件控制）
  isStreaming?: boolean;
  streamingContent?: string;
  thinkingContent?: string;
  currentActor?: string;
}

export const ScenePerformanceFooter: FunctionalComponent<
  ScenePerformanceFooterProps
> = ({
  status,
  currentRound,
  totalRounds,
  currentPerformer,
  currentRoundPlan,
  isLoaded,
  characters,
  modelConfig,
  performAI,
  saveUserPerformance,
  onStart,
  onEndPerformance,
  onFinish,
  generatedSummary,
  isProcessingSummary = false,
  isStreaming = false,
  streamingContent = "",
  thinkingContent = "",
  currentActor = "",
}) => {
  // 用户输入状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInputs, setUserInputs] = useState<
    Record<
      string,
      {
        dialogue: string;
        action: string;
        thought: string;
        emotion: string;
      }
    >
  >({});

  // 计算属性
  const isUserTurn = currentPerformer?.isUser ?? false;
  const isAiTurn = currentPerformer ? !currentPerformer.isUser : false;
  const isAllRoundsComplete =
    !currentPerformer && currentRound >= totalRounds && isLoaded;

  // 当前台词建议
  const currentLineHint = (() => {
    if (!currentPerformer || !currentRoundPlan) return null;
    const turns: any[] =
      currentRoundPlan?.turns || currentRoundPlan?.performances || [];
    const turn = turns.find(
      (t) => t.characterName === currentPerformer.characterName,
    );
    return turn?.lineHint;
  })();

  // 是否临时角色
  const isTempPerformer = (() => {
    if (!currentPerformer || !currentRoundPlan) return false;
    const turns: any[] =
      currentRoundPlan?.turns || currentRoundPlan?.performances || [];
    const turn = turns.find(
      (t) => t.characterName === currentPerformer.characterName,
    );
    return turn?.isTemp;
  })();

  // 执行 AI 表演
  const handleAIPerform = useCallback(async () => {
    if (!modelConfig) {
      alert("请先选择模型");
      return;
    }

    if (!currentPerformer) {
      alert("没有安排轮次，请先创建轮次");
      return;
    }

    setIsProcessing(true);
    try {
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        console.log(modelConfig);
        try {
          await performAI(
            currentPerformer,
            modelConfig.provider,
            modelConfig.model,
            modelConfig.thinking,
            () => {}, // 流式回调由父组件管理
          );
          setIsProcessing(false);
          return;
        } catch (error: any) {
          retryCount++;
          const isRateLimit =
            error?.status === 429 || error?.message?.includes("429");
          if (isRateLimit && retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 1000;
            console.log(`429 限流，等待 ${waitTime}ms`);
            await new Promise((r) => setTimeout(r, waitTime));
          } else {
            console.error("AI 表演失败:", error);
            alert(`AI 表演失败：${error?.message || "请重试"}`);
            setIsProcessing(false);
            return;
          }
        }
      }
    } catch (error) {
      console.error("AI 表演失败:", error);
    }
    setIsProcessing(false);
  }, [currentPerformer, modelConfig, performAI]);

  // 用户提交输入
  const handleUserInput = useCallback(async () => {
    if (!currentPerformer || !currentPerformer.isUser) return;

    const character = findCharacterByName(
      currentPerformer.characterName,
      characters,
    );
    if (!character) return;

    const input = userInputs[character.id];
    if (!input) return;

    setIsProcessing(true);
    try {
      await saveUserPerformance(character.id, input);
      setUserInputs({});
    } finally {
      setIsProcessing(false);
    }
  }, [currentPerformer, characters, userInputs, saveUserPerformance]);

  // 判断是否启用 thinking
  const isThinkingEnabled = modelConfig?.thinking?.enabled;

  return (
    <div class="shrink-0 border-t border-dark-accent">
      {/* 状态栏 */}
      <div class="flex flex-row md:items-center justify-between px-3 md:px-4 py-2 md:py-3 bg-dark-accent/20 gap-2">
        <div class="flex items-center gap-2 md:gap-4 flex-wrap">
          {status === "performing" && (
            <span class="text-xs md:text-sm font-semibold text-white px-2 py-0.5 md:px-3 md:py-1 bg-primary-600/30 rounded">
              第 {currentRound}/{totalRounds} 轮
            </span>
          )}
          {status === "idle" && (
            <span class="text-xs md:text-sm text-gray-400">准备开始</span>
          )}
          {status === "completed" && (
            <span class="text-xs md:text-sm text-green-400">✅ 演出完成</span>
          )}

          {/* 当前轮到谁 */}
          {status === "performing" && (
            <div class="flex flex-col gap-2 flex-wrap">
              <span class="text-xs md:text-sm text-gray-300">
                {currentActor ? (
                  <>
                    🤖 <span class="text-white">{currentActor}</span> 生成中...
                  </>
                ) : isUserTurn ? (
                  <>
                    👤 轮到{" "}
                    <span class="text-primary-300">
                      {currentPerformer?.characterName}
                    </span>
                    {isTempPerformer && (
                      <span class="ml-1 text-xs px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded">
                        临时
                      </span>
                    )}
                  </>
                ) : isAiTurn ? (
                  <>
                    🤖 等待{" "}
                    <span class="text-white">
                      {currentPerformer?.characterName}
                    </span>
                    {isTempPerformer && (
                      <span class="ml-1 text-xs px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded">
                        临时
                      </span>
                    )}
                  </>
                ) : (
                  <>✓ 本轮完成</>
                )}
              </span>
              {currentLineHint && (
                <span class="text-xs px-2 py-0.5 bg-primary-600/30 text-primary-300 rounded">
                  💡 {currentLineHint}
                </span>
              )}
            </div>
          )}
        </div>
        <div class="flex gap-2 justify-end">
          {status === "idle" && (
            <Button
              onClick={isUserTurn ? onStart : handleAIPerform}
              isLoading={isProcessing}
              size="sm"
            >
              {isUserTurn ? "🎬 开始（用户回合）" : "🎬 开始"}
            </Button>
          )}
          {status === "performing" && isAiTurn && !isStreaming && (
            <Button
              onClick={handleAIPerform}
              isLoading={isProcessing || isStreaming}
              size="sm"
            >
              🎬 继续
            </Button>
          )}
          {status === "performing" && isUserTurn && (
            <Button
              onClick={handleUserInput}
              isLoading={isProcessing}
              size="sm"
            >
              ✓ 确认
            </Button>
          )}
          {status === "performing" && isAllRoundsComplete && (
            <Button onClick={onEndPerformance} variant="primary" size="sm">
              🏁 结束演出
            </Button>
          )}
          {status === "completed" && !generatedSummary && (
            <Button
              onClick={onFinish}
              isLoading={isProcessingSummary}
              variant="primary"
              size="sm"
            >
              📝 生成总结
            </Button>
          )}
        </div>
      </div>

      {/* 用户输入区域 */}
      {status === "performing" && isUserTurn && currentPerformer && (
        <div class="px-2 md:px-4 py-2 border-t border-dark-accent/50">
          {(() => {
            const character = findCharacterByName(
              currentPerformer.characterName,
              characters,
            );
            return character ? (
              <UserPerformanceInput
                character={character}
                value={
                  userInputs[character.id] || {
                    dialogue: "",
                    action: "",
                    thought: "",
                    emotion: "",
                  }
                }
                onChange={(value) =>
                  setUserInputs({ ...userInputs, [character.id]: value })
                }
                lineHint={currentLineHint || undefined}
              />
            ) : null;
          })()}
        </div>
      )}

      {/* AI 生成中提示 */}
      {status === "performing" && (thinkingContent || streamingContent) && (
        <div class="px-2 md:px-4 py-2 border-t border-dark-accent/50">
          {thinkingContent && (
            <div class="bg-purple-900/20 rounded p-2 mb-2">
              <div class="text-xs text-purple-300 mb-1">🧠 思考中...</div>
              <div class="text-xs text-purple-200/70 whitespace-pre-wrap max-h-16 md:max-h-20 overflow-y-auto font-mono">
                {thinkingContent}
              </div>
            </div>
          )}
          {streamingContent && (
            <div class="bg-dark-accent/30 rounded p-2">
              <div class="text-xs text-gray-400 mb-1">✨ 生成中...</div>
              <div class="text-xs md:text-sm text-gray-300 whitespace-pre-wrap max-h-16 md:max-h-24 overflow-y-auto">
                {streamingContent}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
