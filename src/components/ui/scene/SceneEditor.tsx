import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  Button,
  Modal,
  Input,
  TextArea,
  Card,
} from "@components/ui/common";
import { AIGenerateModal } from "./AIGenerateModal";
import { RoundPlanModal } from "./RoundPlanModal";
import { createScene, updateScene } from "@/db";
import type { Scene, Room, Character } from "@/stores";
import { useProviders, useAI } from "@/hooks";
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
  // 表单状态
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [setup, setSetup] = useState("");
  const [summary, setSummary] = useState("");
  const [maxRounds, setMaxRounds] = useState(10);
  const [isAIInputOpen, setIsAIInputOpen] = useState(false);
  const [isRoundPlanOpen, setIsRoundPlanOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sceneStreamingContent, setSceneStreamingContent] = useState("");
  const [sceneThinkingContent, setSceneThinkingContent] = useState("");
  const [roundStreamingContent, setRoundStreamingContent] = useState("");
  const [roundThinkingContent, setRoundThinkingContent] = useState("");

  // 轮次计划
  const [roundPlans, setRoundPlans] = useState<RoundPlan[]>([]);

  // 使用自定义 hooks
  const {
    providers,
    selectedProviderId,
    setSelectedProviderId,
    selectedModel,
    setSelectedModel,
    isThinkingModel,
    setIsThinkingModel,
    enableThinking,
    setEnableThinking,
    thinkingBudget,
    setThinkingBudget,
  } = useProviders();

  const { isGenerating, generate } = useAI();

  // 加载编辑的场景数据
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
      setSceneStreamingContent("");
      setSceneThinkingContent("");
      setRoundStreamingContent("");
      setRoundThinkingContent("");
    }
  }, [isOpen]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setGoal("");
    setSetup("");
    setSummary("");
    setMaxRounds(10);
    setRoundPlans([]);
  };

  // 处理 AI 生成场景
  const handleGenerateScene = async (params: {
    prompt: string;
    selectedSceneSummaries: string[];
    selectedCharacterIds: string[];
  }) => {
    if (!selectedProviderId || !selectedModel) {
      alert("请先选择 Provider 和模型");
      return;
    }

    const provider = providers.find((p) => p.id === selectedProviderId);
    if (!provider) {
      alert("Provider 不存在");
      return;
    }

    try {
      setSceneStreamingContent("");
      setSceneThinkingContent("");

      // 构建选中的场景摘要
      const sceneSummaries = existingScenes
        .filter(
          (s) =>
            s.summary &&
            (params.selectedSceneSummaries.length === 0 ||
              params.selectedSceneSummaries.includes(s.id)),
        )
        .map((s) => ({ name: s.name, summary: s.summary! }));

      const selectedCharacters = characters.filter((c) =>
        params.selectedCharacterIds.includes(c.id),
      );
      if (selectedCharacters.length === 0) {
        alert("请至少选择一个参考角色");
        return;
      }

      const prompt = buildScenePrompt(
        roomContext,
        selectedCharacters,
        params.prompt,
        sceneSummaries,
      );

      const messages = [
        { role: "system", content: getSceneSystemPrompt() },
        { role: "user", content: prompt },
      ];

      const thinking =
        provider.supports_thinking && enableThinking
          ? {
              enabled: true,
              param_key: provider.thinking_param_key || "thinking",
              type: provider.thinking_param_type || "boolean",
              default: provider.thinking_param_default,
              budget_tokens: thinkingBudget,
            }
          : {
              enabled: false,
              param_key: provider.thinking_param_key || "thinking",
              type: provider.thinking_param_type || "boolean",
              disabled: provider.thinking_param_disabled,
            };

      const data = await generate<{
        scenes: Array<{
          name: string;
          description: string;
          goal: string;
          setup: string;
          max_rounds: number;
        }>;
      }>(provider, selectedModel, messages, {
        temperature: 0.7,
        max_tokens: 2048,
        thinking,
        reasoning_effort: provider.reasoning_effort,
        onStream: (content, thinkingContent) => {
          setSceneStreamingContent(content);
          setSceneThinkingContent(thinkingContent);
        },
      });

      if (data.scenes && Array.isArray(data.scenes) && data.scenes.length > 0) {
        if (!editingScene && data.scenes.length > 1) {
          for (const generatedScene of data.scenes) {
            if (!generatedScene?.name?.trim()) continue;
            await createScene({
              room_id: roomId,
              name: generatedScene.name,
              description: generatedScene.description || "",
              goal: generatedScene.goal || "",
              setup: generatedScene.setup || "",
              summary: "",
              max_rounds: generatedScene.max_rounds || 10,
              order: 0,
              round_plan: null,
            });
          }
          setIsAIInputOpen(false);
          onSaved();
          return;
        }

        const firstScene = data.scenes[0];
        setName(firstScene.name || "");
        setDescription(firstScene.description || "");
        setGoal(firstScene.goal || "");
        setSetup(firstScene.setup || "");
        setMaxRounds(firstScene.max_rounds || 10);
      }

      setIsAIInputOpen(false);
    } catch (error) {
      console.error("解析 AI 结果失败:", error);
      alert(`生成失败：${error instanceof Error ? error.message : "请重试"}`);
    }
  };

  // 处理 AI 生成轮次计划
  const handleGenerateRoundPlan = async (params: {
    sceneCharacters: SceneCharacter[];
    keywords: string[];
  }) => {
    if (!selectedProviderId || !selectedModel) {
      alert("请先选择 Provider 和模型");
      return;
    }

    const provider = providers.find((p) => p.id === selectedProviderId);
    if (!provider) {
      alert("Provider 不存在");
      return;
    }

    try {
      setRoundStreamingContent("");
      setRoundThinkingContent("");

      // 转换为 Character 类型用于 prompt
      const selectedCharsForPrompt = params.sceneCharacters
        .filter((c) => c.isInScene)
        .map((c) => ({
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
        params.keywords.length > 0 ? params.keywords : undefined,
      );

      const messages = [
        { role: "system", content: getRoundPlanSystemPrompt() },
        { role: "user", content: prompt },
      ];

      const thinking =
        provider.supports_thinking && enableThinking
          ? {
              enabled: true,
              param_key: provider.thinking_param_key || "thinking",
              type: provider.thinking_param_type || "boolean",
              default: provider.thinking_param_default,
              budget_tokens: thinkingBudget,
            }
          : {
              enabled: false,
              param_key: provider.thinking_param_key || "thinking",
              type: provider.thinking_param_type || "boolean",
              disabled: provider.thinking_param_disabled,
            };

      const data = await generate<{
        rounds: Array<{
          round: number;
          description: string;
          goal?: string;
          turns?: Array<{
            characterId: string;
            characterName: string;
            isUser: boolean;
            types: string[];
            lineHint?: string;
          }>;
          performances?: Array<{
            characterId: string;
            characterName: string;
            isUser: boolean;
            types: string[];
            lineHint?: string;
          }>;
        }>;
      }>(provider, selectedModel, messages, {
        temperature: 0.7,
        max_tokens: 4096,
        thinking,
        reasoning_effort: provider.reasoning_effort,
        onStream: (content, thinkingContent) => {
          setRoundStreamingContent(content);
          setRoundThinkingContent(thinkingContent);
        },
      });

      const rounds: RoundPlan[] =
        data.rounds?.map((r: any) => ({
          round: r.round,
          description: r.description || `第${r.round}场`,
          goal: r.goal || "",
          // 兼容旧版 performances 和新版 turns
          turns:
            r.turns?.map((p: any) => ({
              characterId: p.characterId,
              characterName: p.characterName,
              isUser: p.isUser || false,
              isTemp: p.isTemp || false,  // 临时角色标识
              types: p.types || ["dialogue"],
              lineHint: p.lineHint || "",
            })) ||
            r.performances?.map((p: any) => ({
              characterId: p.characterId,
              characterName: p.characterName,
              isUser: p.isUser || false,
              isTemp: p.isTemp || false,
              types: p.types || ["dialogue"],
              lineHint: p.lineHint || "",
            })) ||
            [],
        })) || [];

      setRoundPlans(rounds);
    } catch (error) {
      console.error("生成轮次计划失败:", error);
      alert(`生成失败：${error instanceof Error ? error.message : "请重试"}`);
    }
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

  const handleProviderChange = (config: {
    providerId: string | null;
    model: string;
    isThinkingModel: boolean;
    enableThinking: boolean;
    thinkingBudget: number;
  }) => {
    setSelectedProviderId(config.providerId);
    setSelectedModel(config.model);
    setIsThinkingModel(config.isThinkingModel);
    setEnableThinking(config.enableThinking);
    setThinkingBudget(config.thinkingBudget);
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
                    • 第{round.round}场：{round.description}
                    {round.goal && (
                      <span class="text-gray-500">（{round.goal}）</span>
                    )}{" "}
                    ({round.turns.length}个表演)
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
      <AIGenerateModal
        isOpen={isAIInputOpen}
        onClose={() => {
          setIsAIInputOpen(false);
          setSceneStreamingContent("");
          setSceneThinkingContent("");
        }}
        roomContext={roomContext}
        characters={characters}
        existingScenes={existingScenes}
        providers={providers}
        selectedProviderId={selectedProviderId}
        selectedModel={selectedModel}
        isThinkingModel={isThinkingModel}
        enableThinking={enableThinking}
        thinkingBudget={thinkingBudget}
        isGenerating={isGenerating}
        streamingContent={sceneStreamingContent}
        thinkingContent={sceneThinkingContent}
        onProviderChange={handleProviderChange}
        onGenerate={handleGenerateScene}
      />

      {/* 轮次计划编辑模态框 */}
      <RoundPlanModal
        isOpen={isRoundPlanOpen}
        onClose={() => {
          setIsRoundPlanOpen(false);
          setRoundStreamingContent("");
          setRoundThinkingContent("");
        }}
        roomContext={roomContext}
        characters={characters}
        sceneName={name}
        sceneDescription={description}
        sceneGoal={goal}
        maxRounds={maxRounds}
        roundPlans={roundPlans}
        onRoundPlansChange={setRoundPlans}
        providers={providers}
        selectedProviderId={selectedProviderId}
        selectedModel={selectedModel}
        isThinkingModel={isThinkingModel}
        enableThinking={enableThinking}
        thinkingBudget={thinkingBudget}
        isGenerating={isGenerating}
        streamingContent={roundStreamingContent}
        thinkingContent={roundThinkingContent}
        onProviderChange={handleProviderChange}
        onGenerate={handleGenerateRoundPlan}
      />
    </>
  );
};
