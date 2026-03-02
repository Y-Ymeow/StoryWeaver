/**
 * AI 模型设置 - 主组件
 */
import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Card, Modal } from "@components/ui/common";
import { getSupportedProviders } from "@/providers/presets";
import type { ProviderConfig, ProviderType } from "@stores/types";
import { AddProviderModal } from "./AddProviderModal";
import { EditProviderModal } from "./EditProviderModal";
import { ModelManagementModal } from "./ModelManagementModal";

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
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [editingProviderForModel, setEditingProviderForModel] = useState<ProviderConfig | null>(null);
  const [addProviderPreset, setAddProviderPreset] = useState<Partial<ProviderConfig> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supportedProviders = getSupportedProviders();

  // 迁移旧版 Provider 配置
  useEffect(() => {
    let needsMigration = false;
    const migratedProviders = providers.map((provider) => {
      const updates: Partial<ProviderConfig> = { ...provider };
      let changed = false;

      // 迁移 thinking_param_key 为 enable_thinking 的旧配置
      if (provider.thinking_param_key === "enable_thinking") {
        updates.thinking_param_key = "thinking";
        updates.thinking_param_type = "boolean";
        if (!updates.thinking_param_default) {
          updates.thinking_param_default = true;
        }
        changed = true;
      }

      // 迁移缺少 disabled 配置的 Thinking 系 Provider
      if (
        provider.supports_thinking &&
        provider.thinking_param_key &&
        provider.thinking_param_key !== "reasoning_effort" &&
        !provider.thinking_param_disabled
      ) {
        updates.thinking_param_disabled = provider.thinking_param_type === "object"
          ? { type: "disabled" }
          : false;
        changed = true;
      }

      // 确保 Thinking 系配置完整
      if (
        provider.supports_thinking &&
        provider.thinking_param_key &&
        provider.thinking_param_key !== "reasoning_effort"
      ) {
        if (!updates.thinking_param_type) {
          updates.thinking_param_type = "object";
          changed = true;
        }
        if (!updates.thinking_param_default) {
          updates.thinking_param_default = updates.thinking_param_type === "object"
            ? { type: "enabled" }
            : true;
          changed = true;
        }
      }

      if (changed) {
        needsMigration = true;
        return updates;
      }
      return provider;
    });

    if (needsMigration) {
      // 批量更新
      migratedProviders.forEach((provider) => {
        if (!provider.id) return; // 跳过没有 ID 的
        const original = providers.find(p => p.id === provider.id);
        if (original && provider !== original) {
          onUpdateProvider(provider.id, provider);
        }
      });
      setMessage({ type: "success", text: `已自动迁移 Provider 配置以支持新的思考控制模式` });
    }
  }, []); // 只在挂载时执行一次

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
                        <span class="font-semibold text-white">{provider.name}</span>
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
                        {provider.reasoning_effort && (
                          <span class="text-xs px-2 py-0.5 bg-blue-900/50 rounded text-blue-400">
                            🤖 Reasoning: {provider.reasoning_effort}
                          </span>
                        )}
                      </div>
                      <div class="text-sm text-gray-400">
                        <p>API Key: {provider.api_key.slice(0, 8)}...{provider.api_key.slice(-4)}</p>
                        <p>Base URL: {provider.base_url || "默认"}</p>
                        <p>模型数量：{provider.custom_models?.length || 0}</p>
                      </div>
                    </div>
                    <div class="flex flex-col max-md:grid max-md:grid-cols-2 gap-2">
                      {activeProviderId !== provider.id && (
                        <Button onClick={() => onSetActive(provider.id)} size="sm" variant="primary">
                          设为激活
                        </Button>
                      )}
                      <Button onClick={() => { setEditingProviderForModel(provider); setIsModelModalOpen(true); }} size="sm" variant="secondary">
                        📋 管理模型
                      </Button>
                      <Button onClick={() => handleFetchModels(provider)} size="sm" variant="secondary" isLoading={isLoading}>
                        🔄 获取模型列表
                      </Button>
                      <Button onClick={() => { setEditingProvider(provider); setIsEditModalOpen(true); }} size="sm" variant="secondary">
                        编辑
                      </Button>
                      <Button onClick={() => handleDeleteProvider(provider.id)} size="sm" variant="danger">
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
              {supportedProviders.filter((p) => p.type !== "custom").map((preset) => (
                <button
                  key={preset.type}
                  onClick={() => {
                    setAddProviderPreset({
                      type: preset.type,
                      name: preset.name,
                      base_url: preset.defaultBaseUrl,
                      supports_thinking: preset.supportsThinking,
                      thinking_param_key: preset.thinkingParamKey,
                      thinking_param_type: preset.thinkingParamType,
                      thinking_param_default: preset.thinkingParamDefault,
                      thinking_param_disabled: preset.thinkingParamDisabled,
                      reasoning_effort: preset.reasoningEffort,
                    });
                    setIsAddModalOpen(true);
                  }}
                  class="p-3 bg-dark-surface hover:bg-dark-accent rounded-lg text-sm text-gray-300 hover:text-white transition-colors text-left"
                >
                  {preset.name}
                  {preset.supportsThinking && (
                    <div class="text-xs text-purple-400 mt-1">🧠 支持思考</div>
                  )}
                  {preset.reasoningEffort && (
                    <div class="text-xs text-blue-400 mt-1">🤖 Reasoning</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* 子模态框 */}
      <AddProviderModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddProviderPreset(undefined);
        }}
        onAdd={onAddProvider}
        providers={providers}
        presetData={addProviderPreset}
      />

      <EditProviderModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProvider(null);
        }}
        onUpdate={onUpdateProvider}
        provider={editingProvider}
      />

      <ModelManagementModal
        isOpen={isModelModalOpen}
        onClose={() => {
          setIsModelModalOpen(false);
          setEditingProviderForModel(null);
        }}
        onUpdate={onUpdateProvider}
        provider={editingProviderForModel}
      />
    </>
  );
};
