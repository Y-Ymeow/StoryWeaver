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
  tempCharacterProfiles?: Record<
    string,
    {
      id: string;
      name: string;
      isUser: boolean;
      background?: string;
      dialogueStyle?: string;
    }
  >;
  onDeletePerformance?: (id: string) => void;
}

export const PerformanceList: FunctionalComponent<PerformanceListProps> = ({
  performances,
  characters,
  tempCharacterProfiles,
  onDeletePerformance,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (performances.length === 0) {
    return (
      <div class="h-full flex items-center justify-center text-gray-400">
        <div class="text-center">
          <div class="text-6xl md:text-8xl mb-2 md:mb-4">🎭</div>
          <p class="text-lg md:text-xl">准备就绪，等待开场</p>
          <p class="text-xs md:text-sm mt-1 md:mt-2 text-gray-500">
            点击"开始演出"开始表演
          </p>
        </div>
      </div>
    );
  }

  const orderedPerformances = [...performances].sort(
    (a, b) => a.order - b.order || a.created_at - b.created_at,
  );

  return (
    <div class="space-y-3 md:space-y-4">
      {orderedPerformances.map((perf) => {
        let character = characters.find((c) => c.id === perf.character_id);
        if (!character && tempCharacterProfiles?.[perf.character_id]) {
          const temp = tempCharacterProfiles[perf.character_id];
          character = {
            id: temp.id,
            name: temp.name,
            background: temp.background || `${temp.name}（临时角色）`,
            dialogue_style: temp.dialogueStyle || "自然口语",
            is_user: temp.isUser,
            memory: null,
            type: temp.isUser ? "user" : "ai",
            room_id: "",
            order: 0,
            created_at: 0,
            updated_at: 0,
          };
        }

        return (
          <div
            key={perf.id}
            class="relative group"
            onClick={() => {
              setHoveredId(hoveredId === perf.id ? null : perf.id);
            }}
          >
            <PerformanceBubble performance={perf} character={character} />
            {onDeletePerformance && hoveredId === perf.id && (
              <button
                onClick={() => {
                  if (confirm("确定要删除这条记录吗？")) {
                    onDeletePerformance(perf.id);
                  }
                }}
                class={`absolute top-0 right-0 p-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 ${hoveredId === perf.id ? "opacity-100" : "opacity-0"}  transition-opacity`}
                title="删除"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
