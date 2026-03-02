/**
 * 添加 Provider 模态框
 */
import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Card, Modal, Input } from "@components/ui/common";
import { getProviderPreset, getSupportedProviders } from "@/providers/presets";
import type { ProviderConfig, ProviderType } from "@stores/types";

interface AddProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: Omit<ProviderConfig, "id">) => void;
  providers: ProviderConfig[];
  presetData?: Partial<ProviderConfig>; // 可选的预设数据
}

export const AddProviderModal: FunctionalComponent<AddProviderModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  providers,
  presetData,
}) => {
  const [newProviderType, setNewProviderType] = useState<ProviderType>("openai");
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderApiKey, setNewProviderApiKey] = useState("");
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState("");
  const [newProviderSupportsThinking, setNewProviderSupportsThinking] = useState(false);
  const [newProviderThinkingType, setNewProviderThinkingType] = useState<"thinking" | "reasoning_effort">("thinking");
  const [newProviderThinkingParamKey, setNewProviderThinkingParamKey] = useState("thinking");
  const [newProviderThinkingParamType, setNewProviderThinkingParamType] = useState<"boolean" | "object">("object");
  const [newProviderReasoningEffort, setNewProviderReasoningEffort] = useState<"low" | "medium" | "high">("medium");

  // 使用预设数据初始化
  useEffect(() => {
    if (presetData) {
      if (presetData.type) setNewProviderType(presetData.type);
      if (presetData.name) setNewProviderName(presetData.name);
      if (presetData.base_url) setNewProviderBaseUrl(presetData.base_url);
      if (presetData.supports_thinking !== undefined) {
        setNewProviderSupportsThinking(presetData.supports_thinking);
      }
      // 根据预设数据判断类型
      if (presetData.reasoning_effort !== undefined) {
        setNewProviderThinkingType("reasoning_effort");
        setNewProviderReasoningEffort(presetData.reasoning_effort);
      } else if (presetData.thinking_param_key) {
        setNewProviderThinkingType("thinking");
        setNewProviderThinkingParamKey(presetData.thinking_param_key);
        if (presetData.thinking_param_type) {
          setNewProviderThinkingParamType(presetData.thinking_param_type);
        }
      }
    }
  }, [presetData]);

  const supportedProviders = getSupportedProviders();
  const currentPreset = getProviderPreset(newProviderType);

  const handleAddProvider = () => {
    const preset = getProviderPreset(newProviderType);
    const updates: Partial<ProviderConfig> = {
      name: newProviderName || preset?.name || newProviderType,
      type: newProviderType,
      api_key: newProviderApiKey,
      base_url: newProviderBaseUrl || preset?.defaultBaseUrl,
      is_active: providers.length === 0,
      supports_thinking: newProviderSupportsThinking,
    };

    if (newProviderThinkingType === "thinking") {
      updates.thinking_param_key = newProviderThinkingParamKey;
      updates.thinking_param_type = newProviderThinkingParamType;
      updates.thinking_param_default =
        newProviderThinkingParamType === "object"
          ? { type: "enabled" }
          : true;
      updates.thinking_param_disabled =
        newProviderThinkingParamType === "object"
          ? { type: "disabled" }
          : false;
    } else if (newProviderThinkingType === "reasoning_effort") {
      updates.reasoning_effort = newProviderReasoningEffort;
    }

    onAdd(updates as Omit<ProviderConfig, "id">);
    onClose();
    resetAddForm();
  };

  const resetAddForm = () => {
    setNewProviderType("openai");
    setNewProviderName("");
    setNewProviderApiKey("");
    setNewProviderBaseUrl("");
    setNewProviderSupportsThinking(false);
    setNewProviderThinkingType("thinking");
    setNewProviderThinkingParamKey("thinking");
    setNewProviderThinkingParamType("object");
    setNewProviderReasoningEffort("medium");
  };

  const handleProviderTypeChange = (type: ProviderType) => {
    const preset = getProviderPreset(type);
    setNewProviderType(type);
    if (preset) {
      setNewProviderName(preset.name);
      setNewProviderBaseUrl(preset.defaultBaseUrl);
      setNewProviderSupportsThinking(preset.supportsThinking ?? false);
      // 根据预设配置设置 thinking 类型
      if (preset.reasoningEffort) {
        setNewProviderThinkingType("reasoning_effort");
        setNewProviderReasoningEffort(preset.reasoningEffort);
      } else if (preset.thinkingParamKey) {
        setNewProviderThinkingType("thinking");
        setNewProviderThinkingParamKey(preset.thinkingParamKey);
        setNewProviderThinkingParamType(preset.thinkingParamType || "object");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        resetAddForm();
      }}
      title="添加 Provider"
      size="lg"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">
            Provider 类型
          </label>
          <select
            value={newProviderType}
            onChange={(e) => handleProviderTypeChange((e.target as HTMLSelectElement).value as ProviderType)}
            class="w-full px-4 py-2 bg-dark-accent border border-transparent rounded-lg text-white"
          >
            {supportedProviders.map((p) => (
              <option key={p.type} value={p.type}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="名称"
          value={newProviderName}
          onInput={(e) => setNewProviderName((e.target as HTMLInputElement).value)}
          placeholder={currentPreset?.name}
        />
        <Input
          label="API Key"
          type="password"
          value={newProviderApiKey}
          onInput={(e) => setNewProviderApiKey((e.target as HTMLInputElement).value)}
          placeholder="请输入 API Key"
          required
        />
        <Input
          label="Base URL"
          value={newProviderBaseUrl}
          onInput={(e) => setNewProviderBaseUrl((e.target as HTMLInputElement).value)}
          placeholder={currentPreset?.defaultBaseUrl}
        />

        <Card hover={false} class="p-3 bg-dark-accent/30">
          <div class="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="new-supports-thinking"
              checked={newProviderSupportsThinking}
              onChange={(e) => setNewProviderSupportsThinking((e.target as HTMLInputElement).checked)}
              class="w-4 h-4 rounded"
            />
            <label htmlFor="new-supports-thinking" class="text-sm font-medium text-gray-300">
              🧠 这个 Provider 支持思考模式
            </label>
          </div>
          {newProviderSupportsThinking && (
            <div class="ml-6 space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">
                  思考控制类型
                </label>
                <select
                  value={newProviderThinkingType}
                  onChange={(e) => setNewProviderThinkingType((e.target as HTMLSelectElement).value as "thinking" | "reasoning_effort")}
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

              {newProviderThinkingType === "thinking" && (
                <>
                  <Input
                    label="思考参数键名"
                    value={newProviderThinkingParamKey}
                    onInput={(e) => setNewProviderThinkingParamKey((e.target as HTMLInputElement).value)}
                    placeholder="如：thinking"
                  />
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                      参数类型
                    </label>
                    <select
                      value={newProviderThinkingParamType}
                      onChange={(e) => setNewProviderThinkingParamType((e.target as HTMLSelectElement).value as "boolean" | "object")}
                      class="w-full px-4 py-2 bg-dark-accent rounded-lg text-white"
                    >
                      <option value="object">
                        Object (如：thinking: {"{"} type: "enabled" {"}"})
                      </option>
                      <option value="boolean">
                        Boolean (如：thinking: true)
                      </option>
                    </select>
                  </div>
                </>
              )}

              {newProviderThinkingType === "reasoning_effort" && (
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    推理强度
                  </label>
                  <select
                    value={newProviderReasoningEffort}
                    onChange={(e) => setNewProviderReasoningEffort((e.target as HTMLSelectElement).value as "low" | "medium" | "high")}
                    class="w-full px-4 py-2 bg-dark-accent rounded-lg text-white"
                  >
                    <option value="low">Low - 最小推理，更快响应</option>
                    <option value="medium">Medium - 中等推理（默认）</option>
                    <option value="high">High - 深度推理，更全面分析</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </Card>

        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={() => { onClose(); resetAddForm(); }}>
            取消
          </Button>
          <Button onClick={handleAddProvider}>添加</Button>
        </div>
      </div>
    </Modal>
  );
};
