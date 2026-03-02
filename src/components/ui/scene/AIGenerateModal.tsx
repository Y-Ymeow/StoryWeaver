import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
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
    prompt: string;
    selectedSceneSummaries: string[];
    selectedCharacterIds: string[];
  }) => Promise<void>;
}

export const AIGenerateModal: FunctionalComponent<AIGenerateModalProps> = ({
  isOpen,
  onClose,
  existingScenes,
  characters,
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
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedSceneSummaries, setSelectedSceneSummaries] = useState<string[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(
    characters.map((c) => c.id),
  );

  const scenesWithSummary = existingScenes.filter((s) => s.summary);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCharacterIds(characters.map((c) => c.id));
    setSelectedSceneSummaries(scenesWithSummary.map((s) => s.id));
  }, [isOpen, characters, existingScenes]);

  const handleGenerate = async () => {
    await onGenerate({
      prompt: aiPrompt,
      selectedSceneSummaries,
      selectedCharacterIds,
    });
    // Reset and close on success
    setAiPrompt("");
    setSelectedSceneSummaries([]);
    setSelectedCharacterIds(characters.map((c) => c.id));
    onClose();
  };

  const handleClose = () => {
    if (isGenerating) return;
    setAiPrompt("");
    setSelectedSceneSummaries([]);
    setSelectedCharacterIds(characters.map((c) => c.id));
    onClose();
  };

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

        {characters.length > 0 && (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              👥 选择参考角色（可选）
            </label>
            <div class="flex flex-wrap gap-2">
              {characters.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    setSelectedCharacterIds((prev) =>
                      prev.includes(c.id)
                        ? prev.filter((id) => id !== c.id)
                        : [...prev, c.id],
                    )
                  }
                  class={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedCharacterIds.includes(c.id)
                      ? "bg-primary-600 text-white"
                      : "bg-dark-surface text-gray-300 hover:bg-dark-accent"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

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

        {(isGenerating || streamingContent || thinkingContent) && (
          <div class="space-y-2">
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
                {streamingContent || "正在生成..."}
              </div>
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
              !selectedProviderId || !selectedModel || !aiPrompt.trim() || selectedCharacterIds.length === 0
            }
          >
            {isGenerating ? "生成中..." : "✨ 生成"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
