import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  Button,
  Modal,
  Input,
  TextArea,
  Card,
  ModelButton,
} from "@components/ui/common";
import { createScene, updateScene } from "@/db";
import type { Scene, Room, Character } from "@/stores";
import { createClient } from "@/lib/openai/client";
import {
  getSceneSystemPrompt,
  buildScenePrompt,
  getRoundPlanSystemPrompt,
  buildRoundPlanPrompt,
} from "@/lib/prompts/scene-editor";

interface SceneEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  roomId: string;
  editingScene?: Scene | null;
  roomContext: Room;
  characters: Character[];
  existingScenes?: Scene[]; // 已有场景列表，用于提供上下文
}

// 轮次计划类型
interface RoundPlan {
  round: number;
  description: string;
  performances: {
    characterId: string;
    characterName: string;
    isUser: boolean;
    types: string[];
  }[];
}

// 场景出场角色设置
interface SceneCharacter {
  id: string;
  name: string;
  isUser: boolean;
  isInScene: boolean; // 是否在当前场景出场
}

export const SceneEditor: FunctionalComponent<SceneEditorProps> = ({
  isOpen,
  onClose,
  onSaved,
  roomId,
  editingScene,
  roomContext,
  characters = [],
  existingScenes = [],
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [setup, setSetup] = useState("");
  const [summary, setSummary] = useState("");
  const [maxRounds, setMaxRounds] = useState(10);
  const [isAIInputOpen, setIsAIInputOpen] = useState(false);
  const [isRoundPlanOpen, setIsRoundPlanOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // AI 生成相关
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // 思考模式控制
  const [isThinkingModel, setIsThinkingModel] = useState(false);
  const [enableThinking, setEnableThinking] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(1024);

  // 轮次计划
  const [roundPlans, setRoundPlans] = useState<RoundPlan[]>([]);
  const [editingRoundIndex, setEditingRoundIndex] = useState<number | null>(
    null,
  );

  // 关键词控制（用于 AI 生成轮次计划）
  const [keywords, setKeywords] = useState<string[]>([]);
  const [showKeywordsInput, setShowKeywordsInput] = useState(false);

  // 已选场景摘要作为上下文
  const [selectedSceneSummaries, setSelectedSceneSummaries] = useState<
    string[]
  >([]);

  // 出场角色设置
  const [sceneCharacters, setSceneCharacters] = useState<SceneCharacter[]>([]);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);

  useEffect(() => {
    if (editingScene) {
      setName(editingScene.name);
      setDescription(editingScene.description);
      setGoal(editingScene.goal);
      setSetup(editingScene.setup);
      setSummary(editingScene.summary || "");
      setMaxRounds(editingScene.max_rounds);

      if (editingScene.round_plan) {
        setRoundPlans(
          typeof editingScene.round_plan === "string"
            ? JSON.parse(editingScene.round_plan)
            : editingScene.round_plan,
        );
      } else {
        setRoundPlans([]);
      }
    } else {
      resetForm();
    }
  }, [editingScene, isOpen]);

  // 关闭时重置表单
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // 初始化出场角色
  useEffect(() => {
    if (characters.length > 0) {
      setSceneCharacters(
        characters.map((c) => ({
          id: c.id,
          name: c.name,
          isUser: c.is_user,
          isInScene: c.is_user, // 默认用户角色出场
        })),
      );
    }
  }, [characters]);

  useEffect(() => {
    loadProvidersData();
  }, []);

  const loadProvidersData = () => {
    try {
      const data = localStorage.getItem("ai-providers");
      const loadedProviders = data ? JSON.parse(data) : [];
      setProviders(loadedProviders);
      const active = loadedProviders.find((p: any) => p.is_active);
      if (active) {
        setActiveProviderId(active.id);
        setSelectedProviderId(active.id);
        const model = active.custom_models?.[0] || active.model;
        if (model) setSelectedModel(model);

        setIsThinkingModel(active.supports_thinking || false);
        setEnableThinking(
          active.supports_thinking
            ? active.thinking_param_key
              ? true
              : false
            : false,
        );
      }
    } catch (error) {
      console.error("加载 Provider 配置失败:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setGoal("");
    setSetup("");
    setSummary("");
    setMaxRounds(10);
    setRoundPlans([]);
    setKeywords([]);
    setShowKeywordsInput(false);
    setSelectedSceneSummaries([]);
    if (characters.length > 0) {
      setSceneCharacters(
        characters.map((c) => ({
          id: c.id,
          name: c.name,
          isUser: c.is_user,
          isInScene: c.is_user,
        })),
      );
    }
  };

  const setActiveProviderId = (id: string | null) => {
    setSelectedProviderId(id);
  };

  // 处理场景 AI 生成
  const handleAIResult = async () => {
    if (!selectedProviderId || !selectedModel) {
      alert("请先选择 Provider 和模型");
      return;
    }

    setIsGenerating(true);
    try {
      const provider = providers.find((p) => p.id === selectedProviderId);
      if (!provider) throw new Error("Provider 不存在");

      const client = createClient(provider);

      // 构建选中的场景摘要
      const sceneSummaries = existingScenes
        .filter((s) => selectedSceneSummaries.includes(s.id) && s.summary)
        .map((s) => ({ name: s.name, summary: s.summary! }));

      const prompt = buildScenePrompt(
        roomContext,
        characters,
        aiPrompt,
        sceneSummaries,
      );

      const messages = [
        { role: "system", content: getSceneSystemPrompt() },
        { role: "user", content: prompt },
      ];

      const thinking =
        isThinkingModel && provider.supports_thinking
          ? {
              enabled: enableThinking,
              param_key: provider.thinking_param_key || "thinking",
              type: provider.thinking_param_type || "boolean",
              default: provider.thinking_param_default,
              budget_tokens: thinkingBudget,
            }
          : undefined;

      const response = await client.chat(messages, {
        temperature: 0.7,
        max_tokens: 2048,
        model: selectedModel,
        thinking,
      });

      const jsonStr = response.content.replace(/```(?:json)?/g, "").trim();
      const data = JSON.parse(jsonStr);

      if (data.scenes && Array.isArray(data.scenes) && data.scenes.length > 0) {
        const scene = data.scenes[0];
        setName(scene.name || "");
        setDescription(scene.description || "");
        setGoal(scene.goal || "");
        setSetup(scene.setup || "");
        setMaxRounds(scene.max_rounds || 10);
      }
    } catch (error) {
      console.error("解析 AI 结果失败:", error);
      alert(`生成失败：${error instanceof Error ? error.message : "请重试"}`);
    } finally {
      setIsGenerating(false);
    }
    setIsAIInputOpen(false);
  };

  // 用 AI 生成轮次计划
  const handleGenerateRoundPlan = async () => {
    if (!selectedProviderId || !selectedModel) {
      alert("请先选择 Provider 和模型");
      return;
    }

    // 检查是否有出场角色
    const selectedChars = sceneCharacters.filter((c) => c.isInScene);
    if (selectedChars.length === 0) {
      alert("请至少选择一个出场角色");
      setShowCharacterSelect(true);
      return;
    }

    setIsGenerating(true);
    try {
      const provider = providers.find((p) => p.id === selectedProviderId);
      if (!provider) throw new Error("Provider 不存在");

      const client = createClient(provider);

      // 转换为 Character 类型用于 prompt
      const selectedCharsForPrompt = selectedChars.map((c) => ({
        id: c.id,
        name: c.name,
        is_user: c.isUser,
        background: "",
        dialogue_style: "",
        memory: null,
        type: c.isUser ? ("user" as const) : ("ai" as const),
        room_id: "",
        order: 0,
        created_at: 0,
        updated_at: 0,
      }));

      const prompt = buildRoundPlanPrompt(
        roomContext,
        selectedCharsForPrompt,
        {
          name: name || "未命名场景",
          description,
          goal,
          maxRounds,
        },
        keywords.length > 0 ? keywords : undefined,
      );

      const messages = [
        { role: "system", content: getRoundPlanSystemPrompt() },
        { role: "user", content: prompt },
      ];

      const thinking =
        isThinkingModel && provider.supports_thinking
          ? {
              enabled: enableThinking,
              param_key: provider.thinking_param_key || "thinking",
              type: provider.thinking_param_type || "boolean",
              default: provider.thinking_param_default,
              budget_tokens: thinkingBudget,
            }
          : undefined;

      const response = await client.chat(messages, {
        temperature: 0.7,
        max_tokens: 4096,
        model: selectedModel,
        thinking,
      });

      const jsonStr = response.content.replace(/```(?:json)?/g, "").trim();
      const data = JSON.parse(jsonStr);

      const rounds: RoundPlan[] =
        data.rounds?.map((r: any) => ({
          round: r.round,
          description: r.description || `第${r.round}场`,
          performances:
            r.performances?.map((p: any) => ({
              characterId: p.characterId,
              characterName: p.characterName,
              isUser: p.isUser || false,
              types: p.types || ["dialogue"],
            })) || [],
        })) || [];

      setRoundPlans(rounds);
    } catch (error) {
      console.error("生成轮次计划失败:", error);
      alert(`生成失败：${error instanceof Error ? error.message : "请重试"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 手动添加轮次
  const handleAddRound = () => {
    const newRound: RoundPlan = {
      round: roundPlans.length + 1,
      description: `第${roundPlans.length + 1}场`,
      performances: [],
    };
    setRoundPlans([...roundPlans, newRound]);
  };

  // 删除轮次
  const handleDeleteRound = (index: number) => {
    const newRounds = roundPlans.filter((_, i) => i !== index);
    newRounds.forEach((r, i) => (r.round = i + 1));
    setRoundPlans(newRounds);
  };

  // 更新轮次
  const handleUpdateRound = (index: number, updates: Partial<RoundPlan>) => {
    const newRounds = [...roundPlans];
    newRounds[index] = { ...newRounds[index], ...updates };
    setRoundPlans(newRounds);
  };

  // 添加表演到轮次（只使用出场角色）
  const handleAddPerformance = (
    roundIndex: number,
    character: SceneCharacter,
  ) => {
    const newRounds = [...roundPlans];
    newRounds[roundIndex].performances.push({
      characterId: character.id,
      characterName: character.name,
      isUser: character.isUser,
      types: ["dialogue"],
    });
    setRoundPlans(newRounds);
  };

  // 删除表演
  const handleDeletePerformance = (roundIndex: number, perfIndex: number) => {
    const newRounds = [...roundPlans];
    newRounds[roundIndex].performances.splice(perfIndex, 1);
    setRoundPlans(newRounds);
  };

  // 更新表演类型
  const handleUpdatePerformanceTypes = (
    roundIndex: number,
    perfIndex: number,
    types: string[],
  ) => {
    const newRounds = [...roundPlans];
    newRounds[roundIndex].performances[perfIndex].types = types;
    setRoundPlans(newRounds);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("请输入场景名称");
      return;
    }

    setIsSaving(true);
    try {
      if (editingScene) {
        await updateScene(editingScene.id, {
          name,
          description,
          goal,
          setup,
          summary,
          max_rounds: maxRounds,
          round_plan: roundPlans.length > 0 ? JSON.stringify(roundPlans) : null,
        });
      } else {
        await createScene({
          room_id: roomId,
          name,
          description,
          goal,
          setup,
          summary,
          max_rounds: maxRounds,
          order: 0,
          round_plan: roundPlans.length > 0 ? JSON.stringify(roundPlans) : null,
        });
      }
      onSaved();
      resetForm();
    } catch (error) {
      console.error("保存场景失败:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editingScene ? "✏️ 编辑场景" : "🎬 创建场景"}
        size="xl"
        footer={
          <div class="flex max-md:grid max-md:grid-cols-2 justify-end gap-3">
            <Button onClick={onClose} variant="secondary">
              取消
            </Button>
            <Button onClick={() => setIsAIInputOpen(true)} variant="secondary">
              🤖 AI 生成场景
            </Button>
            <Button
              onClick={() => setIsRoundPlanOpen(true)}
              variant="secondary"
            >
              📋 安排轮次
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isSaving}
              disabled={!name.trim()}
            >
              {editingScene ? "保存修改" : "创建场景"}
            </Button>
          </div>
        }
      >
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                场景名称 *
              </label>
              <Input
                value={name}
                onInput={(e) => setName((e.target as HTMLInputElement).value)}
                placeholder="如：第一幕 - 相遇"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                最大轮次
              </label>
              <Input
                type="number"
                value={String(maxRounds)}
                onInput={(e) =>
                  setMaxRounds(
                    parseInt((e.target as HTMLInputElement).value) || 10,
                  )
                }
                placeholder="10"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              场景描述
            </label>
            <TextArea
              value={description}
              onInput={(e) =>
                setDescription((e.target as HTMLTextAreaElement).value)
              }
              placeholder="描述场景的环境、氛围等..."
              rows={2}
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              场景目标
            </label>
            <Input
              value={goal}
              onInput={(e) => setGoal((e.target as HTMLInputElement).value)}
              placeholder="如：完成初次对话，建立角色关系"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              场景布置
            </label>
            <TextArea
              value={setup}
              onInput={(e) => setSetup((e.target as HTMLTextAreaElement).value)}
              placeholder="道具、特殊元素、注意事项等..."
              rows={2}
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              场景摘要
              {editingScene?.summary && (
                <span class="text-xs text-gray-500 ml-2">(演出完成后生成)</span>
              )}
            </label>
            <TextArea
              value={summary}
              onInput={(e) =>
                setSummary((e.target as HTMLTextAreaElement).value)
              }
              placeholder="场景演出的总结..."
              rows={3}
            />
          </div>

          {/* 轮次计划预览 */}
          {roundPlans.length > 0 && (
            <Card class="p-4 bg-dark-accent/30">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-white">📋 轮次安排</h4>
                <Button
                  onClick={() => setIsRoundPlanOpen(true)}
                  size="sm"
                  variant="secondary"
                >
                  编辑 ({roundPlans.length}场)
                </Button>
              </div>
              <div class="space-y-1">
                {roundPlans.slice(0, 3).map((round) => (
                  <div key={round.round} class="text-sm text-gray-400">
                    • 第{round.round}场：{round.description} (
                    {round.performances.length}个表演)
                  </div>
                ))}
                {roundPlans.length > 3 && (
                  <div class="text-sm text-gray-500">
                    还有{roundPlans.length - 3}场...
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </Modal>

      {/* AI 生成场景模态框 */}
      <Modal
        isOpen={isAIInputOpen}
        onClose={() => setIsAIInputOpen(false)}
        title="🤖 AI 生成场景"
        size="lg"
      >
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-400">
              当前模型：
              {providers.find((p) => p.id === selectedProviderId)?.name ||
                "未选择"}{" "}
              - {selectedModel || "未选择"}
            </span>
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

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              💬 提示词
            </label>
            <TextArea
              value={aiPrompt}
              onInput={(e) =>
                setAiPrompt((e.target as HTMLTextAreaElement).value)
              }
              placeholder="描述你想要生成的场景..."
              rows={3}
            />
          </div>

          {/* 选择已有场景摘要作为上下文 */}
          {existingScenes.filter((s) => s.summary).length > 0 && (
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                📚 选择参考场景摘要（可选）
              </label>
              <p class="text-xs text-gray-500 mb-2">
                选择已完成的场景摘要作为上下文，帮助 AI 生成连贯的剧情
              </p>
              <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {existingScenes
                  .filter((s) => s.summary)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSceneSummaries((prev) =>
                          prev.includes(s.id)
                            ? prev.filter((id) => id !== s.id)
                            : [...prev, s.id],
                        );
                      }}
                      class={`px-3 py-1 rounded text-sm transition-colors ${
                        selectedSceneSummaries.includes(s.id)
                          ? "bg-primary-600 text-white"
                          : "bg-dark-surface text-gray-300 hover:bg-dark-accent"
                      }`}
                    >
                      📝 {s.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div class="flex justify-end gap-3 pt-4 border-t border-dark-accent">
            <Button onClick={() => setIsAIInputOpen(false)} variant="secondary">
              取消
            </Button>
            <Button
              onClick={handleAIResult}
              isLoading={isGenerating}
              disabled={
                !selectedProviderId || !selectedModel || !aiPrompt.trim()
              }
            >
              {isGenerating ? "生成中..." : "✨ 生成"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 轮次计划编辑模态框 */}
      <Modal
        isOpen={isRoundPlanOpen}
        onClose={() => setIsRoundPlanOpen(false)}
        title="📋 安排轮次"
        size="xl"
        footer={
          <div class="flex justify-end gap-3">
            <Button
              onClick={() => setIsRoundPlanOpen(false)}
              variant="secondary"
            >
              完成
            </Button>
          </div>
        }
      >
        <div class="space-y-4 ">
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

            <div class="flex max-md:flex-col max-md:flex-col-reverse md:items-center gap-2">
              <Button
                onClick={handleGenerateRoundPlan}
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
          </Card>

          {/* 轮次列表 */}
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-white">手动编辑</h4>
              <div class="flex gap-2">
                <Button
                  onClick={() => {
                    if (confirm("确定要清空所有轮次吗？")) {
                      setRoundPlans([]);
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
                  <div class="flex items-center justify-between max-md:items-end mb-3">
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

                  {/* 表演列表 */}
                  <div class="space-y-2 ml-4">
                    {round.performances.map((perf, perfIndex) => (
                      <div
                        key={perfIndex}
                        class="flex items-center gap-2 p-2 bg-dark-surface rounded"
                      >
                        <span class="text-lg">{perf.isUser ? "👤" : "🤖"}</span>
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
                    ))}

                    {/* 添加演员按钮（只使用出场角色） */}
                    <div class="flex flex-wrap gap-2">
                      {sceneCharacters
                        .filter(
                          (c) =>
                            c.isInScene &&
                            !round.performances.find(
                              (p) => p.characterId === c.id,
                            ),
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
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
