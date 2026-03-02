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
      const fallback = active || loaded[0];
      if (fallback) {
        setSelectedProviderId((prev) =>
          prev && loaded.some((p: ProviderConfig) => p.id === prev)
            ? prev
            : fallback.id,
        );
        setSelectedModel((prev) =>
          prev || fallback.custom_models?.[0] || fallback.model || "",
        );
        setIsThinkingModel(fallback.supports_thinking || false);
        setEnableThinking(false);
      } else {
        setSelectedProviderId(null);
        setSelectedModel("");
        setIsThinkingModel(false);
        setEnableThinking(false);
      }
    } catch (error) {
      console.error("加载 Provider 配置失败:", error);
    }
  };

  useEffect(() => {
    load();
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "ai-providers") {
        load();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
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
