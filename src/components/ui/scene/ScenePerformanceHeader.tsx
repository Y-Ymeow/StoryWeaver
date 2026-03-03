/**
 * 场景演出模态框 - 头部组件
 * 内部管理模型选择逻辑
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, ModelButton } from "@components/ui/common";
import type { Scene } from "@/stores";

type PerformanceStatus = "idle" | "performing" | "completed";

interface ScenePerformanceHeaderProps {
  scene: Scene;
  status: PerformanceStatus;
  currentRound: number;
  totalRounds: number;
  progress: number;
  currentRoundGoal: string | undefined;
  onClearHistory: () => void;
  onClose: () => void;
  onModelConfigChange: (config: {
    provider: any;
    model: string;
    thinking: any;
  }) => void;
}

export const ScenePerformanceHeader: FunctionalComponent<
  ScenePerformanceHeaderProps
> = ({
  scene,
  status,
  currentRound,
  totalRounds,
  progress,
  currentRoundGoal,
  onClearHistory,
  onClose,
  onModelConfigChange,
}) => {
  // 内部管理模型选择状态
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState("");
  const [isThinkingModel, setIsThinkingModel] = useState(false);
  const [enableThinking, setEnableThinking] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(1024);

  // 加载 providers
  useEffect(() => {
    const data = localStorage.getItem("ai-providers");
    const loadedProviders = data ? JSON.parse(data) : [];
    setProviders(loadedProviders);
    const active = loadedProviders.find((p: any) => p.is_active);
    if (active) {
      setSelectedProviderId(active.id);
      const model = active.custom_models?.[0] || active.model;
      if (model) setSelectedModel(model);
      setIsThinkingModel(active.supports_thinking || false);
      setEnableThinking(false); // 默认不启用思考，让用户手动开启
    }
  }, []);

  // 通知父组件配置变化
  useEffect(() => {
    const provider = providers.find((p) => p.id === selectedProviderId);
    if (!provider || !selectedModel) return;

    let thinking: any = undefined;
    if (provider.supports_thinking && enableThinking) {
      thinking = {
        enabled: true,
        param_key: provider.thinking_param_key || "thinking",
        type: provider.thinking_param_type || "boolean",
        default: provider.thinking_param_default,
        budget_tokens: thinkingBudget,
      };
    }

    onModelConfigChange({ provider, model: selectedModel, thinking });
  }, [
    providers,
    selectedProviderId,
    selectedModel,
    enableThinking,
    thinkingBudget,
    onModelConfigChange,
  ]);

  return (
    <div class="shrink-0 p-3 md:p-4 border-b border-dark-accent">
      {/* 标题行 */}
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="flex-1 min-w-0">
          <h2 class="text-lg md:text-2xl font-bold gradient-text truncate">
            🎬 {scene.name}
          </h2>
          <div class="text-xs md:text-sm text-gray-400 mt-1">
            轮次：{currentRound} / {totalRounds}
          </div>
        </div>
        <div class="flex items-center gap-1 md:gap-2 shrink-0">
          <Button onClick={onClose} variant="ghost" size="sm" class="px-2">
            ✕
          </Button>
        </div>
      </div>

      {/* 工具栏 */}
      <div class="flex items-center gap-2 mb-2 flex-wrap">
        <Button
          onClick={() => {
            if (confirm("确定要清空所有演出记录吗？")) onClearHistory();
          }}
          variant="secondary"
          size="sm"
          class="text-xs"
        >
          🗑️
        </Button>
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

      <p class="text-xs md:text-sm text-gray-400 mb-2 line-clamp-2">
        {scene.description}
      </p>

      {/* 当前轮次目标 */}
      {status === "performing" && currentRoundGoal && (
        <div class="bg-primary-600/20 border border-primary-500/30 rounded-lg px-3 py-2 mt-2">
          <div class="text-xs text-primary-300 mb-1">
            🎯 第 {currentRound} 轮目标
          </div>
          <div class="text-sm text-white font-medium">{currentRoundGoal}</div>
        </div>
      )}
      {status === "idle" && scene.goal && (
        <div class="text-xs text-primary-400 mt-2">
          🎯 场景目标：{scene.goal}
        </div>
      )}

      {/* 进度条 */}
      {totalRounds > 0 && (
        <div class="mt-2 h-1.5 md:h-2 bg-dark-accent rounded-full overflow-hidden">
          <div
            class="h-full bg-linear-to-r from-primary-600 to-primary-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

