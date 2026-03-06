/**
 * 场景演出模态框 - 重构版（使用状态机）
 */

import { FunctionalComponent } from "preact";
import { useEffect } from "preact/hooks";
import { useScenePerformanceMachine } from "@/hooks/useScenePerformanceMachine";
import { PerformanceList } from "./PerformanceList";
import { ScenePerformanceHeader } from "./ScenePerformanceHeader";
import { ScenePerformanceFooter } from "./ScenePerformanceFooter";
import { SummaryEditModal } from "./SummaryEditModal";
import type { Room, Scene, Character, Performance } from "@/stores";

interface ScenePerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene;
  room: Room;
  characters: Character[];
  onPerformancesChange: () => void;
}

export const ScenePerformanceModal: FunctionalComponent<
  ScenePerformanceModalProps
> = ({ isOpen, onClose, scene, room, characters, onPerformancesChange }) => {
  // 使用状态机 Hook 封装所有状态和动作
  const {
    state,
    actions,
    performances,
    tempCharacterProfiles,
  } = useScenePerformanceMachine({
    isOpen,
    scene,
    room,
    characters,
    onClose,
    onPerformancesChange,
  });

  // 初始化
  useEffect(() => {
    if (isOpen) {
      actions.loadState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div class="w-full h-full max-w-7xl mx-auto p-2 md:p-4 flex flex-col">
        <div class="bg-dark-surface rounded-lg shadow-2xl flex flex-col h-full overflow-hidden">
          <ScenePerformanceHeader
            scene={scene}
            status={state.status}
            currentStep={state.currentStep}
            totalSteps={state.totalSteps}
            progress={state.progress}
            nextDirective={state.nextDirective}
            completionReason={state.completionReason}
            onClearHistory={actions.handleClearHistory}
            onClose={actions.handleClose}
            onModelConfigChange={actions.setModelConfig}
          />

          <div class="flex-1 overflow-y-auto p-2 md:p-4">
            <PerformanceList
              performances={performances}
              characters={characters}
              tempCharacterProfiles={tempCharacterProfiles}
              onDeletePerformance={actions.handleDeletePerformance}
            />
          </div>

          <ScenePerformanceFooter
            status={state.status}
            currentStep={state.currentStep}
            totalSteps={state.totalSteps}
            nextDirective={state.nextDirective}
            isLoaded={state.isLoaded}
            characters={characters}
            isAdvancing={state.isPlanningDirective || state.isStreaming || state.isGeneratingCandidates}
            aiCandidates={state.aiCandidates}
            isGeneratingCandidates={state.isGeneratingCandidates}
            saveUserPerformance={async (directive, content) => {
              const { createPerformance } = await import("@/db/models/performances");
              await createPerformance({
                scene_id: scene.id,
                character_id: directive.speaker.characterId,
                content,
                primary_type: (Object.keys(content)[0] as any) || "dialogue",
                round: directive.step,
                order: performances.length,
              });
              await actions.loadPerformances();
            }}
            onGenerateCandidates={actions.handleGenerateCandidates}
            onSelectCandidate={actions.handleSelectCandidate}
            onContinue={actions.handleContinue}
            onEndPerformance={actions.handleEndPerformance}
            onFinish={actions.handleGenerateSummary}
            generatedSummary={state.generatedSummary}
            isProcessingSummary={state.isProcessingSummary}
            isStreaming={state.isStreaming}
            streamingContent={state.streamingContent}
            thinkingContent={state.thinkingContent}
            currentActor={state.currentActor}
          />
        </div>
      </div>

      <SummaryEditModal
        isOpen={state.status === "completed" && !!state.generatedSummary}
        totalSteps={state.totalSteps}
        performanceCount={performances.length}
        generatedSummary={state.generatedSummary}
        isProcessing={state.isProcessingSummary}
        onSummaryChange={actions.setGeneratedSummary}
        onSave={actions.handleSaveSummary}
        onSkip={actions.handleSkipSummary}
      />
    </div>
  );
};
