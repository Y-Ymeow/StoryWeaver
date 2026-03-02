/**
 * AIGenerate 相关的解析逻辑
 */

import type { AIGenerateResult } from "@/types/ai-generate";

/**
 * 解析 AI 生成响应
 */
export function parseAIResponse(
  content: string,
  mode: "room" | "character" | "scene" | "custom",
): AIGenerateResult {
  try {
    // 提取 JSON 代码块
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    let jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : content;

    // 如果没有代码块，尝试直接提取 JSON 对象
    if (!codeBlockMatch) {
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      jsonStr = jsonMatch ? jsonMatch[0] : jsonStr;
    }

    const parsed = JSON.parse(jsonStr);

    if (mode === "room") {
      return {
        name: parsed.name || "",
        setting: parsed.setting || "",
        plot_summary: parsed.plot_summary || "",
        worldview: parsed.worldview || "",
        tone: parsed.tone || "",
        max_scenes: Math.min(200, Math.max(1, parsed.max_scenes || 50)),
      };
    } else if (mode === "character") {
      return {
        characters: (parsed.characters || []).map((c: any) => ({
          name: c.name || "",
          background: c.background || "",
          dialogue_style: c.dialogue_style || "",
          is_user: c.is_user || false,
        })),
      };
    } else if (mode === "scene") {
      return {
        scenes: (parsed.scenes || []).map((s: any) => ({
          name: s.name || "",
          description: s.description || "",
          goal: s.goal || "",
          setup: s.setup || "",
          max_rounds: s.max_rounds || 10,
        })),
      };
    }
    return { content };
  } catch (e) {
    console.error("JSON 解析失败:", e);
    return { content };
  }
}
