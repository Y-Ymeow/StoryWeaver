/**
 * 模型选择按钮组件
 * 统一的模型选择入口，点击后打开 ModelSelector
 */

import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";
import { Button, ModelSelector } from "@components/ui/common";
import type { ModelButtonProps } from "@/types/common";

export const ModelButton: FunctionalComponent<ModelButtonProps> = ({
  providers,
  selectedProviderId,
  selectedModel,
  isThinkingModel,
  enableThinking,
  thinkingBudget,
  onConfirm,
  size = "sm",
  variant = "secondary",
  showFullName = false,
}) => {
  const [showSelector, setShowSelector] = useState(false);

  const currentProvider = providers.find((p) => p.id === selectedProviderId);
  const modelName = selectedModel || currentProvider?.model || "未选择";
  const displayName = showFullName
    ? `${currentProvider?.name || "未选择"} - ${modelName}`
    : modelName.length > 20
    ? modelName.slice(0, 20) + "..."
    : modelName;

  return (
    <>
      <Button
        onClick={() => setShowSelector(true)}
        variant={variant}
        size={size}
      >
        ⚙️ {displayName}
      </Button>

      <ModelSelector
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onConfirm={(config) => {
          onConfirm(config);
          setShowSelector(false);
        }}
        providers={providers}
        initialProviderId={selectedProviderId}
        initialModel={selectedModel}
      />
    </>
  );
};
