/**
 * 场景演出模态框 - 底部控制区域组件
 */

import { FunctionalComponent } from "preact";
import { useState, useCallback } from "preact/hooks";
import { Button } from "@components/ui/common";
import { UserPerformanceInput } from "@components/ui/room/UserPerformanceInput";
import type { Character } from "@/stores";

interface SceneDirective {
  id: string;
  step: number;
  speaker: {
    characterId: string;
    characterName: string;
    isUser: boolean;
    isTemp?: boolean;
    background?: string;
    dialogueStyle?: string;
  };
  task: string;
  goal?: string;
  sceneBeat?: string;
  environment?: string;
  lineHint?: string;
  suggestedTypes: Array<"dialogue" | "action" | "thought" | "emotion">;
  createdAt: number;
}

interface AICandidate {
  id: string;
  content: {
    dialogue?: string;
    action?: string;
    thought?: string;
    emotion?: string;
  };
}

interface ScenePerformanceFooterProps {
  status: "idle" | "performing" | "completed";
  currentStep: number;
  totalSteps: number;
  nextDirective: SceneDirective | null;
  isLoaded: boolean;
  characters: Character[];
  isAdvancing: boolean;
  aiCandidates: AICandidate[];
  isGeneratingCandidates: boolean;
  saveUserPerformance: (
    directive: SceneDirective,
    content: {
      dialogue?: string;
      action?: string;
      thought?: string;
      emotion?: string;
    },
  ) => Promise<void>;
  onGenerateCandidates: (directive: SceneDirective) => Promise<void>;
  onSelectCandidate: (
    directive: SceneDirective,
    candidate: AICandidate,
  ) => Promise<void>;
  onContinue: () => Promise<void>;
  onEndPerformance: () => void;
  onFinish: () => void;
  generatedSummary: string;
  isProcessingSummary?: boolean;
  isStreaming?: boolean;
  streamingContent?: string;
  thinkingContent?: string;
  currentActor?: string;
}

export const ScenePerformanceFooter: FunctionalComponent<
  ScenePerformanceFooterProps
> = ({
  status,
  currentStep,
  totalSteps,
  nextDirective,
  isLoaded,
  characters,
  isAdvancing,
  aiCandidates,
  isGeneratingCandidates,
  saveUserPerformance,
  onGenerateCandidates,
  onSelectCandidate,
  onContinue,
  onEndPerformance,
  onFinish,
  generatedSummary,
  isProcessingSummary = false,
  isStreaming = false,
  streamingContent = "",
  thinkingContent = "",
  currentActor = "",
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInput, setUserInput] = useState({
    dialogue: "",
    action: "",
    thought: "",
    emotion: "",
  });

  const isUserTurn = nextDirective?.speaker.isUser ?? false;
  const canEnd = status !== "completed" && isLoaded;

  const currentCharacter = (() => {
    if (!nextDirective) return undefined;
    if (!nextDirective.speaker.isTemp) {
      return characters.find((c) => c.id === nextDirective.speaker.characterId);
    }
    return {
      id: nextDirective.speaker.characterId,
      name: nextDirective.speaker.characterName,
      background: nextDirective.speaker.background || "临时角色",
      dialogue_style: nextDirective.speaker.dialogueStyle || "自然口语",
      is_user: nextDirective.speaker.isUser,
      memory: null,
      type: nextDirective.speaker.isUser ? "user" : "ai",
      room_id: "",
      order: 0,
      created_at: 0,
      updated_at: 0,
    } as Character;
  })();

  const handleUserInput = useCallback(async () => {
    if (!nextDirective) return;

    setIsProcessing(true);
    try {
      await saveUserPerformance(nextDirective, userInput);
      setUserInput({ dialogue: "", action: "", thought: "", emotion: "" });
    } finally {
      setIsProcessing(false);
    }
  }, [nextDirective, saveUserPerformance, userInput]);

  return (
    <div class="shrink-0 border-t border-dark-accent">
      <div class="flex flex-row md:items-center justify-between px-3 md:px-4 py-2 md:py-3 bg-dark-accent/20 gap-2">
        <div class="flex items-center gap-2 md:gap-4 flex-wrap">
          {status !== "completed" && (
            <span class="text-xs md:text-sm font-semibold text-white px-2 py-0.5 md:px-3 md:py-1 bg-primary-600/30 rounded">
              步骤 {currentStep}/{totalSteps}
            </span>
          )}
          {status === "idle" && (
            <span class="text-xs md:text-sm text-gray-400">准备开始</span>
          )}
          {status === "completed" && (
            <span class="text-xs md:text-sm text-green-400">✅ 演出完成</span>
          )}

          {status === "performing" && nextDirective && (
            <span class="text-xs md:text-sm text-gray-300">
              {currentActor
                ? `🤖 ${currentActor} 执行中...`
                : `${isUserTurn ? "👤" : "🤖"} 下一位：${nextDirective.speaker.characterName}`}
            </span>
          )}
          {status === "performing" && !nextDirective && (
            <span class="text-xs md:text-sm text-amber-300">
              等待生成下一步指令
            </span>
          )}
        </div>

        <div class="flex gap-2 justify-end">
          {(status === "idle" || status === "performing") && (
            <Button onClick={onContinue} isLoading={isAdvancing} size="sm">
              ▶ 继续
            </Button>
          )}

          {status === "performing" && nextDirective && isUserTurn && (
            <Button
              onClick={() => onGenerateCandidates(nextDirective)}
              isLoading={isGeneratingCandidates}
              size="sm"
            >
              ✨ 生成4句候选
            </Button>
          )}

          {status === "performing" && nextDirective && isUserTurn && (
            <Button
              onClick={handleUserInput}
              isLoading={isProcessing}
              size="sm"
            >
              ✓ 提交这一步
            </Button>
          )}

          {canEnd && (
            <Button onClick={onEndPerformance} variant="secondary" size="sm">
              🏁 结束演出
            </Button>
          )}

          {status === "completed" && !generatedSummary && (
            <Button
              onClick={onFinish}
              isLoading={isProcessingSummary}
              variant="primary"
              size="sm"
            >
              📝 生成总结
            </Button>
          )}
        </div>
      </div>

      {status === "performing" && nextDirective && (
        <div class="px-2 md:px-4 py-2 border-t border-dark-accent/50">
          <div class="rounded-lg border border-primary-500/30 bg-primary-600/10 p-3 text-xs md:text-sm text-gray-200 space-y-1">
            <div>
              <span class="text-primary-300">目标：</span>
              {nextDirective.goal || "推进剧情"}
            </div>
            <div>
              <span class="text-primary-300">任务：</span>
              {nextDirective.task}
            </div>
            {(nextDirective.sceneBeat || nextDirective.environment) && (
              <div>
                <span class="text-primary-300">场景：</span>
                {nextDirective.sceneBeat || "剧情推进中"} ·{" "}
                {nextDirective.environment || "默认环境"}
              </div>
            )}
            {nextDirective.lineHint && (
              <div>
                <span class="text-primary-300">提示：</span>
                {nextDirective.lineHint}
              </div>
            )}
          </div>
        </div>
      )}

      {status === "performing" &&
        nextDirective &&
        isUserTurn &&
        currentCharacter && (
          <div class="px-2 md:px-4 py-2 border-t border-dark-accent/50">
            <UserPerformanceInput
              character={currentCharacter}
              value={userInput}
              onChange={setUserInput}
              lineHint={nextDirective.lineHint || undefined}
            />
          </div>
        )}

      {status === "performing" &&
        nextDirective &&
        isUserTurn &&
        aiCandidates.length > 0 && (
          <div class="px-2 md:px-4 py-2 border-t border-dark-accent/50 space-y-2 h-55 overflow-y-scroll">
            <div class="text-xs text-primary-300">请选择一句作为本步输出：</div>
            {aiCandidates.map((candidate, index) => (
              <div
                key={candidate.id}
                class="rounded-lg border border-dark-accent bg-dark-accent/20 p-2"
              >
                <div class="text-xs text-gray-400 mb-1">候选 {index + 1}</div>
                <div class="text-sm text-gray-200 whitespace-pre-wrap">
                  {candidate.content.dialogue || "（无对话）"}
                </div>
                {candidate.content.action && (
                  <div class="text-xs text-gray-400 mt-1">
                    🎯 {candidate.content.action}
                  </div>
                )}
                {candidate.content.thought && (
                  <div class="text-xs text-gray-400 mt-1">
                    💭 {candidate.content.thought}
                  </div>
                )}
                {candidate.content.emotion && (
                  <div class="text-xs text-gray-400 mt-1">
                    ❤️ {candidate.content.emotion}
                  </div>
                )}
                <div class="mt-2">
                  <Button
                    size="sm"
                    onClick={() => onSelectCandidate(nextDirective, candidate)}
                  >
                    使用这句
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

      {status === "performing" && (thinkingContent || streamingContent) && (
        <div class="px-2 md:px-4 py-2 border-t border-dark-accent/50">
          {thinkingContent && (
            <div class="bg-purple-900/20 rounded p-2 mb-2">
              <div class="text-xs text-purple-300 mb-1">🧠 思考中...</div>
              <div class="text-xs text-purple-200/70 whitespace-pre-wrap max-h-16 md:max-h-20 overflow-y-auto font-mono">
                {thinkingContent}
              </div>
            </div>
          )}
          {streamingContent && (
            <div class="bg-dark-accent/30 rounded p-2">
              <div class="text-xs text-gray-400 mb-1">✨ 生成中...</div>
              <div class="text-xs md:text-sm text-gray-300 whitespace-pre-wrap max-h-16 md:max-h-24 overflow-y-auto">
                {streamingContent}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
