/**
 * AI 表演流式生成组件
 */

import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";
import { Card } from "@components/ui/common";
import type { ProviderConfig } from "@stores/types";
import { createClient } from "@/lib/openai/client";
import {
  getCharacterPerformanceSystemPrompt,
  buildCharacterPerformancePrompt,
} from "@/lib/prompts/performance";
import type { Room, Scene, Character, Performance } from "@/stores";

interface AIActorProps {
  character: Character;
  room: Room;
  scene: Scene;
  allCharacters: Character[];
  performances: Performance[];
  roundNum: number;
  provider: ProviderConfig;
  model: string;
  isThinkingModel: boolean;
  enableThinking: boolean;
  thinkingBudget: number;
  onProgress: (data: {
    streaming: string;
    thinking: string;
    done: boolean;
  }) => void;
  onComplete: (content: Record<string, string>) => void;
  onError: (error: Error) => void;
}

interface ParsedContent {
  dialogue?: string;
  action?: string;
  thought?: string;
  emotion?: string;
}

function parseMultiTypeContent(content: string): ParsedContent {
  const result: ParsedContent = {};
  const patterns: Record<keyof ParsedContent, RegExp> = {
    dialogue: /\[?(?:对话|dialogue)[:：]\s*([^\]\n]+)/i,
    action: /\[?(?:动作|action)[:：]\s*([^\]\n]+)/i,
    thought: /\[?(?:心理|thought)[:：]\s*([^\]\n]+)/i,
    emotion: /\[?(?:表情 | 情绪|emotion)[:：]\s*([^\]\n]+)/i,
  };
  for (const [type, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) result[type as keyof ParsedContent] = match[1].trim();
  }
  return result;
}

export const AIActor: FunctionalComponent<AIActorProps> = ({
  character,
  room,
  scene,
  allCharacters,
  performances,
  roundNum,
  provider,
  model,
  isThinkingModel,
  enableThinking,
  thinkingBudget,
  onProgress,
  onComplete,
  onError,
}) => {
  const [streamingContent, setStreamingContent] = useState("");
  const [thinkingContent, setThinkingContent] = useState("");

  const perform = async () => {
    try {
      const client = createClient(provider);
      const thinking =
        isThinkingModel && provider.supports_thinking
          ? {
              enabled: enableThinking,
              param_key: provider.thinking_param_key || "thinking",
              type: provider.thinking_param_type || "boolean",
              default: provider.thinking_param_default,
              budget_tokens: thinkingBudget,
            }
          : undefined;

      const prompt = buildCharacterPerformancePrompt(
        room,
        scene,
        character,
        allCharacters,
        performances,
        roundNum,
      );
      const messages = [
        { role: "system", content: getCharacterPerformanceSystemPrompt() },
        { role: "user", content: prompt },
      ];

      const stream = client.chatStream(messages, {
        temperature: 0.7,
        max_tokens: 1024,
        model,
        thinking,
      });

      let fullContent = "";

      for await (const chunk of stream) {
        // 处理思考内容
        if (chunk.thinking !== null) {
          setThinkingContent((prev) => prev + chunk.thinking);
          onProgress({
            streaming: fullContent,
            thinking: thinkingContent + chunk.thinking,
            done: false,
          });
        }
        // 处理正常内容
        if (chunk.content !== null) {
          fullContent += chunk.content;
          setStreamingContent(fullContent);
          onProgress({
            streaming: fullContent,
            thinking: thinkingContent,
            done: false,
          });
        }
      }

      const parsed = parseMultiTypeContent(fullContent);
      const contentObj: Record<string, string> = {};
      if (parsed.dialogue) contentObj.dialogue = parsed.dialogue;
      if (parsed.action) contentObj.action = parsed.action;
      if (parsed.thought) contentObj.thought = parsed.thought;
      if (parsed.emotion) contentObj.emotion = parsed.emotion;
      if (Object.keys(contentObj).length === 0)
        contentObj.dialogue = fullContent;

      onComplete(contentObj);
    } catch (error) {
      onError(error as Error);
    }
  };

  perform();

  return (
    <div class="space-y-2">
      {thinkingContent && isThinkingModel && enableThinking && (
        <Card class="p-3 bg-purple-900/20 border-purple-500/30">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">🧠</span>
            <span class="text-xs text-purple-300">思考中...</span>
          </div>
          <div class="text-xs text-purple-200/70 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
            {thinkingContent}
          </div>
        </Card>
      )}
      {streamingContent && (
        <Card class="p-3 bg-dark-accent/30">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">✨</span>
            <span class="text-xs text-gray-400">正在生成...</span>
          </div>
          <div class="text-sm text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {streamingContent}
          </div>
        </Card>
      )}
    </div>
  );
};
