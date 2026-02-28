/**
 * 演出记录气泡显示组件 - 聊天风格
 */

import { FunctionalComponent } from "preact";
import type { Character, Performance } from "@/stores";

interface PerformanceBubbleProps {
  performance: Performance;
  character?: Character;
}

interface ParsedContent {
  dialogue?: string;
  action?: string;
  thought?: string;
  emotion?: string;
}

function parseContent(content: string): ParsedContent {
  try {
    return JSON.parse(content);
  } catch {
    return { dialogue: content };
  }
}

export const PerformanceBubble: FunctionalComponent<PerformanceBubbleProps> = ({
  performance,
  character,
}) => {
  const parsed = parseContent(performance.content);
  const isUser = character?.is_user;

  return (
    <div class={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 md:mb-3`}>
      <div class={`max-w-[90%] md:max-w-[80%]`}>
        {/* 角色名 */}
        <div class={`text-xs text-gray-400 mb-0.5 md:mb-1 ${isUser ? "text-right" : "text-left"}`}>
          {character?.name || "未知"}
        </div>

        {/* 情绪 - 气泡上方，只显示 emoji */}
        {parsed.emotion && (
          <div class={`text-xs text-pink-300 mb-0.5 md:mb-1 ${isUser ? "text-right" : "text-left"}`}>
            ❤️ {parsed.emotion}
          </div>
        )}

        {/* 对话气泡 - 淡蓝色 */}
        {parsed.dialogue && (
          <div
            class={`rounded-xl md:rounded-2xl px-3 py-1.5 md:px-4 md:py-2 ${
              isUser
                ? "bg-blue-500 text-white rounded-tr-sm"
                : "bg-sky-100 text-gray-800 rounded-tl-sm"
            }`}
          >
            <p class="whitespace-pre-wrap text-sm md:text-base">{parsed.dialogue}</p>
          </div>
        )}

        {/* 动作 - 中间，只显示 emoji */}
        {parsed.action && (
          <div class="text-xs md:text-sm text-gray-500 italic my-0.5 md:my-1 text-center">
            🎯 {parsed.action}
          </div>
        )}

        {/* 心理 - 底部，只显示 emoji */}
        {parsed.thought && (
          <div class="mt-0.5 md:mt-1 bg-purple-50 border border-purple-200 rounded-md md:rounded-lg px-2 py-1 md:px-3 md:py-1.5">
            <p class="text-xs text-purple-600 italic">
              💭 {parsed.thought}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};