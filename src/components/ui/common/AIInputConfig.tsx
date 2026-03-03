import { FunctionalComponent } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import {
  Button,
  Modal,
  Input,
  TextArea,
  Card,
  ModelButton,
} from "@components/ui/common";
import type { AIInputConfigProps, AIInputMode } from "@/types/ai-input";
import {
  buildAIInputPrompt,
  getSystemPrompt,
} from "@/lib/prompts/ai-input";
import { createClient } from "@/lib/openai/client";

export const AIInputConfig: FunctionalComponent<AIInputConfigProps> = ({
  isOpen,
  onClose,
  onGenerate,
  providers,
  activeProviderId,
  presetPrompt = "",
  presetKeywords = "",
  mode = "custom",
  roomContext,
  characters = [],
  scenes = [],
}) => {
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    activeProviderId || null,
  );
  const [selectedModel, setSelectedModel] = useState("");
  const [prompt, setPrompt] = useState(presetPrompt);
  const [keywords, setKeywords] = useState(presetKeywords);
  const [isThinkingModel, setIsThinkingModel] = useState(false);
  const [enableThinking, setEnableThinking] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(1024);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [thinkingContent, setThinkingContent] = useState("");
  const [generationCount, setGenerationCount] = useState(3);
  const [selectedCharacterNames, setSelectedCharacterNames] = useState<string[]>([]);
  const [selectedSceneNames, setSelectedSceneNames] = useState<string[]>([]);
  const resultEndRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setPrompt(presetPrompt);
      setKeywords(presetKeywords);
      setResult("");
      setStreamingContent("");
      setThinkingContent("");
      setError(null);
      setIsStreaming(false);
      setIsGenerating(false);
      setGenerationCount(mode === "character" || mode === "scene" ? 3 : 1);
      setSelectedCharacterNames(characters.map((c) => c.name));
      setSelectedSceneNames(scenes.map((s) => s.name));
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, presetPrompt, presetKeywords, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const fallbackProviderId =
      activeProviderId ||
      providers.find((p) => p.is_active)?.id ||
      providers[0]?.id ||
      null;
    const hasSelectedProvider = selectedProviderId
      ? providers.some((p) => p.id === selectedProviderId)
      : false;
    if ((!selectedProviderId || !hasSelectedProvider) && fallbackProviderId) {
      setSelectedProviderId(fallbackProviderId);
    }
  }, [isOpen, providers, activeProviderId, selectedProviderId]);

  useEffect(() => {
    if (selectedProvider) {
      const models = selectedProvider.custom_models || [];
      if (models.length > 0) {
        setSelectedModel(models[0]);
      } else {
        setSelectedModel(selectedProvider.model || "");
      }
    }
  }, [selectedProviderId]);

  useEffect(() => {
    if (isStreaming && resultEndRef.current) {
      resultEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingContent, thinkingContent, isStreaming]);

  const handleGenerate = async () => {
    if (!selectedProvider || !prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setResult("");
    setStreamingContent("");
    setThinkingContent("");
    setIsStreaming(true);

    try {
      const client = createClient(selectedProvider);
      const systemPrompt = getSystemPrompt(
        mode,
        roomContext,
        selectedCharacterNames.length > 0
          ? characters.filter((c) => selectedCharacterNames.includes(c.name))
          : [],
        selectedSceneNames.length > 0
          ? scenes.filter((s) => selectedSceneNames.includes(s.name))
          : [],
      );
      const messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: buildAIInputPrompt(prompt, keywords, mode, generationCount),
        },
      ];

      const thinking =
        selectedProvider.supports_thinking && enableThinking
          ? {
              enabled: true,
              param_key: selectedProvider.thinking_param_key,
              type: selectedProvider.thinking_param_type,
              default: selectedProvider.thinking_param_default,
              budget_tokens: thinkingBudget,
            }
          : {
              enabled: false,
              param_key: selectedProvider.thinking_param_key,
              type: selectedProvider.thinking_param_type,
              disabled: selectedProvider.thinking_param_disabled,
            };

      const stream = client.chatStream(messages, {
        temperature: 0.7,
        max_tokens: 4096,
        thinking,
        // 只在启用思考模式时才发送 reasoning_effort
        ...(thinking?.enabled && selectedProvider.reasoning_effort
          ? { reasoning_effort: selectedProvider.reasoning_effort }
          : {}),
        model: selectedModel || undefined,
      });

      let fullContent = "";
      let inThinking = false;

      for await (const chunk of stream) {
        if (chunk.includes("<think>")) {
          inThinking = true;
          continue;
        }
        if (chunk.includes("</think>")) {
          inThinking = false;
          continue;
        }

        if (inThinking) {
          setThinkingContent((prev) => prev + chunk);
        } else {
          fullContent += chunk;
          setStreamingContent(fullContent);
        }
      }

      setResult(fullContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setIsGenerating(false);
      setIsStreaming(false);
    }
  };

  const handleConfirm = () => {
    if (!result || !selectedProvider) return;
    onGenerate({
      content: result,
      providerId: selectedProvider.id,
      model: selectedModel,
      thinkingEnabled: enableThinking,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🤖 AI 输入配置"
      size="xl"
      footer={
        <div class="flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button
            onClick={handleGenerate}
            isLoading={isGenerating || isStreaming}
            disabled={!selectedProvider || !prompt.trim()}
          >
            {isGenerating || isStreaming ? (
              <span class="flex items-center gap-2">生成中...</span>
            ) : (
              "✨ 生成"
            )}
          </Button>
          {result && (
            <Button onClick={handleConfirm} variant="primary">
              确认使用
            </Button>
          )}
        </div>
      }
    >
      <div class="space-y-4">
        {/* 模型选择 */}
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-400">
            当前模型：
            <span class="text-white">
              {providers.find((p) => p.id === selectedProviderId)?.name ||
                "未选择"}{" "}
              - {selectedModel || "未选择"}
            </span>
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
            value={prompt}
            onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
            placeholder="请输入你想要 AI 生成的内容..."
            rows={4}
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            🏷️ 关键词（可选）
          </label>
          <Input
            value={keywords}
            onInput={(e) => setKeywords((e.target as HTMLInputElement).value)}
            placeholder="如：古风，悬疑，复仇"
          />
        </div>

        {(mode === "character" || mode === "scene") && (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              📦 批量生成数量
            </label>
            <Input
              type="number"
              value={String(generationCount)}
              onInput={(e) =>
                setGenerationCount(
                  Math.max(
                    1,
                    Math.min(10, parseInt((e.target as HTMLInputElement).value) || 1),
                  ),
                )
              }
              placeholder="1-10"
            />
          </div>
        )}

        {mode === "scene" && characters.length > 0 && (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              👥 参考角色（可选）
            </label>
            <div class="flex flex-wrap gap-2">
              {characters.map((c) => (
                <button
                  key={c.name}
                  onClick={() =>
                    setSelectedCharacterNames((prev) =>
                      prev.includes(c.name)
                        ? prev.filter((n) => n !== c.name)
                        : [...prev, c.name],
                    )
                  }
                  class={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedCharacterNames.includes(c.name)
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

        {(mode === "character" || mode === "scene") && scenes.length > 0 && (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              📝 参考场景摘要（可选）
            </label>
            <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {scenes.map((s) => (
                <button
                  key={s.name}
                  onClick={() =>
                    setSelectedSceneNames((prev) =>
                      prev.includes(s.name)
                        ? prev.filter((n) => n !== s.name)
                        : [...prev, s.name],
                    )
                  }
                  class={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedSceneNames.includes(s.name)
                      ? "bg-primary-600 text-white"
                      : "bg-dark-surface text-gray-300 hover:bg-dark-accent"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 流式生成中的思考内容 */}
        {(thinkingContent || isStreaming) &&
          isThinkingModel &&
          enableThinking && (
            <Card
              hover={false}
              class="p-4 bg-purple-900/20 border-purple-500/30"
            >
              <div class="flex items-center gap-2 mb-2">
                <span class="text-lg">🧠</span>
                <label class="block text-sm font-medium text-purple-300">
                  思考中...
                </label>
                {isStreaming && (
                  <span class="text-xs text-purple-400 animate-pulse">
                    ● 实时显示
                  </span>
                )}
              </div>
              <div class="text-purple-200/80 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono text-xs">
                {thinkingContent || "正在思考..."}
              </div>
            </Card>
          )}

        {/* 生成结果 */}
        {(streamingContent || result) && (
          <Card hover={false} class="p-4 bg-dark-accent/30">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-lg">✨</span>
                <label class="block text-sm font-medium text-gray-300">
                  生成结果
                </label>
                {isStreaming && (
                  <span class="text-xs text-primary-400 animate-pulse">
                    ● 生成中...
                  </span>
                )}
              </div>
              <Button
                onClick={() => {
                  setResult("");
                  setStreamingContent("");
                  setThinkingContent("");
                }}
                size="sm"
                variant="ghost"
              >
                清除
              </Button>
            </div>
            <div class="text-sm text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {result || streamingContent}
            </div>
            <div ref={resultEndRef} />
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
