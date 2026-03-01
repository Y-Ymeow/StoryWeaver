/**
 * 场景演出模态框
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect, useMemo } from "preact/hooks";
import { Button, ModelButton } from "@components/ui/common";
import { UserPerformanceInput } from "@components/ui/room/UserPerformanceInput";
import { PerformanceList } from "./PerformanceList";
import type { Room, Scene, Character, Performance } from "@/stores";
import {
  getPerformancesBySceneId,
  createPerformance,
  deletePerformance,
  deletePerformancesBySceneId,
} from "@/db/models/performances";
import { updateScene } from "@/db/models/scenes";
import { createClient } from "@/lib/openai/client";
import { generateSceneSummary } from "@/lib/memory";
import { buildSceneRoundPrompt } from "@/lib";
import { parseMultiplePerformances } from "@/lib/parser";
import {
  getNextPerformer,
  isRoundComplete,
  findCharacterByName,
} from "@/lib/rules/performance";

interface ScenePerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene;
  room: Room;
  characters: Character[];
  onPerformancesChange: () => void;
}

export const ScenePerformanceModal: FunctionalComponent<
  ScenePerformanceModalProps
> = ({ isOpen, onClose, scene, room, characters, onPerformancesChange }) => {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState("");
  const [isThinkingModel, setIsThinkingModel] = useState(false);
  const [enableThinking, setEnableThinking] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(1024);
  const [status, setStatus] = useState<"idle" | "performing" | "completed">(
    "idle",
  );
  const [currentRound, setCurrentRound] = useState(1);
  const [userInputs, setUserInputs] = useState<
    Record<
      string,
      { dialogue: string; action: string; thought: string; emotion: string }
    >
  >({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [thinkingContent, setThinkingContent] = useState("");
  const [currentActor, setCurrentActor] = useState("");
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [roundPlan, setRoundPlan] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProvidersData();
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
      } else {
        loadPerformances();
      }
    }
  }, [isOpen, scene.id]);

  useEffect(() => {
    if (isOpen && roundPlan.length > 0) {
      loadPerformances();
    }
  }, [isOpen, roundPlan.length]);

  const loadProvidersData = () => {
    const data = localStorage.getItem("ai-providers");
    const loadedProviders = data ? JSON.parse(data) : [];
    setProviders(loadedProviders);
    const active = loadedProviders.find((p: any) => p.is_active);
    if (active) {
      setSelectedProviderId(active.id);
      const model = active.custom_models?.[0] || active.model;
      if (model) setSelectedModel(model);
      setIsThinkingModel(active.supports_thinking || false);
      setEnableThinking(
        active.supports_thinking && active.thinking_param_key ? true : false,
      );
    }
  };

  const loadPerformances = async () => {
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
  };

  const totalRounds = scene.max_rounds || 5;

  // 获取当前待表演的演员 - 使用 useMemo 确保数据变化时重新计算
  const currentPerformer = useMemo(() => {
    if (!isLoaded) return null;
    return getNextPerformer(currentRound, roundPlan, performances, characters);
  }, [isLoaded, currentRound, roundPlan, performances, characters]);

  const isUserTurn = currentPerformer?.isUser ?? false;
  const isAiTurn = currentPerformer && !currentPerformer.isUser;

  // 检查是否所有轮次都已完成（没有待表演的演员）
  const isAllRoundsComplete =
    !currentPerformer && currentRound >= totalRounds && isLoaded;

  // 开始/继续演出
  const handleStart = async () => {
    if (!selectedProviderId || !selectedModel) {
      alert("请先选择模型");
      return;
    }
    setStatus("performing");
    await processNext();
  };

  // 处理下一个演员
  const processNext = async () => {
    const nextPerformer = currentPerformer;

    if (!nextPerformer) {
      // 本轮结束，检查是否完成所有轮次
      const maxRounds = scene.max_rounds || 5;
      if (currentRound >= maxRounds) {
        // 最后一轮完成，保持 performing 状态，等待用户手动点击"结束演出"
        return;
      } else {
        // 进入下一轮，但不自动开始
        setCurrentRound(currentRound + 1);
      }
      return;
    }

    // 如果是用户，等待用户输入
    if (nextPerformer.isUser) {
      return;
    }

    // AI 表演
    await performAI(nextPerformer);
  };

  // 手动结束演出
  const handleEndPerformance = () => {
    setStatus("completed");
  };

  // AI 表演
  const performAI = async (performer: any) => {
    setIsProcessing(true);
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const provider = providers.find((p) => p.id === selectedProviderId);
        if (!provider) throw new Error("Provider 不存在");

        const model =
          selectedModel || provider.custom_models?.[0] || provider.model;
        if (!model) throw new Error("未选择模型");

        const client = createClient(provider);
        const character = findCharacterByName(
          performer.characterName,
          characters,
        );
        if (!character)
          throw new Error(`找不到角色: ${performer.characterName}`);

        setCurrentActor(character.name);
        setStreamingContent("");
        setThinkingContent("");

        let thinking: any = undefined;
        if (provider.supports_thinking && enableThinking) {
          thinking = {
            enabled: true,
            param_key: provider.thinking_param_key || "thinking",
            type: provider.thinking_param_type || "boolean",
            default: provider.thinking_param_default,
            budget_tokens: thinkingBudget,
          };
        } else if (provider.supports_thinking) {
          thinking = { type: "disabled" };
        }

        // 获取当前轮次目标
        const currentRoundPlanItem = roundPlan.find(
          (r) => r.round === currentRound,
        );
        const roundGoal = currentRoundPlanItem?.description;

        const prompt = buildSceneRoundPrompt(
          room,
          scene,
          character,
          characters,
          performances,
          currentRound,
          roundGoal,
        );
        const messages = [
          {
            role: "system",
            content:
              "你是专业演员。根据角色设定和剧情生成符合角色性格的表演内容。",
          },
          { role: "user", content: prompt },
        ];

        const stream = client.chatStream(messages, {
          temperature: 0.7,
          max_tokens: 2048,
          model,
          thinking,
        });
        let fullContent = "";
        let inThinking = false;

        for await (const chunk of stream) {
          if (chunk.includes("<tool_call>") || chunk.includes("起")) {
            inThinking = true;
            continue;
          }
          if (chunk.includes("ৗ") || chunk.includes("终")) {
            inThinking = false;
            continue;
          }
          if (inThinking) {
            setThinkingContent((prev) => prev + chunk);
          } else {
            fullContent += chunk;
            setStreamingContent(fullContent);
          }
        }

        // 解析并保存
        const parsedList = parseMultiplePerformances(fullContent);
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
    setIsProcessing(false);
  };

  // 用户提交输入
  const handleUserInput = async () => {
    const performer = currentPerformer;
    if (!performer || !performer.isUser) return;

    const character = findCharacterByName(performer.characterName, characters);
    if (!character) return;

    const input = userInputs[character.id];
    if (!input) return;

    const contentObj: Record<string, string> = {};
    if (input.dialogue?.trim()) contentObj.dialogue = input.dialogue.trim();
    if (input.action?.trim()) contentObj.action = input.action.trim();
    if (input.thought?.trim()) contentObj.thought = input.thought.trim();
    if (input.emotion?.trim()) contentObj.emotion = input.emotion.trim();

    if (Object.keys(contentObj).length === 0) return;

    await createPerformance({
      scene_id: scene.id,
      character_id: character.id,
      content: contentObj,
      primary_type: (Object.keys(contentObj)[0] as any) || "dialogue",
      round: currentRound,
      order: performances.length,
    });

    setUserInputs({});
    await loadPerformances();
    // 不自动触发下一个，让用户手动点击"继续"
  };

  const handleFinish = async () => {
    setIsProcessing(true);
    try {
      const summary = await generateSceneSummary(
        scene,
        performances,
        characters,
      );
      setGeneratedSummary(summary);
    } catch (error) {
      console.error("生成摘要失败:", error);
      setGeneratedSummary("生成摘要失败，请手动输入摘要。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!generatedSummary.trim()) {
      alert("请输入场景摘要");
      return;
    }
    setIsProcessing(true);
    try {
      await updateScene(scene.id, { summary: generatedSummary });
      setGeneratedSummary("");
      setStatus("completed");
      onPerformancesChange();
    } catch (error) {
      console.error("保存摘要失败:", error);
      alert("保存摘要失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipSummary = () => {
    setGeneratedSummary("");
    setStatus("completed");
    onPerformancesChange();
  };

  const handleClearHistory = async () => {
    if (!confirm("确定要清空当前场景的所有演出记录吗？")) return;
    try {
      await deletePerformancesBySceneId(scene.id);
      await loadPerformances();
      setCurrentRound(1);
      setStatus("idle");
    } catch (error) {
      console.error("清除历史失败:", error);
    }
  };

  const handleDeletePerformance = async (id: string) => {
    try {
      await deletePerformance(id);
      await loadPerformances();
      onPerformancesChange();
    } catch (error) {
      console.error("删除失败:", error);
    }
  };

  const handleDeleteRound = async (round: number) => {
    try {
      const roundPerfs = performances.filter((p) => p.round === round);
      for (const perf of roundPerfs) {
        await deletePerformance(perf.id);
      }
      await loadPerformances();
      onPerformancesChange();
    } catch (error) {
      console.error("删除轮次失败:", error);
    }
  };

  const handleClose = () => {
    onPerformancesChange();
    onClose();
  };

  const progress =
    totalRounds > 0 && isLoaded
      ? Math.round((currentRound / totalRounds) * 100)
      : 0;

  const currentRoundPlan = roundPlan.find((r) => r.round === currentRound);
  const currentRoundGoal = currentRoundPlan?.description || scene.goal;

  return (
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div class="w-full h-full max-w-7xl mx-auto p-2 md:p-4 flex flex-col">
        <div class="bg-dark-surface rounded-lg shadow-2xl flex flex-col h-full overflow-hidden">
          {/* 头部 */}
          <div class="shrink-0 p-3 md:p-4 border-b border-dark-accent">
            {/* 标题行 */}
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex-1 min-w-0">
                <h2 class="text-lg md:text-2xl font-bold gradient-text truncate">
                  🎬 {scene.name}
                </h2>
                <div class="text-xs md:text-sm text-gray-400 mt-1">
                  轮次：{currentRound} / {totalRounds}
                </div>
              </div>
              {/* 右侧按钮 - 移动端折叠 */}
              <div class="flex items-center gap-1 md:gap-2 shrink-0">
                <Button
                  onClick={handleClose}
                  variant="ghost"
                  size="sm"
                  class="px-2"
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* 工具栏 - 移动端单独一行 */}
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <Button
                onClick={() => {
                  if (confirm("确定要清空所有演出记录吗？"))
                    handleClearHistory();
                }}
                variant="secondary"
                size="sm"
                class="text-xs"
              >
                🗑️
              </Button>
              <ModelButton
                providers={providers}
                selectedProviderId={selectedProviderId}
                selectedModel={selectedModel}
                isThinkingModel={isThinkingModel}
                enableThinking={enableThinking}
                thinkingBudget={thinkingBudget}
                onConfirm={(config) => {
                  setSelectedProviderId(config.providerId);
                  setSelectedModel(config.model);
                  setIsThinkingModel(config.isThinkingModel);
                  setEnableThinking(config.enableThinking);
                  setThinkingBudget(config.thinkingBudget);
                }}
                size="sm"
              />
            </div>

            <p class="text-xs md:text-sm text-gray-400 mb-2 line-clamp-2">
              {scene.description}
            </p>

            {/* 当前轮次目标 */}
            {status === "performing" && currentRoundGoal && (
              <div class="bg-primary-600/20 border border-primary-500/30 rounded-lg px-3 py-2 mt-2">
                <div class="text-xs text-primary-300 mb-1">
                  🎯 第 {currentRound} 轮目标
                </div>
                <div class="text-sm text-white font-medium">
                  {currentRoundGoal}
                </div>
              </div>
            )}
            {status === "idle" && scene.goal && (
              <div class="text-xs text-primary-400 mt-2">
                🎯 场景目标：{scene.goal}
              </div>
            )}

            {/* 进度条 */}
            {totalRounds > 0 && (
              <div class="mt-2 h-1.5 md:h-2 bg-dark-accent rounded-full overflow-hidden">
                <div
                  class="h-full bg-linear-to-r from-primary-600 to-primary-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          {/* 演出记录区域 */}
          <div class="flex-1 overflow-y-auto p-2 md:p-4">
            <PerformanceList
              performances={performances}
              characters={characters}
              onDeletePerformance={handleDeletePerformance}
              onDeleteRound={handleDeleteRound}
            />
          </div>

          {/* 底部控制区域 */}
          <div class="shrink-0 border-t border-dark-accent">
            {/* 状态栏 */}
            <div class="flex flex-col md:flex-row md:items-center justify-between px-3 md:px-4 py-2 md:py-3 bg-dark-accent/20 gap-2">
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
                  <span class="text-xs md:text-sm text-green-400">
                    ✅ 演出完成
                  </span>
                )}

                {/* 当前轮到谁 */}
                {status === "performing" && (
                  <span class="text-xs md:text-sm text-gray-300">
                    {currentActor ? (
                      <>
                        🤖 <span class="text-white">{currentActor}</span>{" "}
                        生成中...
                      </>
                    ) : isUserTurn ? (
                      <>
                        👤 轮到{" "}
                        <span class="text-primary-300">
                          {currentPerformer?.characterName}
                        </span>
                      </>
                    ) : isAiTurn ? (
                      <>
                        🤖 等待{" "}
                        <span class="text-white">
                          {currentPerformer?.characterName}
                        </span>
                      </>
                    ) : (
                      <>✓ 本轮完成</>
                    )}
                  </span>
                )}
              </div>
              <div class="flex gap-2 justify-end">
                {status === "idle" && (
                  <Button
                    onClick={handleStart}
                    isLoading={isProcessing}
                    size="sm"
                  >
                    🎬 开始
                  </Button>
                )}
                {status === "performing" && isAiTurn && !currentActor && (
                  <Button
                    onClick={handleStart}
                    isLoading={isProcessing}
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
                  <Button
                    onClick={handleEndPerformance}
                    variant="primary"
                    size="sm"
                  >
                    🏁 结束演出
                  </Button>
                )}
                {status === "completed" && !generatedSummary && (
                  <Button
                    onClick={handleFinish}
                    isLoading={isProcessing}
                    variant="primary"
                    size="sm"
                  >
                    📝 生成总结
                  </Button>
                )}
                {status === "completed" && generatedSummary && (
                  <>
                    <Button
                      onClick={handleSkipSummary}
                      variant="ghost"
                      size="sm"
                    >
                      跳过
                    </Button>
                    <Button
                      onClick={handleSaveSummary}
                      isLoading={isProcessing}
                      size="sm"
                    >
                      💾 保存
                    </Button>
                  </>
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
                    />
                  ) : null;
                })()}
              </div>
            )}

            {/* AI 生成中提示 */}
            {status === "performing" &&
              (thinkingContent || streamingContent) && (
                <div class="px-2 md:px-4 py-2 border-t border-dark-accent/50">
                  {thinkingContent && isThinkingModel && enableThinking && (
                    <div class="bg-purple-900/20 rounded p-2 mb-2">
                      <div class="text-xs text-purple-300 mb-1">
                        🧠 思考中...
                      </div>
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
        </div>
      </div>

      {/* 摘要编辑弹窗 */}
      {status === "completed" && generatedSummary && (
        <div class="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
          <div class="bg-dark-surface rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] md:max-h-[80vh] overflow-hidden">
            <div class="p-3 md:p-4 border-b border-dark-accent">
              <h3 class="text-lg md:text-xl font-bold gradient-text">
                📝 场景摘要
              </h3>
              <p class="text-xs md:text-sm text-gray-400 mt-1">
                演出已完成，请确认或编辑场景摘要
              </p>
            </div>
            <div class="p-3 md:p-4 space-y-3 md:space-y-4 overflow-y-auto max-h-[60vh]">
              <div class="bg-dark-accent/30 rounded-lg p-2 md:p-3">
                <div class="text-xs md:text-sm text-gray-400">
                  已完成 {performances.length} 条表演记录，共 {totalRounds} 轮
                </div>
              </div>
              <div>
                <label class="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                  场景摘要（可编辑）
                </label>
                <textarea
                  class="w-full h-32 md:h-48 bg-dark-accent/30 border border-dark-accent rounded-lg p-2 md:p-3 text-xs md:text-sm text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={generatedSummary}
                  onInput={(e: any) => setGeneratedSummary(e.target.value)}
                  placeholder="输入场景摘要..."
                />
              </div>
              <div class="flex justify-between items-center pt-2">
                <Button onClick={handleSkipSummary} variant="ghost" size="sm">
                  跳过
                </Button>
                <Button
                  onClick={handleSaveSummary}
                  isLoading={isProcessing}
                  size="sm"
                >
                  💾 保存
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
