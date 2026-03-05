/**
 * 用户表演输入组件 - 紧凑版
 */

import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";
import { TextArea, Input } from "@components/ui/common";
import type { Character } from "@/stores";

interface UserPerformanceInputProps {
  character: Character;
  value: { dialogue: string; action: string; thought: string; emotion: string };
  onChange: (value: {
    dialogue: string;
    action: string;
    thought: string;
    emotion: string;
  }) => void;
  lineHint?: string; // 台词建议
}

type InputTab = "dialogue" | "action" | "thought" | "emotion";

export const UserPerformanceInput: FunctionalComponent<
  UserPerformanceInputProps
> = ({ character, value, onChange, lineHint }) => {
  const [activeTab, setActiveTab] = useState<InputTab>("dialogue");
  const [expanded, setExpanded] = useState(false);

  const tabs: { id: InputTab; label: string; icon: string }[] = [
    { id: "dialogue", label: "对话", icon: "💬" },
    { id: "action", label: "动作", icon: "🎯" },
    { id: "thought", label: "心理", icon: "💭" },
    { id: "emotion", label: "表情", icon: "❤️" },
  ];

  const renderInput = (tab: InputTab) => {
    switch (tab) {
      case "dialogue":
        return (
          <TextArea
            value={value.dialogue}
            onInput={(e) =>
              onChange({
                ...value,
                dialogue: (e.target as HTMLTextAreaElement).value,
              })
            }
            placeholder="输入台词..."
            rows={2}
            class="w-full resize-none text-sm"
          />
        );
      case "action":
        return (
          <TextArea
            value={value.action}
            onInput={(e) =>
              onChange({
                ...value,
                action: (e.target as HTMLTextAreaElement).value,
              })
            }
            placeholder="动作描述..."
            rows={2}
            class="w-full resize-none text-sm"
          />
        );
      case "thought":
        return (
          <TextArea
            value={value.thought}
            onInput={(e) =>
              onChange({
                ...value,
                thought: (e.target as HTMLTextAreaElement).value,
              })
            }
            placeholder="内心想法..."
            rows={2}
            class="w-full resize-none text-sm"
          />
        );
      case "emotion":
        return (
          <Input
            value={value.emotion}
            onInput={(e) =>
              onChange({
                ...value,
                emotion: (e.target as HTMLInputElement).value,
              })
            }
            placeholder="表情/情绪..."
            class="w-full text-sm"
          />
        );
    }
  };

  // 统计已填写的内容数量
  const filledCount = [
    value.dialogue,
    value.action,
    value.thought,
    value.emotion,
  ].filter((v) => v.trim()).length;

  return (
    <div class="space-y-2">
      {/* 角色名和折叠按钮 */}
      <div
        class="flex items-center justify-between cursor-pointer py-1"
        onClick={() => setExpanded(!expanded)}
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-primary-300">
            👤 {character.name}
          </span>
          {filledCount > 0 && (
            <span class="text-xs bg-primary-600/30 text-primary-300 px-1.5 rounded">
              {filledCount}项
            </span>
          )}
        </div>
        <span class="text-gray-400 text-sm">{expanded ? "▼" : "▶"}</span>
      </div>

      {expanded && (
        <>
          {/* Tab 切换 - 更紧凑 */}
          <div class="flex gap-1 bg-dark-surface rounded p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                class={`flex-1 py-1 px-2 rounded text-xs transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span class="mr-0.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* 输入区域 */}
          <div class="bg-dark-accent/30 rounded p-2">
            {renderInput(activeTab)}
          </div>
        </>
      )}
    </div>
  );
};

