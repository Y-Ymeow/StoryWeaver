/**
 * 房间导出/导入工具
 *
 * 支持将房间数据导出为 JSON 文件，以及从 JSON 文件导入房间
 */

import type { Room, Scene, Character, Performance } from "@/stores";
import {
  getScenesByRoomId,
  getCharactersByRoomId,
  getPerformancesBySceneId,
} from "@/db";
import {
  createRoom,
  createScene,
  createCharacter,
  createPerformance,
} from "@/db";

/**
 * 导出的房间数据结构
 */
export interface ExportedRoomData {
  version: string;
  exportedAt: number;
  room: {
    id: string;
    name: string;
    setting: string;
    plot_summary: string;
    worldview: string;
    tone: string;
    current_performance_summary: string | null;
    max_scenes: number;
  };
  scenes: Array<{
    id: string;
    name: string;
    description: string;
    goal: string;
    setup: string;
    summary: string;
    max_rounds: number;
    sort_order: number;
  }>;
  characters: Array<{
    id: string;
    name: string;
    background: string;
    dialogue_style: string;
    memory: string | null;
    is_user: boolean;
    type: "user" | "ai";
    sort_order: number;
  }>;
  performances: Array<{
    id: string;
    scene_id: string;
    character_id: string;
    content: string | Record<string, string>;
    type: "dialogue" | "action" | "thought" | "emotion" | "behavior";
    round: number;
    sort_order: number;
  }>;
  statistics: {
    totalScenes: number;
    totalCharacters: number;
    totalPerformances: number;
    completedScenes: number;
  };
}

/**
 * 导出房间数据
 */
export async function exportRoomData(
  roomId: string,
): Promise<ExportedRoomData> {
  // 获取房间数据（需要从外部传入房间基本信息）
  const scenes = await getScenesByRoomId(roomId);
  const characters = await getCharactersByRoomId(roomId);

  // 获取所有演出记录
  const performances: Performance[] = [];
  for (const scene of scenes) {
    const scenePerfs = await getPerformancesBySceneId(scene.id);
    performances.push(...scenePerfs);
  }

  // 统计数据
  const completedScenes = scenes.filter(
    (s) =>
      s.summary || performances.filter((p) => p.scene_id === s.id).length > 0,
  ).length;

  return {
    version: "1.0",
    exportedAt: Date.now(),
    room: {
      id: roomId,
      name: "",
      setting: "",
      plot_summary: "",
      worldview: "",
      tone: "",
      current_performance_summary: "",
      max_scenes: 50,
    },
    scenes: scenes.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      goal: s.goal,
      setup: s.setup,
      summary: s.summary,
      max_rounds: s.max_rounds,
      sort_order: s.order,
    })),
    characters: characters.map((c) => ({
      id: c.id,
      name: c.name,
      background: c.background,
      dialogue_style: c.dialogue_style,
      memory: c.memory,
      is_user: c.is_user,
      type: c.type,
      sort_order: c.order,
    })),
    performances: performances.map((p) => ({
      id: p.id,
      scene_id: p.scene_id,
      character_id: p.character_id,
      content: p.content,
      type: p.primary_type,
      round: p.round,
      sort_order: p.order,
    })),
    statistics: {
      totalScenes: scenes.length,
      totalCharacters: characters.length,
      totalPerformances: performances.length,
      completedScenes,
    },
  };
}

/**
 * 完整导出房间（包含房间基本信息）
 */
export async function exportRoomFull(room: Room): Promise<ExportedRoomData> {
  const data = await exportRoomData(room.id);
  data.room = {
    id: room.id,
    name: room.name,
    setting: room.setting,
    plot_summary: room.plot_summary || "",
    worldview: room.worldview || "",
    tone: room.tone || "",
    current_performance_summary: room.current_performance_summary || "",
    max_scenes: room.max_scenes || 50,
  };
  return data;
}

/**
 * 导出为 JSON 文件
 */
export async function exportRoomToFile(room: Room): Promise<void> {
  const data = await exportRoomFull(room);
  const json = JSON.stringify(data, null, 2);

  // 创建 Blob
  const blob = new Blob([json], { type: "application/json" });

  // 使用 File System Access API 保存文件
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: `${room.name.replace(/[^a-zA-Z0-9]/g, "_")}_room.json`,
      types: [
        {
          description: "JSON 文件",
          accept: { "application/json": [".json"] },
        },
      ],
    });

    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
  } catch (error) {
    // 降级方案：使用 download 属性
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${room.name.replace(/[^a-zA-Z0-9]/g, "_")}_room.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * 导入房间数据
 */
export async function importRoomData(
  data: ExportedRoomData,
  options?: {
    importPerformances?: boolean;
    renameRoom?: string;
  },
): Promise<{
  roomId: string;
  stats: { scenes: number; characters: number; performances: number };
}> {
  const { importPerformances = true, renameRoom } = options || {};

  // 创建房间（使用新的 ID）
  const newRoom = await createRoom({
    name: renameRoom || data.room.name,
    setting: data.room.setting,
    plot_summary: data.room.plot_summary || "",
    worldview: data.room.worldview || "",
    tone: data.room.tone || "",
    current_performance_summary: data.room.current_performance_summary || "",
    max_scenes: Math.max(1, Math.min(200, data.room.max_scenes || 50)),
  });

  // ID 映射（旧 ID -> 新 ID）
  const sceneIdMap = new Map<string, string>();
  const characterIdMap = new Map<string, string>();

  // 导入场景
  for (const scene of data.scenes) {
    const newScene = await createScene({
      room_id: newRoom.id,
      name: scene.name,
      description: scene.description,
      goal: scene.goal,
      setup: scene.setup,
      summary: scene.summary,
      max_rounds: scene.max_rounds,
      order: scene.sort_order,
    });
    sceneIdMap.set(scene.id, newScene.id);
  }

  // 导入角色
  for (const character of data.characters) {
    const newCharacter = await createCharacter({
      room_id: newRoom.id,
      name: character.name,
      background: character.background,
      dialogue_style: character.dialogue_style,
      memory: character.memory,
      is_user: character.is_user,
      type: character.type,
      order: character.sort_order,
    });
    characterIdMap.set(character.id, newCharacter.id);
  }

  // 导入演出记录
  let importedPerformances = 0;
  if (importPerformances) {
    for (const perf of data.performances) {
      const newSceneId = sceneIdMap.get(perf.scene_id);
      const newCharacterId = characterIdMap.get(perf.character_id);

      if (newSceneId && newCharacterId) {
        await createPerformance({
          scene_id: newSceneId,
          character_id: newCharacterId,
          content: perf.content,
          primary_type:
            perf.type === "behavior" ? "action" : perf.type || "dialogue",
          round: perf.round,
          order: perf.sort_order,
        });
        importedPerformances++;
      }
    }
  }

  return {
    roomId: newRoom.id,
    stats: {
      scenes: data.scenes.length,
      characters: data.characters.length,
      performances: importedPerformances,
    },
  };
}

/**
 * 从文件导入房间
 */
export async function importRoomFromFile(): Promise<{
  roomId: string;
  stats: { scenes: number; characters: number; performances: number };
} | null> {
  try {
    // 使用 File System Access API 选择文件
    const [handle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: "JSON 文件",
          accept: { "application/json": [".json"] },
        },
      ],
      multiple: false,
    });

    const file = await handle.getFile();
    const json = await file.text();
    const data = JSON.parse(json) as ExportedRoomData;

    // 验证数据格式
    if (!data.version || !data.room || !data.scenes || !data.characters) {
      throw new Error("无效的导出文件格式");
    }

    return await importRoomData(data);
  } catch (error) {
    console.error("导入房间失败:", error);
    throw error;
  }
}

/**
 * 解析 JSON 字符串导入
 */
export async function importRoomFromJSON(
  jsonString: string,
  options?: { importPerformances?: boolean; renameRoom?: string },
): Promise<{
  roomId: string;
  stats: { scenes: number; characters: number; performances: number };
}> {
  const data = JSON.parse(jsonString) as ExportedRoomData;

  // 验证数据格式
  if (!data.version || !data.room || !data.scenes || !data.characters) {
    throw new Error("无效的导出文件格式");
  }

  return await importRoomData(data, options);
}
