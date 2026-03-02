/**
 * 编辑 Provider 模态框
 */
import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Card, Modal, Input } from "@components/ui/common";
import type { ProviderConfig } from "@stores/types";

interface EditProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ProviderConfig>) => void;
  provider: ProviderConfig | null;
}

export const EditProviderModal: FunctionalComponent<EditProviderModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  provider,
}) => {
  // 本地状态，用于编辑
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [supportsThinking, setSupportsThinking] = useState(false);
  const [thinkingType, setThinkingType] = useState<"thinking" | "reasoning_effort">("thinking");
  const [thinkingParamKey, setThinkingParamKey] = useState("");
  const [thinkingParamType, setThinkingParamType] = useState<"boolean" | "object">("object");
  const [reasoningEffort, setReasoningEffort] = useState<"low" | "medium" | "high">("medium");

  // 初始化本地状态
  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setApiKey(provider.api_key);
      setBaseUrl(provider.base_url || "");
      setSupportsThinking(provider.supports_thinking ?? false);
      
      // 判断当前类型 - 兼容旧配置
      if (provider.reasoning_effort !== undefined) {
        // Reasoning Effort 系
        setThinkingType("reasoning_effort");
        setReasoningEffort(provider.reasoning_effort || "medium");
      } else if (provider.thinking_param_key) {
        // Thinking 系（包括旧版 enable_thinking）
        setThinkingType("thinking");
        setThinkingParamKey(provider.thinking_param_key || "thinking");
        setThinkingParamType(provider.thinking_param_type || "object");
      } else {
        // 默认
        setThinkingType("thinking");
        setThinkingParamKey("thinking");
        setThinkingParamType("object");
      }
    }
  }, [provider]);

  const handleUpdateProvider = () => {
    if (!provider) return;
    const updates: Partial<ProviderConfig> = {
      name,
      api_key: apiKey,
      base_url: baseUrl,
      supports_thinking: supportsThinking,
    };

    if (thinkingType === "reasoning_effort") {
      // Reasoning Effort 系
      updates.thinking_param_key = "reasoning_effort";
      updates.thinking_param_type = undefined;
      updates.thinking_param_default = undefined;
      updates.thinking_param_disabled = undefined;
      updates.reasoning_effort = reasoningEffort;
    } else {
      // Thinking 系
      updates.thinking_param_key = thinkingParamKey;
      updates.thinking_param_type = thinkingParamType;
      updates.thinking_param_default = thinkingParamType === "object"
        ? { type: "enabled" }
        : true;
      updates.thinking_param_disabled = thinkingParamType === "object"
        ? { type: "disabled" }
        : false;
      updates.reasoning_effort = undefined;
    }

    onUpdate(provider.id, updates);
    onClose();
  };

  if (!isOpen || !provider) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑 Provider"
      size="lg"
    >
      <div class="space-y-4">
        <Input
          label="名称"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
        <Input
          label="API Key"
          type="password"
          value={apiKey}
          onInput={(e) => setApiKey((e.target as HTMLInputElement).value)}
        />
        <Input
          label="Base URL"
          value={baseUrl}
          onInput={(e) => setBaseUrl((e.target as HTMLInputElement).value)}
        />
        <Card hover={false} class="p-3 bg-dark-accent/30">
          <div class="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="edit-supports-thinking"
              checked={supportsThinking}
              onChange={(e) => setSupportsThinking((e.target as HTMLInputElement).checked)}
              class="w-4 h-4 rounded"
            />
            <label htmlFor="edit-supports-thinking" class="text-sm font-medium text-gray-300">
              🧠 这个 Provider 支持思考模式
            </label>
          </div>
          {supportsThinking && (
            <div class="ml-6 space-y-3">
              {/* 类型选择 - 允许切换 */}
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">
                  思考控制类型
                </label>
                <select
                  value={thinkingType}
                  onChange={(e) => setThinkingType((e.target as HTMLSelectElement).value as "thinking" | "reasoning_effort")}
                  class="w-full px-4 py-2 bg-dark-accent rounded-lg text-white"
                >
                  <option value="thinking">
                    Thinking 系（thinking 参数，如智谱 GLM）
                  </option>
                  <option value="reasoning_effort">
                    Reasoning Effort 系（reasoning_effort 参数，如 OpenAI GPT-OSS）
                  </option>
                </select>
              </div>

              {thinkingType === "reasoning_effort" ? (
                // Reasoning Effort 系
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    推理强度
                  </label>
                  <select
                    value={reasoningEffort}
                    onChange={(e) => setReasoningEffort((e.target as HTMLSelectElement).value as "low" | "medium" | "high")}
                    class="w-full px-4 py-2 bg-dark-accent rounded-lg text-white"
                  >
                    <option value="low">Low - 最小推理，更快响应</option>
                    <option value="medium">Medium - 中等推理（默认）</option>
                    <option value="high">High - 深度推理，更全面分析</option>
                  </select>
                </div>
              ) : (
                // Thinking 系
                <>
                  <Input
                    label="思考参数键名"
                    value={thinkingParamKey}
                    onInput={(e) => setThinkingParamKey((e.target as HTMLInputElement).value)}
                    placeholder="如：thinking"
                  />
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                      参数类型
                    </label>
                    <select
                      value={thinkingParamType}
                      onChange={(e) => setThinkingParamType((e.target as HTMLSelectElement).value as "boolean" | "object")}
                      class="w-full px-4 py-2 bg-dark-accent rounded-lg text-white"
                    >
                      <option value="object">Object</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleUpdateProvider}>保存</Button>
        </div>
      </div>
    </Modal>
  );
};
