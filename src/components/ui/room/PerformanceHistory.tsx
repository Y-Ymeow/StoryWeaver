/**
 * 演出历史查看组件
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Modal, Card } from "@components/ui/common";
import type { Room, Scene, Character, Performance } from "@/stores";
import {
  getAllPerformances,
  getScenesByRoomId,
  getCharactersByRoomId,
} from "@/db";

interface PerformanceWithDetails extends Performance {
  characterName?: string;
  sceneName?: string;
}

interface ParsedContent {
  dialogue?: string;
  action?: string;
  thought?: string;
  emotion?: string;
}

interface PerformanceHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
}

/**
 * 解析 JSON 内容
 */
function parseContent(content: string): ParsedContent {
  try {
    return JSON.parse(content);
  } catch {
    // 兼容旧数据格式
    return { dialogue: content };
  }
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    dialogue: "💬 对话",
    action: "🎯 动作",
    thought: "💭 心理",
    emotion: "❤️ 表情",
  };
  return labels[type] || type;
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    dialogue: "bg-blue-600/30 text-blue-300",
    action: "bg-green-600/30 text-green-300",
    thought: "bg-purple-600/30 text-purple-300",
    emotion: "bg-pink-600/30 text-pink-300",
  };
  return colors[type] || "bg-gray-600/30 text-gray-300";
};

export const PerformanceHistory: FunctionalComponent<
  PerformanceHistoryProps
> = ({ isOpen, onClose, room }) => {
  const [performances, setPerformances] = useState<PerformanceWithDetails[]>(
    [],
  );
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [filterSceneId, setFilterSceneId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, room.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allPerformances, loadedScenes, loadedCharacters] =
        await Promise.all([
          getAllPerformances(),
          getScenesByRoomId(room.id),
          getCharactersByRoomId(room.id),
        ]);

      // 只加载当前房间的演出记录
      const sceneIds = new Set(loadedScenes.map((s) => s.id));
      const roomPerformances = allPerformances.filter((p) =>
        sceneIds.has(p.scene_id),
      );

      // 添加角色名称和场景名称
      const enriched = roomPerformances.map((p) => ({
        ...p,
        characterName: loadedCharacters.find((c) => c.id === p.character_id)
          ?.name,
        sceneName: loadedScenes.find((s) => s.id === p.scene_id)?.name,
      }));

      setPerformances(enriched);
      setScenes(loadedScenes);
      setCharacters(loadedCharacters);
    } catch (error) {
      console.error("加载演出历史失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPerformances = performances.filter((p) => {
    if (filterSceneId !== "all" && p.scene_id !== filterSceneId) return false;
    return true;
  });

  const groupedByScene = filteredPerformances.reduce(
    (acc, perf) => {
      if (!acc[perf.scene_id]) {
        acc[perf.scene_id] = [];
      }
      acc[perf.scene_id].push(perf);
      return acc;
    },
    {} as Record<string, PerformanceWithDetails[]>,
  );

  const groupedByRound = (performances: PerformanceWithDetails[]) => {
    return performances.reduce(
      (acc, perf) => {
        if (!acc[perf.round]) {
          acc[perf.round] = [];
        }
        acc[perf.round].push(perf);
        return acc;
      },
      {} as Record<number, PerformanceWithDetails[]>,
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📜 演出历史"
      size="xl"
      footer={
        <div class="flex justify-end ">
          <Button onClick={onClose}>关闭</Button>
        </div>
      }
    >
      <div class="space-y-4">
        {/* 过滤器 */}
        <div class="flex flex-wrap gap-4 p-4 bg-dark-accent/30 rounded-lg">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              场景
            </label>
            <select
              value={filterSceneId}
              onChange={(e) =>
                setFilterSceneId((e.target as HTMLSelectElement).value)
              }
              class="bg-dark-surface border border-dark-accent rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">全部场景</option>
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.name}
                </option>
              ))}
            </select>
          </div>

          <div class="flex-1 flex items-end">
            <div class="text-sm text-gray-400">
              共{" "}
              <span class="text-white font-medium">
                {filteredPerformances.length}
              </span>{" "}
              条记录
            </div>
          </div>
        </div>

        {/* 演出记录列表 */}
        {isLoading ? (
          <div class="text-center py-8 text-gray-400">加载中...</div>
        ) : filteredPerformances.length === 0 ? (
          <div class="text-center py-8 text-gray-400">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>暂无演出记录</p>
          </div>
        ) : (
          <div class="space-y-6">
            {Object.entries(groupedByScene).map(
              ([sceneId, scenePerformances]) => {
                const scene = scenes.find((s) => s.id === sceneId);
                const byRound = groupedByRound(scenePerformances);

                return (
                  <div key={sceneId} class="space-y-3">
                    <div class="flex items-center gap-2 py-2 border-b border-dark-accent">
                      <h3 class="text-lg font-semibold text-white">
                        🎬 {scene?.name || "未知场景"}
                      </h3>
                      <span class="text-xs text-gray-400">
                        ({scenePerformances.length}条记录)
                      </span>
                    </div>

                    {Object.entries(byRound)
                      .reverse()
                      .map(([round, roundPerformances]) => (
                        <div key={round} class="ml-4 space-y-2">
                          <div class="text-sm text-gray-500">
                            ─── 第{round}轮 ───
                          </div>
                          {roundPerformances.map((perf) => {
                            const parsed = parseContent(perf.content);
                            const contentItems = Object.entries(parsed).filter(
                              ([_, v]) => v,
                            );

                            return (
                              <Card key={perf.id} class="p-3">
                                <div class="flex items-start gap-3">
                                  <div class="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center text-lg flex-shrink-0">
                                    {characters.find(
                                      (c) => c.id === perf.character_id,
                                    )?.is_user
                                      ? "👤"
                                      : "🤖"}
                                  </div>
                                  <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                                      <span class="font-semibold text-white text-sm">
                                        {perf.characterName || "未知角色"}
                                      </span>
                                      <span class="text-xs text-gray-500">
                                        {new Date(
                                          perf.created_at,
                                        ).toLocaleString("zh-CN")}
                                      </span>
                                    </div>

                                    {/* 气泡式内容显示 */}
                                    <div class="flex flex-wrap gap-2">
                                      {parsed.dialogue && (
                                        <div class="bg-blue-600/20 border border-blue-500/30 rounded-lg p-2 flex-1 min-w-[200px]">
                                          <div class="text-xs text-blue-300 mb-1">
                                            💬 对话
                                          </div>
                                          <p class="text-sm text-gray-200 whitespace-pre-wrap">
                                            {parsed.dialogue}
                                          </p>
                                        </div>
                                      )}
                                      {parsed.action && (
                                        <div class="bg-green-600/20 border border-green-500/30 rounded-lg p-2 flex-1 min-w-[200px]">
                                          <div class="text-xs text-green-300 mb-1">
                                            🎯 动作
                                          </div>
                                          <p class="text-sm text-gray-200 whitespace-pre-wrap">
                                            {parsed.action}
                                          </p>
                                        </div>
                                      )}
                                      {parsed.thought && (
                                        <div class="bg-purple-600/20 border border-purple-500/30 rounded-lg p-2 flex-1 min-w-[200px]">
                                          <div class="text-xs text-purple-300 mb-1">
                                            💭 心理
                                          </div>
                                          <p class="text-sm text-gray-200 whitespace-pre-wrap">
                                            {parsed.thought}
                                          </p>
                                        </div>
                                      )}
                                      {parsed.emotion && (
                                        <div class="bg-pink-600/20 border border-pink-500/30 rounded-lg p-2 flex-1 min-w-[200px]">
                                          <div class="text-xs text-pink-300 mb-1">
                                            ❤️ 表情
                                          </div>
                                          <p class="text-sm text-gray-200 whitespace-pre-wrap">
                                            {parsed.emotion}
                                          </p>
                                        </div>
                                      )}
                                      {contentItems.length === 0 && (
                                        <p class="text-sm text-gray-400 italic">
                                          无内容
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
