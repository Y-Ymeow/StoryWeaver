import { useState, useEffect } from "preact/hooks";
import type { ProviderConfig } from "@/stores/types";

export type { ProviderConfig } from "@/stores/types";

export function useProviders() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [isThinkingModel, setIsThinkingModel] = useState(false);
  const [enableThinking, setEnableThinking] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(1024);

  const load = () => {
    try {
      const data = localStorage.getItem("ai-providers");
      const loaded = data ? JSON.parse(data) : [];
      setProviders(loaded);
      const active = loaded.find((p: ProviderConfig) => p.is_active);
      if (active) {
        setSelectedProviderId(active.id);
        setSelectedModel(active.custom_models?.[0] || active.model || "");
        setIsThinkingModel(active.supports_thinking || false);
        setEnableThinking(active.supports_thinking ? !!active.thinking_param_key : false);
      }
    } catch (error) {
      console.error("加载 Provider 配置失败:", error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return {
    providers,
    selectedProviderId,
    setSelectedProviderId,
    selectedModel,
    setSelectedModel,
    isThinkingModel,
    setIsThinkingModel,
    enableThinking,
    setEnableThinking,
    thinkingBudget,
    setThinkingBudget,
  };
}
