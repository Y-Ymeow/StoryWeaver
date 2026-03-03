/**
 * 通用模型选择组件
 * 用于各种需要选择 AI 模型的场景
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Modal, Input, Card } from "@components/ui/common";
import type { ModelSelectorProps } from "@/types/common";

export const ModelSelector: FunctionalComponent<ModelSelectorProps> = ({
  isOpen,
  onClose,
  onConfirm,
  providers,
  initialProviderId,
  initialModel,
  initialIsThinkingModel,
  initialEnableThinking,
  initialThinkingBudget,
}) => {
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    initialProviderId || null,
  );
  const [selectedModel, setSelectedModel] = useState(initialModel || "");
  const [isThinkingModel, setIsThinkingModel] = useState(false);
  const [enableThinking, setEnableThinking] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(
    initialThinkingBudget ?? 1024,
  );

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  useEffect(() => {
    if (!isOpen) return;
    const fallbackProviderId =
      initialProviderId && providers.some((p) => p.id === initialProviderId)
        ? initialProviderId
        : providers[0]?.id || null;
    setSelectedProviderId(fallbackProviderId);

    const provider = providers.find((p) => p.id === fallbackProviderId);
    if (!provider) {
      setSelectedModel("");
      setIsThinkingModel(false);
      setEnableThinking(false);
      return;
    }

    const fallbackModel =
      initialModel || provider.custom_models?.[0] || provider.model || "";
    setSelectedModel(fallbackModel);
    // 使用传入的初始值，如果没有传入则使用 provider 的默认值
    setIsThinkingModel(
      initialIsThinkingModel ?? provider.supports_thinking ?? false,
    );
    setEnableThinking(initialEnableThinking ?? false);
    setThinkingBudget(initialThinkingBudget ?? 1024);
  }, [
    isOpen,
    initialProviderId,
    initialModel,
    initialIsThinkingModel,
    initialEnableThinking,
    initialThinkingBudget,
    providers,
  ]);

  const handleConfirm = () => {
    if (!selectedProviderId || !selectedModel) return;

    onConfirm({
      providerId: selectedProviderId,
      model: selectedModel,
      isThinkingModel,
      enableThinking: isThinkingModel ? enableThinking : false,
      thinkingBudget,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚙️ 选择模型" size="lg">
      <div class="space-y-4">
        {/* Provider 选择 */}
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            选择 Provider
          </label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  setSelectedProviderId(provider.id);
                  const model = provider.custom_models?.[0] || provider.model;
                  if (model) setSelectedModel(model);
                }}
                class={`p-3 rounded-lg text-sm transition-colors text-left ${
                  selectedProviderId === provider.id
                    ? "bg-primary-600 text-white"
                    : "bg-dark-surface text-gray-300 hover:bg-dark-accent"
                }`}
              >
                <div class="font-medium">{provider.name}</div>
                {provider.is_active && (
                  <div class="text-xs opacity-75">● 激活</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 模型选择 */}
        {selectedProviderId && (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              选择模型
            </label>
            <Input
              value={selectedModel}
              onInput={(e) =>
                setSelectedModel((e.target as HTMLInputElement).value)
              }
              placeholder="输入模型名称"
            />
            {selectedProvider?.custom_models &&
              selectedProvider.custom_models.length > 0 && (
                <div class="flex flex-wrap gap-2 mt-2">
                  {selectedProvider.custom_models.map((model) => (
                    <button
                      key={model}
                      onClick={() => setSelectedModel(model)}
                      class={`px-3 py-1 rounded text-xs ${
                        selectedModel === model
                          ? "bg-primary-600 text-white"
                          : "bg-dark-accent text-gray-300 hover:bg-dark-surface"
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* 思考模式控制 */}
        {selectedProvider?.supports_thinking && (
          <Card class="p-3 bg-dark-accent/30">
            <div class="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="is-thinking-model"
                checked={isThinkingModel}
                onChange={(e) =>
                  setIsThinkingModel((e.target as HTMLInputElement).checked)
                }
                class="w-4 h-4 rounded"
              />
              <label
                htmlFor="is-thinking-model"
                class="text-sm font-medium text-gray-300"
              >
                🧠 这是思考模型（需要显式控制思考）
              </label>
            </div>

            {isThinkingModel && (
              <>
                <div class="flex items-center gap-2 mb-3 ml-6">
                  <input
                    type="checkbox"
                    id="enable-thinking"
                    checked={enableThinking}
                    onChange={(e) =>
                      setEnableThinking((e.target as HTMLInputElement).checked)
                    }
                    class="w-4 h-4 rounded"
                  />
                  <label
                    htmlFor="enable-thinking"
                    class="text-sm font-medium text-gray-300"
                  >
                    启用思考模式
                    {enableThinking && (
                      <span class="text-xs text-gray-400 ml-1">
                        ({selectedProvider.thinking_param_key || "thinking"})
                      </span>
                    )}
                  </label>
                </div>

                {enableThinking && (
                  <div class="ml-6">
                    <label class="block text-xs text-gray-400 mb-1">
                      思考 Token 预算
                    </label>
                    <Input
                      type="number"
                      value={String(thinkingBudget)}
                      onInput={(e) =>
                        setThinkingBudget(
                          parseInt((e.target as HTMLInputElement).value) ||
                            1024,
                        )
                      }
                      placeholder="1024"
                      class="w-32"
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        <div class="flex justify-end gap-3 pt-4 border-t border-dark-accent">
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedProviderId || !selectedModel}
          >
            确认
          </Button>
        </div>
      </div>
    </Modal>
  );
};
