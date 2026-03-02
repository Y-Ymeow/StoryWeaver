import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Modal, Input, TextArea } from "@components/ui/common";
import type { Room } from "@stores";
import { AIGenerate } from "./AIGenerate";
import type { AIGenerateResult } from "@/types/ai-generate";
import type { ProviderConfig } from "@stores/types";

const MAX_SCENES_LIMIT = 200;

interface CharacterFormData {
  name: string;
  background: string;
  dialogue_style: string;
  is_user: boolean;
  type: "user" | "ai";
}

interface SceneFormData {
  name: string;
  description: string;
  goal: string;
  setup: string;
  max_rounds: number;
}

interface CreateRoomWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoomData) => Promise<void>;
  isLoading: boolean;
  providers?: ProviderConfig[];
  activeProviderId?: string | null;
  editingMode?: boolean;
  initialData?: Partial<CreateRoomData>;
}

export interface CreateRoomData {
  room: {
    name: string;
    setting: string;
    plot_summary: string;
    worldview: string;
    tone: string;
    current_performance_summary?: string;
    max_scenes: number;
  };
  characters: CharacterFormData[];
  scenes: SceneFormData[];
}

export const CreateRoomWizard: FunctionalComponent<CreateRoomWizardProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  providers = [],
  activeProviderId,
  editingMode = false,
  initialData,
}) => {
  const [step, setStep] = useState(1);
  const [roomData, setRoomData] = useState({
    name: initialData?.room?.name || "",
    setting: initialData?.room?.setting || "",
    plot_summary: initialData?.room?.plot_summary || "",
    worldview: initialData?.room?.worldview || "",
    tone: initialData?.room?.tone || "",
    max_scenes: Math.min(
      MAX_SCENES_LIMIT,
      Math.max(1, initialData?.room?.max_scenes || 50),
    ),
  });
  const [characters, setCharacters] = useState<CharacterFormData[]>([
    {
      name: "",
      background: "",
      dialogue_style: "",
      is_user: true,
      type: "user",
    },
  ]);
  const [scenes, setScenes] = useState<SceneFormData[]>([
    { name: "", description: "", goal: "", setup: "", max_rounds: 10 },
  ]);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [aiGenerateMode, setAiGenerateMode] = useState<
    "room" | "character" | "scene"
  >("room");
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  const handleAddCharacter = () => {
    setCharacters([
      ...characters,
      {
        name: "",
        background: "",
        dialogue_style: "",
        is_user: false,
        type: "ai",
      },
    ]);
  };

  // 重置表单
  const resetForm = () => {
    setStep(1);
    setRoomData({
      name: "",
      setting: "",
      plot_summary: "",
      worldview: "",
      tone: "",
      max_scenes: 50,
    });
    setCharacters([
      {
        name: "",
        background: "",
        dialogue_style: "",
        is_user: true,
        type: "user",
      },
    ]);
    setScenes([
      { name: "", description: "", goal: "", setup: "", max_rounds: 10 },
    ]);
    setAiGenerateMode("room");
    setIsAIGenerating(false);
  };

  // 关闭时重置表单
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleAIResult = (result: AIGenerateResult) => {
    setIsAIGenerating(false);
    if (aiGenerateMode === "room") {
      setRoomData({
        ...roomData,
        name: result.name ?? roomData.name,
        setting: result.setting ?? roomData.setting,
        plot_summary: result.plot_summary ?? roomData.plot_summary,
        worldview: result.worldview ?? roomData.worldview,
        tone: result.tone ?? roomData.tone,
        max_scenes: Math.min(
          MAX_SCENES_LIMIT,
          Math.max(1, result.max_scenes ?? roomData.max_scenes),
        ),
      });
    } else if (aiGenerateMode === "character" && result.characters) {
      const newChars = result.characters.map((c) => ({
        name: c.name,
        background: c.background,
        dialogue_style: c.dialogue_style,
        is_user: c.is_user,
        type: c.is_user ? "user" : ("ai" as "user" | "ai"),
      }));
      // 追加而不是覆盖
      if (newChars.length > 0) {
        setCharacters([...characters, ...newChars]);
      }
    } else if (aiGenerateMode === "scene" && result.scenes) {
      const remaining = roomData.max_scenes - scenes.length;
      if (remaining <= 0) {
        alert(`场景已达到上限（${roomData.max_scenes}）`);
        return;
      }
      const newScenes = result.scenes.map((s) => ({
        name: s.name,
        description: s.description,
        goal: s.goal,
        setup: s.setup,
        max_rounds: s.max_rounds || 10,
      }));
      // 追加而不是覆盖
      if (newScenes.length > 0) {
        const clipped = newScenes.slice(0, remaining);
        setScenes([...scenes, ...clipped]);
        if (newScenes.length > clipped.length) {
          alert(`超出场景上限，已仅添加 ${clipped.length} 个场景`);
        }
      }
    }
  };

  const handleRemoveCharacter = (index: number) => {
    if (characters.length > 1) {
      setCharacters(characters.filter((_, i) => i !== index));
    }
  };

  const handleUpdateCharacter = (
    index: number,
    data: Partial<CharacterFormData>,
  ) => {
    const updated = [...characters];
    updated[index] = { ...updated[index], ...data };
    setCharacters(updated);
  };

  const handleAddScene = () => {
    if (scenes.length >= roomData.max_scenes) {
      alert(`场景已达到上限（${roomData.max_scenes}）`);
      return;
    }
    setScenes([
      ...scenes,
      { name: "", description: "", goal: "", setup: "", max_rounds: 10 },
    ]);
  };

  const handleRemoveScene = (index: number) => {
    if (scenes.length > 1) {
      setScenes(scenes.filter((_, i) => i !== index));
    }
  };

  const handleUpdateScene = (index: number, data: Partial<SceneFormData>) => {
    const updated = [...scenes];
    updated[index] = { ...updated[index], ...data };
    setScenes(updated);
  };

  const handleSubmit = async () => {
    await onSubmit({
      room: {
        ...roomData,
        current_performance_summary: "",
      },
      characters,
      scenes,
    });
    // 重置状态
    setStep(1);
    setRoomData({
      name: "",
      setting: "",
      plot_summary: "",
      worldview: "",
      tone: "",
      max_scenes: 50,
    });
    setCharacters([
      {
        name: "",
        background: "",
        dialogue_style: "",
        is_user: true,
        type: "user",
      },
    ]);
    setScenes([
      { name: "", description: "", goal: "", setup: "", max_rounds: 10 },
    ]);
  };

  const canGoNext = () => {
    if (step === 1) {
      return roomData.name && roomData.setting;
    } else if (step === 2) {
      return characters.every((c) => c.name);
    } else if (step === 3) {
      return scenes.every((s) => s.name);
    }
    return false;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingMode ? "✏️ 编辑房间" : "🎭 创建新房间"}
      size="xl"
      footer={
        <div class="flex justify-between items-center">
          {step > 1 ? (
            <Button onClick={() => setStep(step - 1)} variant="secondary">
              ← 上一步
            </Button>
          ) : (
            <Button onClick={onClose} variant="ghost">
              取消
            </Button>
          )}

          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canGoNext()}>
              下一步 →
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={!canGoNext()}
            >
              创建房间
            </Button>
          )}
        </div>
      }
    >
      <div class="space-y-4">
        {/* 步骤指示器 */}
        <div class="flex items-center justify-center mb-6">
          <div class="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} class="flex items-center">
                <div
                  class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= s
                      ? "bg-primary-600 text-white"
                      : "bg-dark-accent text-gray-400"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    class={`w-16 h-1 ${step > s ? "bg-primary-600" : "bg-dark-accent"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 步骤 1: 房间基本信息 */}
        {step === 1 && (
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-white mb-4">📝 基本信息</h3>
              <Button
                onClick={() => {
                  setAiGenerateMode("room");
                  setShowAIGenerate(true);
                }}
                size="sm"
                variant="secondary"
              >
                ✨ AI 生成
              </Button>
            </div>
            <Input
              label="房间名称 *"
              value={roomData.name}
              onInput={(e) =>
                setRoomData({
                  ...roomData,
                  name: (e.target as HTMLInputElement).value,
                })
              }
              placeholder="请输入剧本名称"
            />
            <TextArea
              label="基本设定 *"
              value={roomData.setting}
              onInput={(e) =>
                setRoomData({
                  ...roomData,
                  setting: (e.target as HTMLTextAreaElement).value,
                })
              }
              placeholder="描述故事的基本设定"
              rows={3}
            />
            <TextArea
              label="剧情大纲"
              value={roomData.plot_summary}
              onInput={(e) =>
                setRoomData({
                  ...roomData,
                  plot_summary: (e.target as HTMLTextAreaElement).value,
                })
              }
              placeholder="简要描述剧情发展"
              rows={2}
            />
            <div class="grid grid-cols-2 gap-4">
              <Input
                label="世界观"
                value={roomData.worldview}
                onInput={(e) =>
                  setRoomData({
                    ...roomData,
                    worldview: (e.target as HTMLInputElement).value,
                  })
                }
                placeholder="故事发生的世界背景"
              />
              <Input
                label="基调"
                value={roomData.tone}
                onInput={(e) =>
                  setRoomData({
                    ...roomData,
                    tone: (e.target as HTMLInputElement).value,
                  })
                }
                placeholder="轻松、悬疑、悲伤等"
              />
              <Input
                label="场景上限"
                type="number"
                value={String(roomData.max_scenes)}
                onInput={(e) =>
                  setRoomData({
                    ...roomData,
                    max_scenes: Math.max(
                      1,
                      Math.min(
                        MAX_SCENES_LIMIT,
                        parseInt((e.target as HTMLInputElement).value) || 50,
                      ),
                    ),
                  })
                }
                placeholder="50 (1-200)"
              />
            </div>
          </div>
        )}

        {/* 步骤 2: 添加角色 */}
        {step === 2 && (
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-white">👥 添加角色</h3>
              <div class="flex gap-2">
                <Button
                  onClick={() => {
                    setAiGenerateMode("character");
                    setShowAIGenerate(true);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  ✨ AI 生成
                </Button>
                <Button
                  onClick={handleAddCharacter}
                  size="sm"
                  variant="secondary"
                >
                  ➕ 添加角色
                </Button>
              </div>
            </div>

            {characters.map((char, index) => (
              <div
                key={index}
                class="bg-dark-accent/50 p-4 rounded-lg space-y-3"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-300">
                    角色 {index + 1}
                  </span>
                  {characters.length > 1 && (
                    <button
                      onClick={() => handleRemoveCharacter(index)}
                      class="text-red-400 hover:text-red-300 text-sm"
                    >
                      删除
                    </button>
                  )}
                </div>
                <Input
                  label="角色名称 *"
                  value={char.name}
                  onInput={(e) =>
                    handleUpdateCharacter(index, {
                      name: (e.target as HTMLInputElement).value,
                    })
                  }
                  placeholder="请输入角色名称"
                />
                <TextArea
                  label="角色背景"
                  value={char.background}
                  onInput={(e) =>
                    handleUpdateCharacter(index, {
                      background: (e.target as HTMLTextAreaElement).value,
                    })
                  }
                  placeholder="角色的背景故事"
                  rows={2}
                />
                <Input
                  label="台词风格"
                  value={char.dialogue_style}
                  onInput={(e) =>
                    handleUpdateCharacter(index, {
                      dialogue_style: (e.target as HTMLInputElement).value,
                    })
                  }
                  placeholder="如：古风、现代、幽默等"
                />
                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="radio"
                      name={`char-type-${index}`}
                      checked={char.is_user}
                      onChange={() =>
                        handleUpdateCharacter(index, {
                          is_user: true,
                          type: "user",
                        })
                      }
                      class="w-4 h-4"
                    />
                    用户扮演
                  </label>
                  <label class="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="radio"
                      name={`char-type-${index}`}
                      checked={!char.is_user}
                      onChange={() =>
                        handleUpdateCharacter(index, {
                          is_user: false,
                          type: "ai",
                        })
                      }
                      class="w-4 h-4"
                    />
                    AI 扮演
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 步骤 3: 添加场景 */}
        {step === 3 && (
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-white">🎬 添加场景</h3>
              <div class="flex gap-2">
                <Button
                  onClick={() => {
                    setAiGenerateMode("scene");
                    setShowAIGenerate(true);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  ✨ AI 生成
                </Button>
                <Button onClick={handleAddScene} size="sm" variant="secondary">
                  ➕ 添加场景
                </Button>
              </div>
            </div>

            {scenes.map((scene, index) => (
              <div
                key={index}
                class="bg-dark-accent/50 p-4 rounded-lg space-y-3"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-300">
                    场景 {index + 1}
                  </span>
                  {scenes.length > 1 && (
                    <button
                      onClick={() => handleRemoveScene(index)}
                      class="text-red-400 hover:text-red-300 text-sm"
                    >
                      删除
                    </button>
                  )}
                </div>
                <Input
                  label="场景名称 *"
                  value={scene.name}
                  onInput={(e) =>
                    handleUpdateScene(index, {
                      name: (e.target as HTMLInputElement).value,
                    })
                  }
                  placeholder="请输入场景名称"
                />
                <TextArea
                  label="场景描述"
                  value={scene.description}
                  onInput={(e) =>
                    handleUpdateScene(index, {
                      description: (e.target as HTMLTextAreaElement).value,
                    })
                  }
                  placeholder="场景的环境描述"
                  rows={2}
                />
                <TextArea
                  label="场景目标"
                  value={scene.goal}
                  onInput={(e) =>
                    handleUpdateScene(index, {
                      goal: (e.target as HTMLTextAreaElement).value,
                    })
                  }
                  placeholder="这个场景需要完成的目标"
                  rows={2}
                />
                <TextArea
                  label="场景布置"
                  value={scene.setup}
                  onInput={(e) =>
                    handleUpdateScene(index, {
                      setup: (e.target as HTMLTextAreaElement).value,
                    })
                  }
                  placeholder="场景中的道具、特殊元素等"
                  rows={2}
                />
                <Input
                  label="最大轮次"
                  type="number"
                  value={String(scene.max_rounds)}
                  onInput={(e) =>
                    handleUpdateScene(index, {
                      max_rounds:
                        parseInt((e.target as HTMLInputElement).value) || 10,
                    })
                  }
                  placeholder="10"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI 生成模态框 */}
      <AIGenerate
        isOpen={showAIGenerate}
        onClose={() => {
          setShowAIGenerate(false);
          setIsAIGenerating(false);
        }}
        onGenerate={(result) => {
          setIsAIGenerating(false);
          handleAIResult(result);
        }}
        providers={providers}
        activeProviderId={activeProviderId}
        mode={aiGenerateMode}
        roomContext={roomData}
        characters={characters}
        scenes={scenes}
        isLoading={isAIGenerating}
      />
    </Modal>
  );
};
