import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";
import { Button, Modal, TextArea, ModelButton } from "@components/ui/common";
import type { Scene, Room, Character } from "@/stores";
import type { ProviderConfig } from "@/stores/types";

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomContext: Room;
  characters: Character[];
  existingScenes: Scene[];
  providers: ProviderConfig[];
  selectedProviderId: string | null;
  selectedModel: string;
  isThinkingModel: boolean;
  enableThinking: boolean;
  thinkingBudget: number;
  isGenerating: boolean;
  onProviderChange: (config: {
    providerId: string | null;
    model: string;
    isThinkingModel: boolean;
    enableThinking: boolean;
    thinkingBudget: number;
  }) => void;
  onGenerate: (params: {
    prompt: string;
    selectedSceneSummaries: string[];
  }) => Promise<void>;
}

export const AIGenerateModal: FunctionalComponent<AIGenerateModalProps> = ({
  isOpen,
  onClose,
  existingScenes,
  providers,
  selectedProviderId,
  selectedModel,
  isThinkingModel,
  enableThinking,
  thinkingBudget,
  isGenerating,
  onProviderChange,
  onGenerate,
}) => {
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedSceneSummaries, setSelectedSceneSummaries] = useState<string[]>([]);

  const handleGenerate = async () => {
    await onGenerate({
      prompt: aiPrompt,
      selectedSceneSummaries,
    });
    // Reset and close on success
    setAiPrompt("");
    setSelectedSceneSummaries([]);
    onClose();
  };

  const handleClose = () => {
    if (isGenerating) return;
    setAiPrompt("");
    setSelectedSceneSummaries([]);
    onClose();
  };

  const scenesWithSummary = existingScenes.filter((s) => s.summary);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="🤖 AI 生成场景"
      size="lg"
    >
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-400">
            当前模型：
            {providers.find((p) => p.id === selectedProviderId)?.name || "未选择"}{" "}
            - {selectedModel || "未选择"}
          </span>
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
        {scenesWithSummary.length > 0 && (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              📚 选择参考场景摘要（可选）
            </label>
            <p class="text-xs text-gray-500 mb-2">
              选择已完成的场景摘要作为上下文，帮助 AI 生成连贯的剧情
            </p>
            <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {scenesWithSummary.map((s) => (
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
          <Button onClick={handleClose} variant="secondary" disabled={isGenerating}>
            取消
          </Button>
          <Button
            onClick={handleGenerate}
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
  );
};
