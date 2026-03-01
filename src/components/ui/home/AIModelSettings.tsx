import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Card, Modal, Input } from "@components/ui/common";
import { getProviderPreset, getSupportedProviders } from "@/providers/presets";
import type { ProviderConfig, ProviderType } from "@stores/types";

interface AIModelSettingsProps {
  onClose: () => void;
  providers: ProviderConfig[];
  activeProviderId?: string | null;
  onAddProvider: (config: Omit<ProviderConfig, "id">) => void;
  onUpdateProvider: (id: string, updates: Partial<ProviderConfig>) => void;
  onDeleteProvider: (id: string) => void;
  onSetActive: (id: string) => void;
  onFetchModels: (providerId: string) => Promise<string[]>;
}

export const AIModelSettings: FunctionalComponent<AIModelSettingsProps> = ({
  onClose,
  providers,
  activeProviderId,
  onAddProvider,
  onUpdateProvider,
  onDeleteProvider,
  onSetActive,
  onFetchModels,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(
    null,
  );
  const [editingProviderForModel, setEditingProviderForModel] =
    useState<ProviderConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [newModelEnableThinking, setNewModelEnableThinking] = useState(true);

  const [newProviderType, setNewProviderType] =
    useState<ProviderType>("openai");
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderApiKey, setNewProviderApiKey] = useState("");
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState("");
  const [newProviderSupportsThinking, setNewProviderSupportsThinking] =
    useState(false);
  const [newProviderThinkingParamKey, setNewProviderThinkingParamKey] =
    useState("enable_thinking");
  const [newProviderThinkingParamType, setNewProviderThinkingParamType] =
    useState<"boolean" | "object">("boolean");

  const supportedProviders = getSupportedProviders();

  const handleAddProvider = () => {
    const preset = getProviderPreset(newProviderType);
    onAddProvider({
      name: newProviderName || preset?.name || newProviderType,
      type: newProviderType,
      api_key: newProviderApiKey,
      base_url: newProviderBaseUrl || preset?.defaultBaseUrl,
      is_active: providers.length === 0,
      supports_thinking: newProviderSupportsThinking,
      thinking_param_key: newProviderThinkingParamKey,
      thinking_param_type: newProviderThinkingParamType,
      thinking_param_default:
        newProviderThinkingParamType === "object"
          ? { type: "enabled" }
          : undefined,
    });
    setIsAddModalOpen(false);
    resetAddForm();
    setMessage({ type: "success", text: "Provider 添加成功" });
  };

  const resetAddForm = () => {
    setNewProviderType("openai");
    setNewProviderName("");
    setNewProviderApiKey("");
    setNewProviderBaseUrl("");
    setNewProviderSupportsThinking(false);
    setNewProviderThinkingParamKey("enable_thinking");
    setNewProviderThinkingParamType("boolean");
  };

  const handleEditProvider = (provider: ProviderConfig) => {
    setEditingProvider(provider);
    setIsEditModalOpen(true);
  };

  const handleUpdateProvider = () => {
    if (!editingProvider) return;
    onUpdateProvider(editingProvider.id, {
      name: editingProvider.name,
      api_key: editingProvider.api_key,
      base_url: editingProvider.base_url,
      supports_thinking: editingProvider.supports_thinking,
      thinking_param_key: editingProvider.thinking_param_key,
      thinking_param_type: editingProvider.thinking_param_type,
      thinking_param_default:
        editingProvider.thinking_param_type === "object"
          ? { type: "enabled" }
          : undefined,
    });
    setIsEditModalOpen(false);
    setEditingProvider(null);
    setMessage({ type: "success", text: "Provider 更新成功" });
  };

  const handleDeleteProvider = (id: string) => {
    if (confirm("确定要删除这个 Provider 吗？")) {
      onDeleteProvider(id);
      setMessage({ type: "success", text: "Provider 已删除" });
    }
  };

  const handleFetchModels = async (provider: ProviderConfig) => {
    setIsLoading(true);
    try {
      const models = await onFetchModels(provider.id);
      if (models.length > 0) {
        onUpdateProvider(provider.id, {
          custom_models: [...(provider.custom_models || []), ...models],
        });
        setMessage({ type: "success", text: `获取到 ${models.length} 个模型` });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "获取模型列表失败",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModelModal = (provider: ProviderConfig) => {
    setEditingProviderForModel(provider);
    setIsModelModalOpen(true);
  };

  const handleAddModel = () => {
    if (!editingProviderForModel || !newModelName.trim()) return;
    const updatedModels = [
      ...(editingProviderForModel.custom_models || []),
      newModelName.trim(),
    ];
    onUpdateProvider(editingProviderForModel.id, {
      custom_models: updatedModels,
    });
    setEditingProviderForModel({
      ...editingProviderForModel,
      custom_models: updatedModels,
    });
    setNewModelName("");
  };

  const handleRemoveModel = (modelIndex: number) => {
    if (!editingProviderForModel) return;
    const updatedModels = (editingProviderForModel.custom_models || []).filter(
      (_, i) => i !== modelIndex,
    );
    onUpdateProvider(editingProviderForModel.id, {
      custom_models: updatedModels,
    });
    setEditingProviderForModel({
      ...editingProviderForModel,
      custom_models: updatedModels,
    });
  };

  const updateEditingProvider = (updates: Partial<ProviderConfig>) => {
    if (editingProvider) {
      setEditingProvider({ ...editingProvider, ...updates });
    }
  };

  const currentPreset = getProviderPreset(newProviderType);

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="⚙️ AI 模型设置" size="xl">
        <div class="space-y-4">
          {message && (
            <div
              class={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-900/30 border border-green-500 text-green-300"
                  : "bg-red-900/30 border border-red-500 text-red-300"
              }`}
            >
              {message.text}
            </div>
          )}

          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">已添加的 Provider</h3>
            <Button onClick={() => setIsAddModalOpen(true)} size="sm">
              ➕ 添加 Provider
            </Button>
          </div>

          {providers.length === 0 ? (
            <div class="text-gray-500 text-center py-8">
              暂无 Provider，请添加
            </div>
          ) : (
            <div class="space-y-2">
              {providers.map((provider) => (
                <Card key={provider.id} hover={false}>
                  <div class="flex max-md:flex-col gap-2 md:items-center justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-semibold text-white">
                          {provider.name}
                        </span>
                        <span class="text-xs px-2 py-0.5 bg-dark-accent rounded text-gray-300">
                          {provider.type}
                        </span>
                        {activeProviderId === provider.id && (
                          <span class="text-xs px-2 py-0.5 bg-green-900/50 rounded text-green-400">
                            使用中
                          </span>
                        )}
                        {provider.supports_thinking && (
                          <span class="text-xs px-2 py-0.5 bg-purple-900/50 rounded text-purple-400">
                            🧠 支持思考
                          </span>
                        )}
                      </div>
                      <div class="text-sm text-gray-400">
                        <p>
                          API Key: {provider.api_key.slice(0, 8)}...
                          {provider.api_key.slice(-4)}
                        </p>
                        <p>Base URL: {provider.base_url || "默认"}</p>
                        <p>模型数量：{provider.custom_models?.length || 0}</p>
                      </div>
                    </div>
                    <div class="flex flex-col max-md:grid max-md:grid-cols-2 gap-2">
                      {activeProviderId !== provider.id && (
                        <Button
                          onClick={() => onSetActive(provider.id)}
                          size="sm"
                          variant="primary"
                        >
                          设为激活
                        </Button>
                      )}
                      <Button
                        onClick={() => handleOpenModelModal(provider)}
                        size="sm"
                        variant="secondary"
                      >
                        📋 管理模型
                      </Button>
                      <Button
                        onClick={() => handleFetchModels(provider)}
                        size="sm"
                        variant="secondary"
                        isLoading={isLoading}
                      >
                        🔄 获取模型列表
                      </Button>
                      <Button
                        onClick={() => handleEditProvider(provider)}
                        size="sm"
                        variant="secondary"
                      >
                        编辑
                      </Button>
                      <Button
                        onClick={() => handleDeleteProvider(provider.id)}
                        size="sm"
                        variant="danger"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div class="space-y-2">
            <h3 class="text-lg font-semibold text-white">快速添加</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              {supportedProviders
                .filter((p) => p.type !== "custom")
                .map((preset) => (
                  <button
                    key={preset.type}
                    onClick={() => {
                      setNewProviderType(preset.type);
                      setNewProviderName(preset.name);
                      setNewProviderBaseUrl(preset.defaultBaseUrl);
                      setNewProviderSupportsThinking(
                        preset.supportsThinking ?? false,
                      );
                      setNewProviderThinkingParamKey(
                        preset.thinkingParamKey || "enable_thinking",
                      );
                      setNewProviderThinkingParamType(
                        preset.thinkingParamType || "boolean",
                      );
                      setIsAddModalOpen(true);
                    }}
                    class="p-3 bg-dark-surface hover:bg-dark-accent rounded-lg text-sm text-gray-300 hover:text-white transition-colors text-left"
                  >
                    {preset.name}
                    {preset.supportsThinking && (
                      <div class="text-xs text-purple-400 mt-1">
                        🧠 支持思考
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
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
              onChange={(e) => {
                const type = (e.target as HTMLSelectElement)
                  .value as ProviderType;
                const preset = getProviderPreset(type);
                setNewProviderType(type);
                if (preset) {
                  setNewProviderName(preset.name);
                  setNewProviderBaseUrl(preset.defaultBaseUrl);
                  setNewProviderSupportsThinking(
                    preset.supportsThinking ?? false,
                  );
                  setNewProviderThinkingParamKey(
                    preset.thinkingParamKey || "enable_thinking",
                  );
                  setNewProviderThinkingParamType(
                    preset.thinkingParamType || "boolean",
                  );
                }
              }}
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
            onInput={(e) =>
              setNewProviderName((e.target as HTMLInputElement).value)
            }
            placeholder={currentPreset?.name}
          />
          <Input
            label="API Key"
            type="password"
            value={newProviderApiKey}
            onInput={(e) =>
              setNewProviderApiKey((e.target as HTMLInputElement).value)
            }
            placeholder="请输入 API Key"
            required
          />
          <Input
            label="Base URL"
            value={newProviderBaseUrl}
            onInput={(e) =>
              setNewProviderBaseUrl((e.target as HTMLInputElement).value)
            }
            placeholder={currentPreset?.defaultBaseUrl}
          />

          <Card hover={false} class="p-3 bg-dark-accent/30">
            <div class="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="new-supports-thinking"
                checked={newProviderSupportsThinking}
                onChange={(e) =>
                  setNewProviderSupportsThinking(
                    (e.target as HTMLInputElement).checked,
                  )
                }
                class="w-4 h-4 rounded"
              />
              <label
                htmlFor="new-supports-thinking"
                class="text-sm font-medium text-gray-300"
              >
                🧠 这个 Provider 支持思考模式
              </label>
            </div>
            {newProviderSupportsThinking && (
              <div class="ml-6 space-y-3">
                <Input
                  label="思考参数键名"
                  value={newProviderThinkingParamKey}
                  onInput={(e) =>
                    setNewProviderThinkingParamKey(
                      (e.target as HTMLInputElement).value,
                    )
                  }
                  placeholder="如：enable_thinking 或 thinking"
                />
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    参数类型
                  </label>
                  <select
                    value={newProviderThinkingParamType}
                    onChange={(e) =>
                      setNewProviderThinkingParamType(
                        (e.target as HTMLSelectElement).value as
                          | "boolean"
                          | "object",
                      )
                    }
                    class="w-full px-4 py-2 bg-dark-accent rounded-lg text-white"
                  >
                    <option value="boolean">
                      Boolean (如：enable_thinking: true)
                    </option>
                    <option value="object">
                      Object (如：thinking: {"{"} type: "enabled" {"}"})
                    </option>
                  </select>
                </div>
              </div>
            )}
          </Card>

          <div class="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                resetAddForm();
              }}
            >
              取消
            </Button>
            <Button onClick={handleAddProvider}>添加</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProvider(null);
        }}
        title="编辑 Provider"
        size="lg"
      >
        {editingProvider && (
          <div class="space-y-4">
            <Input
              label="名称"
              value={editingProvider.name}
              onInput={(e) =>
                updateEditingProvider({
                  name: (e.target as HTMLInputElement).value,
                })
              }
            />
            <Input
              label="API Key"
              type="password"
              value={editingProvider.api_key}
              onInput={(e) =>
                updateEditingProvider({
                  api_key: (e.target as HTMLInputElement).value,
                })
              }
            />
            <Input
              label="Base URL"
              value={editingProvider.base_url || ""}
              onInput={(e) =>
                updateEditingProvider({
                  base_url: (e.target as HTMLInputElement).value,
                })
              }
            />
            <Card hover={false} class="p-3 bg-dark-accent/30">
              <div class="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="edit-supports-thinking"
                  checked={editingProvider.supports_thinking ?? false}
                  onChange={(e) =>
                    updateEditingProvider({
                      supports_thinking: (e.target as HTMLInputElement).checked,
                    })
                  }
                  class="w-4 h-4 rounded"
                />
                <label
                  htmlFor="edit-supports-thinking"
                  class="text-sm font-medium text-gray-300"
                >
                  🧠 这个 Provider 支持思考模式
                </label>
              </div>
              {editingProvider.supports_thinking && (
                <div class="ml-6 space-y-3">
                  <Input
                    label="思考参数键名"
                    value={editingProvider.thinking_param_key || ""}
                    onInput={(e) =>
                      updateEditingProvider({
                        thinking_param_key: (e.target as HTMLInputElement)
                          .value,
                      })
                    }
                  />
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                      参数类型
                    </label>
                    <select
                      value={editingProvider.thinking_param_type || "boolean"}
                      onChange={(e) =>
                        updateEditingProvider({
                          thinking_param_type: (e.target as HTMLSelectElement)
                            .value as "boolean" | "object",
                        })
                      }
                      class="w-full px-4 py-2 bg-dark-accent rounded-lg text-white"
                    >
                      <option value="boolean">Boolean</option>
                      <option value="object">Object</option>
                    </select>
                  </div>
                </div>
              )}
            </Card>
            <div class="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingProvider(null);
                }}
              >
                取消
              </Button>
              <Button onClick={handleUpdateProvider}>保存</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 模型管理模态框 */}
      <Modal
        isOpen={isModelModalOpen}
        onClose={() => {
          setIsModelModalOpen(false);
          setEditingProviderForModel(null);
        }}
        title="📋 管理模型"
        size="lg"
      >
        {editingProviderForModel && (
          <div class="space-y-4">
            <div class="text-sm text-gray-400">
              Provider:{" "}
              <span class="text-white">{editingProviderForModel.name}</span>
              {editingProviderForModel.supports_thinking && (
                <span class="ml-2 text-purple-400">🧠 支持思考模式</span>
              )}
            </div>

            {/* 添加模型 */}
            <div class="flex gap-2 items-end">
              <div class="flex-1">
                <Input
                  label="添加模型"
                  value={newModelName}
                  onInput={(e) =>
                    setNewModelName((e.target as HTMLInputElement).value)
                  }
                  placeholder="模型名称，如：gpt-4"
                />
              </div>
              <Button onClick={handleAddModel} disabled={!newModelName.trim()}>
                添加
              </Button>
            </div>

            {/* 模型列表 */}
            {(editingProviderForModel.custom_models || []).length === 0 ? (
              <div class="text-gray-500 text-center py-8">
                暂无模型，请添加或从 API 获取
              </div>
            ) : (
              <div class="space-y-2 max-h-60 overflow-y-auto">
                {(editingProviderForModel.custom_models || []).map(
                  (model, index) => (
                    <div
                      key={index}
                      class="flex items-center justify-between p-2 bg-dark-accent/30 rounded"
                    >
                      <span class="text-white">{model}</span>
                      <Button
                        onClick={() => handleRemoveModel(index)}
                        size="sm"
                        variant="danger"
                      >
                        删除
                      </Button>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
