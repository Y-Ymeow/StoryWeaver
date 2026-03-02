/**
 * 场景摘要编辑弹窗
 */

import { FunctionalComponent } from "preact";
import { Button } from "@components/ui/common";

interface SummaryEditModalProps {
  isOpen: boolean;
  totalRounds: number;
  performanceCount: number;
  generatedSummary: string;
  isProcessing: boolean;
  onSummaryChange: (summary: string) => void;
  onSave: () => void;
  onSkip: () => void;
}

export const SummaryEditModal: FunctionalComponent<SummaryEditModalProps> = ({
  isOpen,
  totalRounds,
  performanceCount,
  generatedSummary,
  isProcessing,
  onSummaryChange,
  onSave,
  onSkip,
}) => {
  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div class="bg-dark-surface rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] md:max-h-[80vh] overflow-hidden">
        <div class="p-3 md:p-4 border-b border-dark-accent">
          <h3 class="text-lg md:text-xl font-bold gradient-text">📝 场景摘要</h3>
          <p class="text-xs md:text-sm text-gray-400 mt-1">
            演出已完成，请确认或编辑场景摘要
          </p>
        </div>
        <div class="p-3 md:p-4 space-y-3 md:space-y-4 overflow-y-auto max-h-[60vh]">
          <div class="bg-dark-accent/30 rounded-lg p-2 md:p-3">
            <div class="text-xs md:text-sm text-gray-400">
              已完成 {performanceCount} 条表演记录，共 {totalRounds} 轮
            </div>
          </div>
          <div>
            <label class="block text-xs md:text-sm font-medium text-gray-300 mb-2">
              场景摘要（可编辑）
            </label>
            <textarea
              class="w-full h-32 md:h-48 bg-dark-accent/30 border border-dark-accent rounded-lg p-2 md:p-3 text-xs md:text-sm text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={generatedSummary}
              onInput={(e: any) => onSummaryChange(e.target.value)}
              placeholder="输入场景摘要..."
            />
          </div>
          <div class="flex justify-between items-center pt-2">
            <Button onClick={onSkip} variant="ghost" size="sm">
              跳过
            </Button>
            <Button onClick={onSave} isLoading={isProcessing} size="sm">
              💾 保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
