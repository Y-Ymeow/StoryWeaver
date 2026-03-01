import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";
import { Button, Modal, AIInputConfig } from "@components/ui/common";
import type { ProviderConfig } from "@stores/types";

interface AIGenerateProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (result: AIGenerateResult) => void;
  providers: ProviderConfig[];
  activeProviderId?: string | null;
  mode?: "room" | "character" | "scene" | "custom";
  roomContext?: {
    name?: string;
    setting?: string;
    plot_summary?: string;
    worldview?: string;
  };
  characters?: Array<{
    name: string;
    background: string;
    dialogue_style: string;
  }>;
  scenes?: Array<{ name: string; description: string; goal: string }>;
}

export interface AIGenerateResult {
  name?: string;
  setting?: string;
  plot_summary?: string;
  worldview?: string;
  tone?: string;
  characters?: Array<{
    name: string;
    background: string;
    dialogue_style: string;
    is_user: boolean;
  }>;
  scenes?: Array<{
    name: string;
    description: string;
    goal: string;
    setup: string;
    max_rounds: number;
  }>;
  content?: string;
}

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
}) => {
  const [mode, setMode] = useState<"room" | "character" | "scene" | "custom">(
    presetMode,
  );
  const [showAIInput, setShowAIInput] = useState(false);

  const handleAIResult = (result: { content: string }) => {
    const parsed = parseAIResponse(
      result.content,
      mode,
      roomContext,
      characters,
      scenes,
    );
    onGenerate(parsed);
    setShowAIInput(false);
    onClose();
  };

  const openAIInput = (newMode: typeof mode) => {
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
      />
    </>
  );
};

function parseAIResponse(
  content: string,
  mode: string,
  roomContext?: any,
  characters?: any[],
  scenes?: any[],
): AIGenerateResult {
  try {
    // 提取 JSON 代码块
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    let jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : content;

    // 如果没有代码块，尝试直接提取 JSON 对象
    if (!codeBlockMatch) {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      jsonStr = jsonMatch ? jsonMatch[0] : jsonStr;
    }

    const parsed = JSON.parse(jsonStr);

    if (mode === "room") {
      return {
        name: parsed.name || "",
        setting: parsed.setting || "",
        plot_summary: parsed.plot_summary || "",
        worldview: parsed.worldview || "",
        tone: parsed.tone || "",
      };
    } else if (mode === "character") {
      return {
        characters: (parsed.characters || []).map((c: any) => ({
          name: c.name || "",
          background: c.background || "",
          dialogue_style: c.dialogue_style || "",
          is_user: c.is_user || false,
        })),
      };
    } else if (mode === "scene") {
      return {
        scenes: (parsed.scenes || []).map((s: any) => ({
          name: s.name || "",
          description: s.description || "",
          goal: s.goal || "",
          setup: s.setup || "",
          max_rounds: s.max_rounds || 10,
        })),
      };
    }
    return { content };
  } catch (e) {
    console.error("JSON 解析失败:", e);
    return { content };
  }
}
