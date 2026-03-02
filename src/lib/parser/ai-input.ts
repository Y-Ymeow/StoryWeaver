/**
 * AIInputConfig 相关的解析逻辑
 */

/**
 * 解析房间生成结果
 */
export function parseRoomResult(content: string): {
  name: string;
  setting: string;
  plot_summary: string;
  worldview: string;
  tone: string;
} | null {
  try {
    // 尝试提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      name: parsed.name || "",
      setting: parsed.setting || "",
      plot_summary: parsed.plot_summary || "",
      worldview: parsed.worldview || "",
      tone: parsed.tone || "",
    };
  } catch (e) {
    console.error("解析房间结果失败:", e);
    return null;
  }
}

/**
 * 解析角色生成结果
 */
export function parseCharacterResult(content: string): Array<{
  name: string;
  background: string;
  dialogue_style: string;
  is_user: boolean;
}> | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.characters || [];
  } catch (e) {
    console.error("解析角色结果失败:", e);
    return null;
  }
}

/**
 * 解析场景生成结果
 */
export function parseSceneResult(content: string): Array<{
  name: string;
  description: string;
  goal: string;
  setup: string;
  max_rounds: number;
}> | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.scenes || [];
  } catch (e) {
    console.error("解析场景结果失败:", e);
    return null;
  }
}