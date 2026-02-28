import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Card, Modal, TextArea } from "@components/ui/common";
import type { Room, Scene, Character, Performance } from "@/stores";
import {
  getPerformancesBySceneId,
  createPerformance,
  deletePerformancesBySceneId,
  getMaxRound,
} from "@/db/models/performances";
import { updateScene } from "@/db/models/scenes";
import { AIInputConfig } from "@components/ui/common";
import { createClient } from "@/lib/openai/client";
import { loadProviders } from "@/lib/openai/providers";
import { generateSceneSummary } from "@/lib/memory";

interface ScenePerformanceProps {
  scene: Scene;
  room: Room;
  characters: Character[];
  onBack: () => void;
}

export const ScenePerformance: FunctionalComponent<ScenePerformanceProps> = ({
  scene,
  room,
  characters,
  onBack,
}) => {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isAIInputOpen, setIsAIInputOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [providers, setProviders] = useState<any[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState("");

  useEffect(() => {
    loadProvidersData();
    loadPerformances();
  }, [scene.id]);

  const loadProvidersData = async () => {
    const loadedProviders = await loadProviders();
    setProviders(loadedProviders);
    const active = loadedProviders.find((p: any) => p.is_active);
    if (active) {
      setActiveProviderId(active.id);
    }
  };

  const loadPerformances = async () => {
    const perfs = await getPerformancesBySceneId(scene.id);
    setPerformances(perfs);
    const maxRound = getMaxRound(scene.id);
    setCurrentRound(maxRound);
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      // 使用内置函数生成摘要
      const summary = await generateSceneSummary(scene, performances, characters);
      setGeneratedSummary(summary);
      setShowSummaryModal(true);
    } catch (error) {
      console.error("生成摘要失败:", error);
      alert("生成摘要失败，请重试");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSaveSummary = async () => {
    try {
      await updateScene(scene.id, {
        summary: generatedSummary,
      });
      setShowSummaryModal(false);
      alert("摘要已保存");
    } catch (error) {
      console.error("保存摘要失败:", error);
      alert("保存摘要失败，请重试");
    }
  };

  const groupedPerformances = performances.reduce((acc, perf) => {
    if (!acc[perf.round]) {
      acc[perf.round] = [];
    }
    acc[perf.round].push(perf);
    return acc;
  }, {} as Record<number, Performance[]>);

  const handleUserAction = async () => {
    if (!userInput.trim()) return;

    setIsGenerating(true);
    try {
      const userChar = characters.find((c) => c.is_user);
      if (!userChar) {
        alert("请先创建用户角色");
        return;
      }

      // 创建用户表演记录
      await createPerformance({
        scene_id: scene.id,
        character_id: userChar.id,
        content: { dialogue: userInput },
        primary_type: 'dialogue',
        round: currentRound + 1,
        order: performances.length,
      });

      setUserInput("");
      await loadPerformances();

      // 触发 AI 响应
      await handleAIGenerate();
    } catch (error) {
      console.error("用户操作失败:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIGenerate = async () => {
    const aiChars = characters.filter((c) => !c.is_user);
    if (aiChars.length === 0) {
      alert("没有可用的 AI 角色");
      return;
    }

    setIsGenerating(true);
    try {
      const provider = providers.find((p) => p.id === activeProviderId);
      if (!provider) {
        alert("请先配置 AI Provider");
        return;
      }

      const client = createClient(provider);
      
      // 构建上下文
      const contextPrompt = buildContextPrompt(room, scene, characters, performances);
      
      const messages = [
        { role: "system", content: getSystemPrompt(scene, characters) },
        { role: "user", content: contextPrompt },
      ];

      const thinking =
        provider.supports_thinking
          ? {
              enabled: true,
              param_key: provider.thinking_param_key,
              type: provider.thinking_param_type,
              default: provider.thinking_param_default,
            }
          : undefined;

      const response = await client.chat(messages, {
        temperature: 0.7,
        max_tokens: 2048,
        thinking,
        model: provider.model || undefined,
      });

      // 解析 AI 响应并创建表演记录
      const aiChar = aiChars[0]; // 默认使用第一个 AI 角色
      await createPerformance({
        scene_id: scene.id,
        character_id: aiChar.id,
        content: { dialogue: response.content },
        primary_type: 'dialogue',
        round: currentRound + 1,
        order: performances.length + 1,
      });

      await loadPerformances();
    } catch (error) {
      console.error("AI 生成失败:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearPerformances = async () => {
    if (!confirm("确定要清空所有演出记录吗？")) return;
    
    await deletePerformancesBySceneId(scene.id);
    await loadPerformances();
  };

  return (
    <div class="h-full flex flex-col">
      {/* 场景信息 */}
      <Card class="p-4 mb-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-bold text-white">{scene.name}</h2>
          <div class="flex gap-2">
            <Button
              onClick={handleGenerateSummary}
              variant="secondary"
              size="sm"
              isLoading={isGeneratingSummary}
            >
              📝 生成摘要
            </Button>
            <Button
              onClick={handleClearPerformances}
              variant="ghost"
              size="sm"
            >
              🗑️ 清空记录
            </Button>
            <Button onClick={onBack} variant="secondary" size="sm">
              ← 返回列表
            </Button>
          </div>
        </div>
        <p class="text-sm text-gray-400 mb-2">{scene.description}</p>
        {scene.goal && (
          <div class="text-sm">
            <span class="text-primary-400">目标：</span>
            <span class="text-gray-300">{scene.goal}</span>
          </div>
        )}
        {scene.summary && (
          <div class="text-sm mt-2 p-2 bg-dark-accent/30 rounded">
            <span class="text-primary-400 font-medium">摘要：</span>
            <span class="text-gray-300 ml-2">{scene.summary}</span>
          </div>
        )}
      </Card>

      {/* 演出记录区域 */}
      <div class="flex-1 overflow-y-auto mb-4 space-y-4">
        {performances.length === 0 ? (
          <div class="text-center py-16 text-gray-400">
            <svg
              class="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p>暂无演出记录</p>
            <p class="text-sm mt-2">开始第一轮对话吧！</p>
          </div>
        ) : (
          Object.entries(groupedPerformances).map(([round, perfs]) => (
            <div key={round} class="space-y-2">
              <div class="text-center text-sm text-gray-500 my-4">
                ─── 第 {round} 轮 ───
              </div>
              {perfs.map((perf) => {
                const character = characters.find((c) => c.id === perf.character_id);
                return (
                  <Card key={perf.id} class="p-4">
                    <div class="flex items-start gap-3">
                      <div class="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center text-xl flex-shrink-0">
                        {character?.is_user ? "👤" : "🤖"}
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <span class="font-semibold text-white">
                            {character?.name || "未知角色"}
                          </span>
                          <span class="text-xs px-2 py-0.5 rounded bg-dark-accent text-gray-300">
                            {perf.type}
                          </span>
                        </div>
                        <p class="text-gray-300 whitespace-pre-wrap">
                          {perf.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* 输入区域 */}
      <Card class="p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-gray-400">
            当前轮次：<span class="text-white font-medium">{currentRound}</span>
            {scene.max_rounds && (
              <span class="text-gray-500"> / 最大 {scene.max_rounds} 轮</span>
            )}
          </div>
          <div class="flex gap-2">
            <Button
              onClick={() => setIsAIInputOpen(true)}
              variant="secondary"
              disabled={isGenerating}
            >
              🤖 AI 生成
            </Button>
          </div>
        </div>
        <TextArea
          value={userInput}
          onInput={(e) => setUserInput((e.target as HTMLTextAreaElement).value)}
          placeholder="输入你的台词或动作..."
          rows={3}
          class="mb-2"
        />
        <div class="flex justify-end">
          <Button
            onClick={handleUserAction}
            isLoading={isGenerating}
            disabled={!userInput.trim()}
          >
            {isGenerating ? "处理中..." : "发送"}
          </Button>
        </div>
      </Card>

      {/* AI 输入配置模态框 */}
      <AIInputConfig
        isOpen={isAIInputOpen}
        onClose={() => setIsAIInputOpen(false)}
        onGenerate={(result) => {
          console.log("AI 生成结果:", result);
          // 这里可以处理自定义 AI 生成
        }}
        providers={providers}
        activeProviderId={activeProviderId}
        mode="custom"
        presetPrompt={`为场景"${scene.name}"生成一段表演内容。场景描述：${scene.description}`}
      />

      {/* 摘要查看/编辑模态框 */}
      <Modal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title="📝 场景摘要"
        size="lg"
      >
        <div class="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              生成的摘要
            </label>
            <TextArea
              value={generatedSummary}
              onInput={(e) => setGeneratedSummary((e.target as HTMLTextAreaElement).value)}
              placeholder="摘要内容..."
              rows={6}
            />
          </div>

          <div class="bg-dark-accent/30 p-3 rounded-lg">
            <p class="text-xs text-gray-400">
              💡 提示：摘要会帮助追踪场景的进展和关键剧情，也可以用于 AI 上下文。
            </p>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-dark-accent">
            <Button onClick={() => setShowSummaryModal(false)} variant="secondary">
              取消
            </Button>
            <Button onClick={handleSaveSummary}>
              保存摘要
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

function buildContextPrompt(
  room: Room,
  scene: Scene,
  characters: Character[],
  performances: Performance[]
): string {
  const characterInfo = characters
    .map(
      (c) =>
        `- ${c.name} (${c.is_user ? "用户" : "AI"}): ${c.background} [风格：${c.dialogue_style}]`
    )
    .join("\n");

  const recentPerformances = performances.slice(-5);
  const historyInfo =
    recentPerformances.length > 0
      ? recentPerformances
          .map(
            (p) =>
              `- ${characters.find((c) => c.id === p.character_id)?.name || "未知"}: ${p.content}`
          )
          .join("\n")
      : "暂无对话历史";

  return `
【故事背景】
- 名称：${room.name}
- 设定：${room.setting}
- 世界观：${room.worldview || "未设置"}
- 基调：${room.tone || "未设置"}

【当前场景】
- 名称：${scene.name}
- 描述：${scene.description}
- 目标：${scene.goal || "未设置"}

【角色信息】
${characterInfo}

【对话历史】
${historyInfo}

请根据以上信息，为当前场景生成合适的表演内容。
`;
}

function getSystemPrompt(scene: Scene, characters: Character[]): string {
  const userChar = characters.find((c) => c.is_user);
  const aiChars = characters.filter((c) => !c.is_user);

  return `你是一个专业的互动剧本表演系统。请根据场景设定和角色信息，为 AI 角色生成合适的表演内容。

当前场景：${scene.name}
场景描述：${scene.description}
场景目标：${scene.goal || "推进剧情"}

用户角色：${userChar?.name || "未设置"}
AI 角色：${aiChars.map((c) => c.name).join(", ")}

请：
1. 保持角色的一致性
2. 符合场景设定和剧情发展
3. 回应用户角色的表演
4. 推动剧情向场景目标发展

直接返回表演内容，不需要额外说明。`;
}
