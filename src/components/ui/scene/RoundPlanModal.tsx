import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Modal, Input, Card, ModelButton } from "@components/ui/common";
import type { Room, Character } from "@/stores";
import type { ProviderConfig } from "@/stores/types";

// 轮次计划类型
interface RoundPlan {
  round: number;
  description: string;
  goal?: string;
  turns: {
    characterId: string;
    characterName: string;
    isUser: boolean;
    isTemp?: boolean;
    types: string[];
    lineHint?: string;
  }[];
}

// 场景出场角色设置
interface SceneCharacter {
  id: string;
  name: string;
  isUser: boolean;
  isInScene: boolean;
}

// 预设临时角色
const TEMP_CHARACTER_PRESETS = [
  { name: "服务员", background: "餐厅/咖啡店服务员" },
  { name: "店员", background: "商店店员" },
  { name: "保安", background: "大楼/小区保安" },
  { name: "司机", background: "出租车/网约车司机" },
  { name: "路人甲", background: "路过的人" },
  { name: "同事", background: "工作同事" },
  { name: "朋友", background: "共同朋友" },
  { name: "陌生人", background: "不认识的人" },
];

interface RoundPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomContext: Room;
  characters: Character[];
  sceneName: string;
  sceneDescription: string;
  sceneGoal: string;
  maxRounds: number;
  roundPlans: RoundPlan[];
  onRoundPlansChange: (plans: RoundPlan[]) => void;
  providers: ProviderConfig[];
  selectedProviderId: string | null;
  selectedModel: string;
  isThinkingModel: boolean;
  enableThinking: boolean;
  thinkingBudget: number;
  isGenerating: boolean;
  streamingContent?: string;
  thinkingContent?: string;
  onProviderChange: (config: {
    providerId: string | null;
    model: string;
    isThinkingModel: boolean;
    enableThinking: boolean;
    thinkingBudget: number;
  }) => void;
  onGenerate: (params: {
    sceneCharacters: SceneCharacter[];
    keywords: string[];
  }) => Promise<void>;
}

export const RoundPlanModal: FunctionalComponent<RoundPlanModalProps> = ({
  isOpen,
  onClose,
  characters,
  maxRounds,
  roundPlans,
  onRoundPlansChange,
  providers,
  selectedProviderId,
  selectedModel,
  isThinkingModel,
  enableThinking,
  thinkingBudget,
  isGenerating,
  streamingContent = "",
  thinkingContent = "",
  onProviderChange,
  onGenerate,
}) => {
  const [sceneCharacters, setSceneCharacters] = useState<SceneCharacter[]>([]);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [showTempCharInput, setShowTempCharInput] = useState(false);
  const [tempCharName, setTempCharName] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [showKeywordsInput, setShowKeywordsInput] = useState(false);
  const [editingRoundIndex, setEditingRoundIndex] = useState<number | null>(null);

  // 初始化出场角色
  useEffect(() => {
    if (isOpen && characters.length > 0) {
      setSceneCharacters(
        characters.map((c) => ({
          id: c.id,
          name: c.name,
          isUser: c.is_user,
          isInScene: c.is_user, // 默认用户角色出场
        })),
      );
    }
  }, [isOpen, characters]);

  // 手动添加轮次
  const handleAddRound = () => {
    const newRound: RoundPlan = {
      round: roundPlans.length + 1,
      description: `第${roundPlans.length + 1}场`,
      goal: "",
      turns: [],
    };
    onRoundPlansChange([...roundPlans, newRound]);
  };

  // 删除轮次
  const handleDeleteRound = (index: number) => {
    const newRounds = roundPlans.filter((_, i) => i !== index);
    newRounds.forEach((r, i) => (r.round = i + 1));
    onRoundPlansChange(newRounds);
  };

  // 更新轮次
  const handleUpdateRound = (index: number, updates: Partial<RoundPlan>) => {
    const newRounds = [...roundPlans];
    newRounds[index] = { ...newRounds[index], ...updates };
    onRoundPlansChange(newRounds);
  };

  // 添加表演到轮次（只使用出场角色）
  const handleAddPerformance = (
    roundIndex: number,
    character: SceneCharacter,
  ) => {
    const newRounds = [...roundPlans];
    newRounds[roundIndex].turns.push({
      characterId: character.id,
      characterName: character.name,
      isUser: character.isUser,
      isTemp: false,
      types: ["dialogue"],
      lineHint: "",
    });
    onRoundPlansChange(newRounds);
  };

  // 添加临时角色表演
  const handleAddTempPerformance = (roundIndex: number, charName: string) => {
    const newRounds = [...roundPlans];
    newRounds[roundIndex].turns.push({
      characterId: `temp_${Date.now()}`,
      characterName: charName,
      isUser: false,
      isTemp: true,
      types: ["dialogue"],
      lineHint: "",
    });
    onRoundPlansChange(newRounds);
  };

  // 删除表演
  const handleDeletePerformance = (roundIndex: number, perfIndex: number) => {
    const newRounds = [...roundPlans];
    newRounds[roundIndex].turns.splice(perfIndex, 1);
    onRoundPlansChange(newRounds);
  };

  // 更新表演类型
  const handleUpdatePerformanceTypes = (
    roundIndex: number,
    perfIndex: number,
    types: string[],
  ) => {
    const newRounds = [...roundPlans];
    newRounds[roundIndex].turns[perfIndex].types = types;
    onRoundPlansChange(newRounds);
  };

  // 更新台词建议
  const handleUpdateLineHint = (
    roundIndex: number,
    perfIndex: number,
    lineHint: string,
  ) => {
    const newRounds = [...roundPlans];
    newRounds[roundIndex].turns[perfIndex].lineHint = lineHint;
    onRoundPlansChange(newRounds);
  };

  // 处理 AI 生成轮次计划
  const handleGenerate = async () => {
    // 检查是否有出场角色
    const selectedChars = sceneCharacters.filter((c) => c.isInScene);
    if (selectedChars.length === 0) {
      alert("请至少选择一个出场角色");
      setShowCharacterSelect(true);
      return;
    }

    // 传递生成轮数
    await onGenerate({
      sceneCharacters,
      keywords,
    });
  };

  // 关闭时重置状态
  const handleClose = () => {
    if (isGenerating) return;
    setShowCharacterSelect(false);
    setShowTempCharInput(false);
    setTempCharName("");
    setShowKeywordsInput(false);
    setEditingRoundIndex(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="📋 安排轮次"
      size="xl"
      footer={
        <div class="flex justify-end gap-3">
          <Button
            onClick={handleClose}
            variant="secondary"
          >
            完成
          </Button>
        </div>
      }
    >
      <div class="space-y-4">
        <div class="bg-dark-accent/30 p-3 rounded-lg">
          <p class="text-sm text-gray-300">设置出场角色并生成轮次计划。</p>
        </div>

        {/* 出场角色选择 */}
        <Card>
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-semibold text-white">
              🎭 出场角色 ({sceneCharacters.filter((c) => c.isInScene).length}
              人)
            </h4>
            <Button
              onClick={() => setShowCharacterSelect(!showCharacterSelect)}
              size="sm"
              variant="secondary"
            >
              {showCharacterSelect ? "收起" : "选择角色"}
            </Button>
          </div>

          {showCharacterSelect && (
            <div class="flex flex-wrap gap-2">
              {sceneCharacters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => {
                    const newChars = sceneCharacters.map((c) =>
                      c.id === char.id
                        ? { ...c, isInScene: !c.isInScene }
                        : c,
                    );
                    setSceneCharacters(newChars);
                  }}
                  class={`px-3 py-1 rounded text-sm transition-colors ${
                    char.isInScene
                      ? "bg-primary-600 text-white"
                      : "bg-dark-surface text-gray-300 hover:bg-dark-accent"
                  }`}
                >
                  {char.isUser ? "👤" : "🤖"} {char.name}
                </button>
              ))}
            </div>
          )}

          {!showCharacterSelect && (
            <div class="flex flex-wrap gap-2">
              {sceneCharacters
                .filter((c) => c.isInScene)
                .map((char) => (
                  <span
                    key={char.id}
                    class="px-2 py-1 bg-primary-600/30 text-primary-300 rounded text-sm"
                  >
                    {char.isUser ? "👤" : "🤖"} {char.name}
                  </span>
                ))}
            </div>
          )}
        </Card>

        {/* AI 生成区域 */}
        <Card>
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-semibold text-white">🤖 AI 快速生成</h4>
            <ModelButton
              providers={providers}
              selectedProviderId={selectedProviderId}
              selectedModel={selectedModel}
              isThinkingModel={isThinkingModel}
              enableThinking={enableThinking}
              thinkingBudget={thinkingBudget}
              onConfirm={onProviderChange}
              size="sm"
            />
          </div>

          {/* 关键词控制 */}
          <div class="mb-3">
            <div class="flex items-center gap-2 mb-2">
              <Button
                onClick={() => setShowKeywordsInput(!showKeywordsInput)}
                size="sm"
                variant={keywords.length > 0 ? "primary" : "secondary"}
              >
                🏷️ 关键词控制{" "}
                {keywords.length > 0 ? `(${keywords.length})` : ""}
              </Button>
              {keywords.length > 0 && (
                <Button
                  onClick={() => setKeywords([])}
                  size="sm"
                  variant="ghost"
                >
                  清空
                </Button>
              )}
            </div>

            {showKeywordsInput && (
              <div class="space-y-2">
                <p class="text-xs text-gray-400">
                  为每场戏设置关键词，AI 会根据关键词生成剧情。留空则让 AI
                  自由发挥。
                </p>
                <div class="space-y-2">
                  {Array.from({ length: maxRounds }).map((_, i) => (
                    <div
                      key={i}
                      class="flex max-md:flex-col md:items-center gap-2"
                    >
                      <span class="text-xs text-gray-500 w-16">
                        第{i + 1}场
                      </span>
                      <input
                        type="text"
                        value={keywords[i] || ""}
                        onInput={(e) => {
                          const newKeywords = [...keywords];
                          newKeywords[i] = (
                            e.target as HTMLInputElement
                          ).value;
                          setKeywords(newKeywords);
                        }}
                        placeholder={`第${i + 1}场关键词（如：初次相遇、建立信任）`}
                        class="flex-1 bg-dark-surface border border-dark-accent rounded px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {keywords[i] && (
                        <button
                          onClick={() => {
                            const newKeywords = keywords.filter(
                              (_, idx) => idx !== i,
                            );
                            setKeywords(newKeywords);
                          }}
                          class="text-gray-400 hover:text-red-400"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div class="flex max-md:flex-col-reverse md:items-center gap-2">
            <Button
              onClick={handleGenerate}
              isLoading={isGenerating}
              disabled={!selectedProviderId || !selectedModel}
              size="sm"
            >
              生成轮次计划
            </Button>
            <span class="text-sm text-gray-400">
              当前：
              {providers.find((p) => p.id === selectedProviderId)?.name ||
                "未选择"}{" "}
              - {selectedModel || "未选择"}
            </span>
          </div>

          {(isGenerating || streamingContent || thinkingContent) && (
            <div class="mt-3 space-y-2">
              {thinkingContent && enableThinking && (
                <div class="rounded-lg border border-purple-500/30 bg-purple-900/20 p-3">
                  <div class="text-xs text-purple-300 mb-1">🧠 思考中...</div>
                  <div class="text-xs text-purple-200/80 whitespace-pre-wrap max-h-28 overflow-y-auto font-mono">
                    {thinkingContent}
                  </div>
                </div>
              )}
              <div class="rounded-lg border border-dark-accent bg-dark-accent/30 p-3">
                <div class="text-xs text-gray-400 mb-1">✨ 流式输出</div>
                <div class="text-sm text-gray-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {streamingContent || "正在生成轮次..."}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 轮次列表 */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-white">手动编辑</h4>
            <div class="flex gap-2">
              <Button
                onClick={() => {
                  if (confirm("确定要清空所有轮次吗？")) {
                    onRoundPlansChange([]);
                  }
                }}
                size="sm"
                variant="ghost"
              >
                🗑️ 清空
              </Button>
              <Button onClick={handleAddRound} size="sm">
                + 添加场次
              </Button>
            </div>
          </div>

          {roundPlans.length === 0 ? (
            <div class="text-center py-8 text-gray-400">
              暂无轮次，点击"添加场次"或使用 AI 生成
            </div>
          ) : (
            roundPlans.map((round, roundIndex) => (
              <Card key={round.round}>
                <div class="space-y-3">
                  {/* 轮次头部 */}
                  <div class="flex items-center justify-between max-md:items-end">
                    <div class="flex max-md:flex-wrap md:items-center gap-2">
                      <span class="font-semibold text-white max-md:w-full max-md:block">
                        第{round.round}场
                      </span>
                      <Input
                        value={round.description}
                        onInput={(e) =>
                          handleUpdateRound(roundIndex, {
                            description: (e.target as HTMLInputElement).value,
                          })
                        }
                        placeholder="剧情描述"
                        class="w-64 text-sm"
                      />
                    </div>
                    <Button
                      onClick={() => handleDeleteRound(roundIndex)}
                      size="sm"
                      variant="ghost"
                    >
                      🗑️
                    </Button>
                  </div>

                  {/* 本轮目标 */}
                  <div class="ml-4">
                    <label class="block text-xs text-gray-400 mb-1">
                      🎯 本轮目标（可选）
                    </label>
                    <Input
                      value={round.goal || ""}
                      onInput={(e) =>
                        handleUpdateRound(roundIndex, {
                          goal: (e.target as HTMLInputElement).value,
                        })
                      }
                      placeholder="如：建立初步信任，或留空让 AI 自由发挥"
                      class="w-full text-sm"
                    />
                  </div>

                  {/* 表演列表 */}
                  <div class="space-y-2 ml-4">
                    {round.turns.map((perf, perfIndex) => (
                      <div
                        key={perfIndex}
                        class="p-3 bg-dark-surface rounded"
                      >
                        {/* 第一行：角色和类型 */}
                        <div class="flex items-center gap-2 mb-2">
                          <span class="text-lg">
                            {perf.isUser ? "👤" : "🤖"}
                          </span>
                          <span class="font-medium text-white flex-1">
                            {perf.characterName}
                          </span>
                          <select
                            value={perf.types[0] || "dialogue"}
                            onChange={(e) =>
                              handleUpdatePerformanceTypes(
                                roundIndex,
                                perfIndex,
                                [(e.target as HTMLSelectElement).value],
                              )
                            }
                            class="px-2 py-1 bg-dark-accent rounded text-sm text-white"
                          >
                            <option value="dialogue">💬 对话</option>
                            <option value="action">🎯 动作</option>
                            <option value="thought">💭 心理</option>
                            <option value="emotion">❤️ 表情</option>
                          </select>
                          <Button
                            onClick={() =>
                              handleDeletePerformance(roundIndex, perfIndex)
                            }
                            size="sm"
                            variant="ghost"
                          >
                            ✕
                          </Button>
                        </div>
                        {/* 第二行：台词建议 */}
                        <div>
                          <label class="block text-xs text-gray-400 mb-1">
                            💡 台词建议（一句话提示）
                          </label>
                          <input
                            type="text"
                            value={perf.lineHint || ""}
                            onInput={(e) =>
                              handleUpdateLineHint(
                                roundIndex,
                                perfIndex,
                                (e.target as HTMLInputElement).value,
                              )
                            }
                            placeholder={
                              perf.isUser
                                ? "如：试探对方的身份，但不要太直接"
                                : "如：表达友好态度，主动介绍自己"
                            }
                            class="w-full bg-dark-accent/50 border border-dark-accent rounded px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    ))}

                    {/* 添加演员按钮 */}
                    <div class="flex flex-wrap gap-2">
                      {/* 正式角色 */}
                      {sceneCharacters
                        .filter(
                          (c) =>
                            c.isInScene &&
                            !round.turns.find((p) => p.characterId === c.id),
                        )
                        .map((character) => (
                          <button
                            key={character.id}
                            onClick={() =>
                              handleAddPerformance(roundIndex, character)
                            }
                            class="px-3 py-1 bg-dark-accent hover:bg-primary-600 rounded text-sm text-white transition-colors"
                          >
                            + {character.name}{" "}
                            {character.isUser ? "(用户)" : ""}
                          </button>
                        ))}

                      {/* 临时角色按钮 */}
                      <button
                        onClick={() => {
                          if (showTempCharInput) {
                            setShowTempCharInput(false);
                          } else {
                            setShowTempCharInput(true);
                          }
                        }}
                        class="px-3 py-1 bg-dark-accent hover:bg-purple-600 rounded text-sm text-white transition-colors"
                      >
                        🎭 + 临时角色
                      </button>
                    </div>

                    {/* 临时角色输入 */}
                    {showTempCharInput && (
                      <div class="ml-4 mt-2 p-3 bg-dark-accent/30 rounded-lg space-y-2">
                        <div class="text-xs text-gray-400">
                          选择预设或输入自定义临时角色：
                        </div>
                        {/* 预设临时角色 */}
                        <div class="flex flex-wrap gap-2">
                          {TEMP_CHARACTER_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => {
                                handleAddTempPerformance(
                                  roundIndex,
                                  preset.name,
                                );
                                setShowTempCharInput(false);
                                setTempCharName("");
                              }}
                              class="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded text-xs text-purple-300 transition-colors"
                              title={preset.background}
                            >
                              + {preset.name}
                            </button>
                          ))}
                        </div>
                        {/* 自定义输入 */}
                        <div class="flex items-center gap-2">
                          <input
                            type="text"
                            value={tempCharName}
                            onInput={(e) =>
                              setTempCharName(
                                (e.target as HTMLInputElement).value,
                              )
                            }
                            placeholder="或输入自定义临时角色名（如：咖啡店员）"
                            class="flex-1 bg-dark-surface border border-dark-accent rounded px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && tempCharName.trim()) {
                                handleAddTempPerformance(
                                  roundIndex,
                                  tempCharName.trim(),
                                );
                                setShowTempCharInput(false);
                                setTempCharName("");
                              }
                            }}
                          />
                          <Button
                            onClick={() => {
                              if (tempCharName.trim()) {
                                handleAddTempPerformance(
                                  roundIndex,
                                  tempCharName.trim(),
                                );
                                setShowTempCharInput(false);
                                setTempCharName("");
                              }
                            }}
                            size="sm"
                            disabled={!tempCharName.trim()}
                          >
                            添加
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
