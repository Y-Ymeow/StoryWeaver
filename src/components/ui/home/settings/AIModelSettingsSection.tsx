/**
 * 设置页面 - AI 模型设置子组件
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Card, ModelButton } from "@components/ui/common";
import { AIModelSettings } from "../AIModelSettings";
import { createClient } from "@/lib/openai/client";
import type { ProviderConfig } from "@stores/types";

interface AIModelSettingsSectionProps {
  providers: ProviderConfig[];
  activeProviderId: string | null;
  onProvidersChange: (providers: ProviderConfig[]) => void;
  onActiveProviderChange: (id: string | null) => void;
  onMessage: (type: "success" | "error", text: string) => void;
}

const STORAGE_KEY = "ai-providers";

function loadProviders(): ProviderConfig[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveProviders(providers: ProviderConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
}

export const AIModelSettingsSection: FunctionalComponent<AIModelSettingsSectionProps> = ({
  providers,
  activeProviderId,
  onProvidersChange,
  onActiveProviderChange,
  onMessage,
}) => {
  const [showAIModelSettings, setShowAIModelSettings] = useState(false);

  const handleAddProvider = (config: Omit<ProviderConfig, "id">) => {
    const newProvider: ProviderConfig = {
      ...config,
      id: crypto.randomUUID(),
    };
    const updated = [...providers, newProvider];
    saveProviders(updated);
    onProvidersChange(updated);
    if (newProvider.is_active) {
      onActiveProviderChange(newProvider.id);
    }
  };

  const handleUpdateProvider = (id: string, updates: Partial<ProviderConfig>) => {
    const updated = providers.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    saveProviders(updated);
    onProvidersChange(updated);
  };

  const handleDeleteProvider = (id: string) => {
    const updated = providers.filter((p) => p.id !== id);
    saveProviders(updated);
    onProvidersChange(updated);
    if (activeProviderId === id) {
      onActiveProviderChange(null);
    }
  };

  const handleSetActive = (id: string) => {
    const updated = providers.map((p) => ({
      ...p,
      is_active: p.id === id,
    }));
    saveProviders(updated);
    onProvidersChange(updated);
    onActiveProviderChange(id);
  };

  const handleFetchModels = async (providerId: string): Promise<string[]> => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) throw new Error("Provider 不存在");

    const client = createClient(provider);
    const models = await client.listModels();
    return models.map((m) => m.id);
  };

  const handleExportProviders = () => {
    if (providers.length === 0) {
      onMessage("error", "没有可导出的配置");
      return;
    }

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      providers,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-providers-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onMessage("success", `已导出 ${providers.length} 个 Provider 配置`);
  };

  const handleImportProviders = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.providers || !Array.isArray(data.providers)) {
          throw new Error("无效的配置文件格式");
        }

        const existingIds = new Set(providers.map((p) => p.id));
        const newProviders: ProviderConfig[] = [];

        for (const p of data.providers) {
          if (!p.id || !p.name || !p.type) {
            console.warn("跳过无效配置:", p);
            continue;
          }

          if (existingIds.has(p.id)) {
            const existing = providers.find((ep) => ep.id === p.id);
            if (existing && confirm(`Provider "${p.name}" 已存在，是否覆盖？`)) {
              const updated = providers.map((ep) => (ep.id === p.id ? p : ep));
              saveProviders(updated);
              onProvidersChange(updated);
            }
          } else {
            newProviders.push(p);
          }
        }

        if (newProviders.length > 0) {
          const updated = [...providers, ...newProviders];
          saveProviders(updated);
          onProvidersChange(updated);
        }

        const active = loadProviders().find((p) => p.is_active);
        if (active) {
          onActiveProviderChange(active.id);
        }

        onMessage("success", "成功导入配置");
      } catch (err) {
        onMessage("error", err instanceof Error ? err.message : "导入失败");
      }
    };

    input.click();
  };

  return (
    <>
      <Card hover={false}>
        <h3 class="text-lg font-semibold text-white mb-2">🤖 AI 模型设置</h3>
        <div class="text-gray-300 space-y-2">
          <p class="text-sm">
            已添加 {providers.length} 个 Provider
            {activeProviderId && (
              <span class="text-green-400 ml-2">
                (当前使用：{providers.find((p) => p.id === activeProviderId)?.name})
              </span>
            )}
          </p>
          <div class="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowAIModelSettings(true)}
              variant="secondary"
            >
              ⚙️ 管理
            </Button>
            <Button
              onClick={handleExportProviders}
              variant="secondary"
              disabled={providers.length === 0}
            >
              📤 导出配置
            </Button>
            <Button
              onClick={handleImportProviders}
              variant="secondary"
            >
              📥 导入配置
            </Button>
          </div>
        </div>
      </Card>

      {showAIModelSettings && (
        <AIModelSettings
          onClose={() => setShowAIModelSettings(false)}
          providers={providers}
          activeProviderId={activeProviderId}
          onAddProvider={handleAddProvider}
          onUpdateProvider={handleUpdateProvider}
          onDeleteProvider={handleDeleteProvider}
          onSetActive={handleSetActive}
          onFetchModels={handleFetchModels}
        />
      )}
    </>
  );
};
