/**
 * 房间级摘要生成器组件
 *
 * 基于所有场景的演出记录生成房间级别的全局摘要
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Modal, Card, TextArea } from "@components/ui/common";
import type { Room, Scene, Character, Performance } from "@/stores";
import { getScenesByRoomId, getPerformancesBySceneId } from "@/db";
import { createClient } from "@/lib/openai/client";
import { generateRoomSummary } from "@/lib/memory";
import { updateRoom } from "@/db/models/rooms";

interface RoomSummaryGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onSummaryGenerated: (summary: string) => void;
}

interface SceneSummaryData {
  scene: Scene;
  summary: string;
  performances: Performance[];
}

export const RoomSummaryGenerator: FunctionalComponent<
  RoomSummaryGeneratorProps
> = ({ isOpen, onClose, room, onSummaryGenerated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [sceneSummaries, setSceneSummaries] = useState<SceneSummaryData[]>([]);
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState("");

  // 加载 Provider 和场景数据
  useEffect(() => {
    if (isOpen) {
      loadProviders();
      loadSceneData();
    }
  }, [isOpen, room.id]);

  const loadProviders = () => {
    try {
      const data = localStorage.getItem("ai-providers");
      const loadedProviders = data ? JSON.parse(data) : [];
      setProviders(loadedProviders);
      const active = loadedProviders.find((p: any) => p.is_active);
      if (active) {
        setSelectedProviderId(active.id);
        const model = active.custom_models?.[0] || active.model;
        if (model) setSelectedModel(model);
      }
    } catch (error) {
      console.error("加载 Provider 配置失败:", error);
    }
  };

  const loadSceneData = async () => {
    setIsLoading(true);
    try {
      const scenes = await getScenesByRoomId(room.id);
      const sceneData: SceneSummaryData[] = [];

      for (const scene of scenes) {
        const performances = await getPerformancesBySceneId(scene.id);
        sceneData.push({
          scene,
          summary: scene.summary || "",
          performances,
        });
      }

      setSceneSummaries(sceneData);
    } catch (error) {
      console.error("加载场景数据失败:", error);
      setError("加载场景数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 使用 AI 生成房间摘要
  const handleGenerateSummary = async () => {
    if (!selectedProviderId || sceneSummaries.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      const provider = providers.find((p) => p.id === selectedProviderId);
      if (!provider) throw new Error("Provider 不存在");

      const model =
        selectedModel || provider.custom_models?.[0] || provider.model;
      if (!model) throw new Error("未选择模型");

      const client = createClient(provider);

      // 构建场景信息
      const scenesInfo = sceneSummaries
        .map((s, i) => {
          const perfCount = s.performances.length;
          const maxRound =
            perfCount > 0 ? Math.max(...s.performances.map((p) => p.round)) : 0;
          return `${i + 1}. ${s.scene.name} - ${s.summary || `已完成${perfCount}条演出记录，共${maxRound}轮`}`;
        })
        .join("\n");

      const prompt = `请为以下互动剧本生成全局摘要：

【剧本信息】
- 名称：${room.name}
- 设定：${room.setting}
- 剧情大纲：${room.plot_summary || "未设置"}
- 世界观：${room.worldview || "未设置"}
- 基调：${room.tone || "未设置"}

【场景进展】
${scenesInfo}

【已完成场景数】${sceneSummaries.filter((s) => s.performances.length > 0).length} / ${sceneSummaries.length}

请生成一段简洁的摘要（200 字以内），包括：
1. 当前整体剧情进展
2. 主要角色的发展
3. 已完成的关键剧情点
4. 待完成的场景和目标

返回纯文本，不要有 JSON 格式。`;

      const messages = [
        {
          role: "system",
          content: "你是专业的剧本编辑助手，擅长总结剧情进展。",
        },
        { role: "user", content: prompt },
      ];

      const response = await client.chat(messages, {
        temperature: 0.7,
        max_tokens: 512,
        model,
      });

      setGeneratedSummary(response.content);
    } catch (err) {
      console.error("生成摘要失败:", err);
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  // 保存摘要到房间
  const handleSave = async () => {
    if (!generatedSummary.trim()) return;

    try {
      await updateRoom(room.id, {
        current_performance_summary: generatedSummary,
      });
      onSummaryGenerated(generatedSummary);
      onClose();
    } catch (error) {
      console.error("保存摘要失败:", error);
      setError("保存失败");
    }
  };

  // 统计信息
  const totalScenes = sceneSummaries.length;
  const completedScenes = sceneSummaries.filter(
    (s) => s.performances.length > 0,
  ).length;
  const totalPerformances = sceneSummaries.reduce(
    (sum, s) => sum + s.performances.length,
    0,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📊 生成房间摘要"
      size="xl"
      footer={
        <div class="flex justify-end gap-3 ">
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button
            onClick={handleGenerateSummary}
            isLoading={isGenerating || isLoading}
            disabled={!selectedProviderId || sceneSummaries.length === 0}
          >
            {isGenerating ? "生成中..." : "✨ 生成摘要"}
          </Button>
          {generatedSummary && (
            <Button onClick={handleSave} variant="primary">
              保存
            </Button>
          )}
        </div>
      }
    >
      <div class="space-y-4">
        {/* 统计信息 */}
        <Card class="p-4 bg-dark-accent/30">
          <h3 class="text-lg font-semibold text-white mb-3">📈 演出统计</h3>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-2xl font-bold text-primary-400">
                {totalScenes}
              </div>
              <div class="text-xs text-gray-400">总场景数</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-green-400">
                {completedScenes}
              </div>
              <div class="text-xs text-gray-400">已完成</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-purple-400">
                {totalPerformances}
              </div>
              <div class="text-xs text-gray-400">演出记录</div>
            </div>
          </div>
        </Card>

        {/* 场景列表 */}
        {isLoading ? (
          <div class="text-center py-8 text-gray-400">加载中...</div>
        ) : sceneSummaries.length === 0 ? (
          <div class="text-center py-8 text-gray-400">
            <p>暂无场景</p>
            <p class="text-sm">先添加一些场景再进行演出吧</p>
          </div>
        ) : (
          <div class="space-y-2 max-h-60 overflow-y-auto">
            <h4 class="text-sm font-medium text-gray-300 mb-2">场景详情</h4>
            {sceneSummaries.map((s) => (
              <Card key={s.scene.id} class="p-3">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="font-medium text-white text-sm">
                      {s.scene.name}
                    </div>
                    <div class="text-xs text-gray-400 mt-1">
                      {s.summary ||
                        (s.performances.length > 0
                          ? `已完成 ${s.performances.length} 条记录`
                          : "未进行演出")}
                    </div>
                  </div>
                  <div class="text-xs text-gray-500">
                    {s.performances.length}条
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Provider 选择 */}
        {providers.length > 0 && (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              选择 AI 模型
            </label>
            <select
              value={selectedProviderId || ""}
              onChange={(e) => {
                const providerId = (e.target as HTMLSelectElement).value;
                setSelectedProviderId(providerId);
                const provider = providers.find((p) => p.id === providerId);
                if (provider) {
                  const model = provider.custom_models?.[0] || provider.model;
                  if (model) setSelectedModel(model);
                }
              }}
              class="w-full bg-dark-surface border border-dark-accent rounded-lg px-3 py-2 text-sm text-white"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.custom_models?.[0] || p.model}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 生成的摘要 */}
        {generatedSummary && (
          <Card class="p-4 bg-green-900/20 border-green-500/30">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-lg">✨</span>
                <label class="block text-sm font-medium text-green-300">
                  生成的摘要
                </label>
              </div>
              <Button
                onClick={() => setGeneratedSummary("")}
                size="sm"
                variant="ghost"
              >
                清除
              </Button>
            </div>
            <TextArea
              value={generatedSummary}
              onInput={(e) =>
                setGeneratedSummary((e.target as HTMLTextAreaElement).value)
              }
              rows={6}
              class="w-full resize-none"
            />
          </Card>
        )}

        {error && (
          <div class="bg-red-900/30 border border-red-500 text-red-300 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
