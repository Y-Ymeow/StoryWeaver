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
  onDeletePerformance?: (id: string) => void;
  onDeleteRound?: (round: number) => void;
}

export const PerformanceList: FunctionalComponent<PerformanceListProps> = ({
  performances,
  characters,
  onDeletePerformance,
  onDeleteRound,
}) => {
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
              {roundPerfs.map((perf) => (
                <div
                  key={perf.id}
                  class="relative group"
                  onMouseEnter={() => setHoveredId(perf.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <PerformanceBubble
                    performance={perf}
                    character={characters.find((c) => c.id === perf.character_id)}
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
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};