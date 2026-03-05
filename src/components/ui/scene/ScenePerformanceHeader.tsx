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
  currentStep: number;
  totalSteps: number;
  progress: number;
  nextDirective: {
    goal?: string;
    task?: string;
    sceneBeat?: string;
    environment?: string;
    speaker?: { characterName?: string };
  } | null;
  completionReason?: string;
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
  currentStep,
  totalSteps,
  progress,
  nextDirective,
  completionReason,
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
    const target =
      loadedProviders.find((p: any) => p.is_active) || loadedProviders[0];
    if (target) {
      setSelectedProviderId(target.id);
      const model = target.custom_models?.[0] || target.model;
      if (model) setSelectedModel(model);
      setIsThinkingModel(target.supports_thinking || false);
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
            剧情步骤：{currentStep} / {totalSteps}
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

      {/* 当前指令 */}
      {status === "performing" && nextDirective && (
        <div class="bg-primary-600/20 border border-primary-500/30 rounded-lg px-3 py-2 mt-2">
          <div class="text-xs text-primary-300 mb-1">
            🎬 下一步指令：{nextDirective.speaker?.characterName || "未知角色"}
          </div>
          <div class="text-sm text-white font-medium">
            {nextDirective.task || nextDirective.goal || nextDirective.sceneBeat}
          </div>
          {(nextDirective.sceneBeat || nextDirective.environment) && (
            <div class="text-xs text-primary-200/80 mt-1">
              {nextDirective.sceneBeat || "剧情推进中"} ·{" "}
              {nextDirective.environment || "默认环境"}
            </div>
          )}
        </div>
      )}
      {status === "idle" && scene.goal && (
        <div class="text-xs text-primary-400 mt-2">
          🎯 场景目标：{scene.goal}
        </div>
      )}
      {status === "completed" && completionReason && (
        <div class="text-xs text-green-300 mt-2">✅ 结束原因：{completionReason}</div>
      )}

      {/* 进度条 */}
      {totalSteps > 0 && (
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
