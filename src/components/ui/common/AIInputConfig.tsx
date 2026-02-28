import { FunctionalComponent } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { Button, Modal, Input, TextArea, Card, ModelButton } from "@components/ui/common";
import type { ProviderConfig } from "@stores/types";
import { createClient } from "@/lib/openai/client";

interface AIInputConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (result: {
    content: string;
    providerId: string;
    model: string;
    thinkingEnabled: boolean;
  }) => void;
  providers: ProviderConfig[];
  activeProviderId?: string | null;
  presetPrompt?: string;
  presetKeywords?: string;
  mode?: "room" | "character" | "scene" | "custom";
  roomContext?: {
    name?: string;
    setting?: string;
    plot_summary?: string;
    worldview?: string;
  };
  characters?: Array<{ name: string; background: string; dialogue_style: string }>;
  scenes?: Array<{ name: string; description: string; goal: string }>;
}

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
  const [enableThinking, setEnableThinking] = useState(true);
  const [thinkingBudget, setThinkingBudget] = useState(1024);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [thinkingContent, setThinkingContent] = useState("");
  const resultEndRef = useRef<HTMLDivElement>(null);

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

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

  // 滚动到结果底部
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
      const systemPrompt = getSystemPrompt(mode, roomContext, characters, scenes);
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildPrompt(prompt, keywords) },
      ];

      const thinking =
        isThinkingModel && enableThinking && selectedProvider.supports_thinking
          ? {
              enabled: true,
              param_key: selectedProvider.thinking_param_key,
              type: selectedProvider.thinking_param_type,
              default: selectedProvider.thinking_param_default,
              budget_tokens: thinkingBudget,
            }
          : undefined;

      // 使用流式响应
      const stream = client.chatStream(messages, {
        temperature: 0.7,
        max_tokens: 4096,
        thinking,
        model: selectedModel || undefined,
      });

      let fullContent = "";
      let inThinking = false;

      for await (const chunk of stream) {
        // 检测思考内容标记（不同模型可能不同）
        if (chunk.includes("<think>") || chunk.includes("<think>")) {
          inThinking = true;
          continue;
        }
        if (chunk.includes("</think>") || chunk.includes("</think>")) {
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
    <Modal isOpen={isOpen} onClose={onClose} title="🤖 AI 输入配置" size="xl">
      <div class="max-h-[80vh] overflow-y-auto space-y-4">
        {/* 模型选择 */}
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-400">
            当前模型：<span class="text-white">{providers.find(p => p.id === selectedProviderId)?.name || "未选择"} - {selectedModel || "未选择"}</span>
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
            onInput={(e) =>
              setPrompt((e.target as HTMLTextAreaElement).value)
            }
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
            onInput={(e) =>
              setKeywords((e.target as HTMLInputElement).value)
            }
            placeholder="如：古风，悬疑，复仇"
          />
        </div>

        {/* 流式生成中的思考内容 */}
        {(thinkingContent || isStreaming) && isThinkingModel && enableThinking && (
          <Card hover={false} class="p-4 bg-purple-900/20 border-purple-500/30">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">🧠</span>
              <label class="block text-sm font-medium text-purple-300">
                思考中...
              </label>
              {isStreaming && (
                <span class="text-xs text-purple-400 animate-pulse">● 实时显示</span>
              )}
            </div>
            <div class="text-sm text-purple-200/80 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono text-xs">
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
                  <span class="text-xs text-primary-400 animate-pulse">● 生成中...</span>
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

        <div class="flex justify-end gap-3 pt-4 border-t border-dark-accent">
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button
            onClick={handleGenerate}
            isLoading={isGenerating || isStreaming}
            disabled={!selectedProvider || !prompt.trim()}
          >
            {isGenerating || isStreaming ? (
              <span class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                生成中...
              </span>
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
      </div>
    </Modal>
  );
};

function buildPrompt(prompt: string, keywords: string): string {
  let result = prompt;
  if (keywords) result += `\n\n关键词：${keywords}`;
  return result;
}

function getSystemPrompt(
  mode: string,
  roomContext?: any,
  characters?: any[],
  scenes?: any[]
): string {
  const contextInfo = roomContext
    ? `
【故事背景】
- 名称：${roomContext.name || "未设置"}
- 设定：${roomContext.setting || "未设置"}
- 剧情大纲：${roomContext.plot_summary || "未设置"}
- 世界观：${roomContext.worldview || "未设置"}
`
    : "";

  const charactersInfo =
    characters && characters.length > 0
      ? `
【已创建的角色】
${characters
  .map(
    (c: any, i: number) =>
      `${i + 1}. ${c.name} - ${c.background || "无背景"} (${c.dialogue_style || "普通"}风格)`,
  )
  .join("\n")}
`
      : "";

  const scenesInfo =
    scenes && scenes.length > 0
      ? `
【已创建的场景】
${scenes
  .map(
    (s: any, i: number) => `${i + 1}. ${s.name} - ${s.description || "无描述"}`,
  )
  .join("\n")}
`
      : "";

  switch (mode) {
    case "room":
      return `你是一个专业的互动剧本创作助手。请根据用户描述生成一个完整的剧本房间设定。

请返回严格的 JSON 格式：
{
  "name": "剧本名称",
  "setting": "基本设定（200 字以内，描述故事背景）",
  "plot_summary": "剧情大纲（300 字以内，描述主要剧情发展）",
  "worldview": "世界观设定（故事发生的世界背景）",
  "tone": "基调（如：轻松、悬疑、悲伤等）"
}

只返回 JSON，不要有其他内容。`;
    case "character":
      return `你是一个专业的互动剧本角色设计师。请根据用户描述和故事背景生成 1-3 个剧本角色。
${contextInfo}${charactersInfo}
请返回严格的 JSON 格式：
{
  "characters": [
    {
      "name": "角色名称",
      "background": "角色背景（100 字以内，需要与故事背景相关联）",
      "dialogue_style": "台词风格（如：古风、现代、幽默等）",
      "is_user": false
    }
  ]
}

只返回 JSON，不要有其他内容。`;
    case "scene":
      return `你是一个专业的互动剧本场景设计师。请根据用户描述和故事背景生成 1-3 个剧本场景。
${contextInfo}${scenesInfo}
请返回严格的 JSON 格式：
{
  "scenes": [
    {
      "name": "场景名称",
      "description": "场景描述（100 字以内）",
      "goal": "场景目标（需要完成的剧情任务）",
      "setup": "场景布置（道具、特殊元素等）",
      "max_rounds": 10
    }
  ]
}

只返回 JSON，不要有其他内容。`;
    default:
      return "你是一个有用的 AI 助手。";
  }
}
