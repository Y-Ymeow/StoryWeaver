/**
 * 管理模型模态框
 */
import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";
import { Button, Modal, Input } from "@components/ui/common";
import type { ProviderConfig } from "@stores/types";

interface ModelManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<ProviderConfig>) => void;
  provider: ProviderConfig | null;
}

export const ModelManagementModal: FunctionalComponent<ModelManagementModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  provider,
}) => {
  const [newModelName, setNewModelName] = useState("");

  const handleAddModel = () => {
    if (!provider || !newModelName.trim()) return;
    const updatedModels = [...(provider.custom_models || []), newModelName.trim()];
    onUpdate(provider.id, { custom_models: updatedModels });
    setNewModelName("");
  };

  const handleRemoveModel = (modelIndex: number) => {
    if (!provider) return;
    const updatedModels = (provider.custom_models || []).filter((_, i) => i !== modelIndex);
    onUpdate(provider.id, { custom_models: updatedModels });
  };

  if (!isOpen || !provider) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📋 管理模型"
      size="lg"
    >
      <div class="space-y-4">
        <div class="text-sm text-gray-400">
          Provider: <span class="text-white">{provider.name}</span>
          {provider.supports_thinking && (
            <span class="ml-2 text-purple-400">🧠 支持思考模式</span>
          )}
        </div>

        {/* 添加模型 */}
        <div class="flex gap-2 items-end">
          <div class="flex-1">
            <Input
              label="添加模型"
              value={newModelName}
              onInput={(e) => setNewModelName((e.target as HTMLInputElement).value)}
              placeholder="模型名称，如：gpt-4"
            />
          </div>
          <Button onClick={handleAddModel} disabled={!newModelName.trim()}>
            添加
          </Button>
        </div>

        {/* 模型列表 */}
        {(provider.custom_models || []).length === 0 ? (
          <div class="text-gray-500 text-center py-8">
            暂无模型，请添加或从 API 获取
          </div>
        ) : (
          <div class="space-y-2 max-h-60 overflow-y-auto">
            {(provider.custom_models || []).map((model, index) => (
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
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
