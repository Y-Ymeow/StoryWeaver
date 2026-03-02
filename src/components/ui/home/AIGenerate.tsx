import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";
import { Button, Modal, AIInputConfig } from "@components/ui/common";
import type { AIGenerateProps, AIGenerateResult, AIGenerateMode } from "@/types/ai-generate";
import { parseAIResponse } from "@/lib/parser/ai-generate";

export const AIGenerate: FunctionalComponent<AIGenerateProps> = ({
  isOpen,
  onClose,
  onGenerate,
  providers,
  activeProviderId,
  mode: presetMode = "custom",
  roomContext,
  characters = [],
  scenes = [],
  isLoading = false,
}) => {
  const [mode, setMode] = useState<AIGenerateMode>(presetMode);
  const [showAIInput, setShowAIInput] = useState(false);

  const handleAIResult = (result: { content: string }) => {
    const parsed = parseAIResponse(result.content, mode);
    onGenerate(parsed);
    setShowAIInput(false);
    onClose();
  };

  const openAIInput = (newMode: AIGenerateMode) => {
    setMode(newMode);
    setShowAIInput(true);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="✨ AI 生成助手" size="lg">
        <div class="space-y-4">
          {providers.length === 0 ? (
            <div class="bg-yellow-900/30 border border-yellow-500 text-yellow-300 p-4 rounded-lg">
              <p class="font-semibold mb-2">⚠️ 未设置 AI Provider</p>
              <p class="text-sm">请先在设置中添加并激活一个 AI Provider。</p>
            </div>
          ) : (
            <>
              <div class="flex items-center gap-2 text-sm text-gray-400">
                <span>当前使用：</span>
                <span class="text-primary-400">
                  {providers.find((p) => p.id === activeProviderId)?.name ||
                    "未设置"}
                </span>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  生成类型
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <Button
                    variant={mode === "room" ? "primary" : "secondary"}
                    onClick={() => openAIInput("room")}
                  >
                    🏠 房间设定
                  </Button>
                  <Button
                    variant={mode === "character" ? "primary" : "secondary"}
                    onClick={() => openAIInput("character")}
                  >
                    👥 角色
                  </Button>
                  <Button
                    variant={mode === "scene" ? "primary" : "secondary"}
                    onClick={() => openAIInput("scene")}
                  >
                    🎬 场景
                  </Button>
                  <Button
                    variant={mode === "custom" ? "primary" : "secondary"}
                    onClick={() => openAIInput("custom")}
                  >
                    📝 自定义
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      <AIInputConfig
        isOpen={showAIInput}
        onClose={() => setShowAIInput(false)}
        onGenerate={handleAIResult}
        providers={providers}
        activeProviderId={activeProviderId}
        mode={mode}
        roomContext={roomContext}
        characters={characters}
        scenes={scenes}
        isLoading={isLoading}
      />
    </>
  );
};