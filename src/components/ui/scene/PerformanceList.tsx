/**
 * 演出记录列表组件 - 聊天风格
 */

import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";
import { PerformanceBubble } from "./PerformanceBubble";
import type { Character, Performance } from "@/stores";

interface PerformanceListProps {
  performances: Performance[];
  characters: Character[];
  roundPlan?: any[]; // 轮次计划，用于查找临时角色名称
  onDeletePerformance?: (id: string) => void;
  onDeleteRound?: (round: number) => void;
}

export const PerformanceList: FunctionalComponent<PerformanceListProps> = ({
  performances,
  characters,
  roundPlan,
  onDeletePerformance,
  onDeleteRound,
}) => {
  // 从 roundPlan 中查找角色名称
  const findCharacterNameFromRoundPlan = (characterId: string, round: number): string | undefined => {
    if (!roundPlan) return undefined;
    const roundItem = roundPlan.find((r) => r.round === round);
    if (!roundItem) return undefined;
    const turns = roundItem?.turns || roundItem?.performances || [];
    const turn = turns.find((t: any) => t.characterId === characterId);
    return turn?.characterName;
  };
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (performances.length === 0) {
    return (
      <div class="h-full flex items-center justify-center text-gray-400">
        <div class="text-center">
          <div class="text-6xl md:text-8xl mb-2 md:mb-4">🎭</div>
          <p class="text-lg md:text-xl">准备就绪，等待开场</p>
          <p class="text-xs md:text-sm mt-1 md:mt-2 text-gray-500">点击"开始演出"开始表演</p>
        </div>
      </div>
    );
  }

  const maxRound = Math.max(...performances.map((p) => p.round), 0);

  return (
    <div class="space-y-3 md:space-y-4">
      {Array.from({ length: maxRound }, (_, i) => i + 1).map((roundNum) => {
        const roundPerfs = performances.filter((p) => p.round === roundNum);
        const isLastRound = roundNum === maxRound;
        
        return (
          <div key={roundNum}>
            {/* 轮次分隔线 */}
            <div class="text-xs text-gray-500 font-medium flex items-center gap-1 md:gap-2 mb-2 md:mb-4 group">
              <span class="flex-1 h-px bg-dark-accent"></span>
              <span class="px-1 md:px-2">第 {roundNum} 轮</span>
              {/* 回退一轮按钮 - 只在最后一轮显示 */}
              {isLastRound && onDeleteRound && (
                <button
                  onClick={() => {
                    if (confirm(`确定要删除第 ${roundNum} 轮的所有记录吗？`)) {
                      onDeleteRound(roundNum);
                    }
                  }}
                  class="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                  title="删除本轮"
                >
                  ↩️
                </button>
              )}
              <span class="flex-1 h-px bg-dark-accent"></span>
            </div>
            
            {/* 表演气泡 */}
            <div class="space-y-0.5 md:space-y-1">
              {roundPerfs.map((perf) => {
                // 查找角色，找不到则从 roundPlan 中查找临时角色
                let character = characters.find((c) => c.id === perf.character_id);
                if (!character) {
                  // 临时角色，从 roundPlan 查找名称创建虚拟对象
                  const charName = findCharacterNameFromRoundPlan(perf.character_id, perf.round);
                  if (charName) {
                    character = {
                      id: perf.character_id,
                      name: charName,
                      background: `${charName}（临时角色）`,
                      dialogue_style: "自然口语",
                      is_user: false,
                      memory: null,
                      type: "ai",
                      room_id: "",
                      order: 0,
                      created_at: 0,
                      updated_at: 0,
                    };
                  }
                }
                return (
                <div
                  key={perf.id}
                  class="relative group"
                  onMouseEnter={() => setHoveredId(perf.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <PerformanceBubble
                    performance={perf}
                    character={character}
                  />
                  {/* 单条删除按钮 */}
                  {onDeletePerformance && hoveredId === perf.id && (
                    <button
                      onClick={() => {
                        if (confirm("确定要删除这条记录吗？")) {
                          onDeletePerformance(perf.id);
                        }
                      }}
                      class="absolute top-0 right-0 p-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};