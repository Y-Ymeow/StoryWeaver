/**
 * 场景演出核心逻辑 Hook
 * 封装 AI 对话、指令生成、表演执行等核心功能
 */

import { useState, useCallback, useMemo } from "preact/hooks";
import { useAIChatStream } from "./useAIChatStream";
import { createClient } from "@/lib/openai/client";
import type { ProviderConfig, Room, Scene, Character, Performance } from "@/stores/types";
import { createPerformance } from "@/db/models/performances";
import { parseMultiplePerformances, parseSceneContent } from "@/lib/parser";
import { findOrCreateCharacter } from "@/lib/rules/character-helper";
import { safeParseJSON, findBalancedJsonEnd } from "@/lib/json-parser";
import {
  buildSceneDirectivePrompt,
  buildSceneDirectivePerformancePrompt,
} from "@/lib/prompts/scene-performance";

export interface SceneDirective {
  id: string;
  step: number;
  speaker: {
    characterId: string;
    characterName: string;
    isUser: boolean;
    isTemp?: boolean;
    background?: string;
    dialogueStyle?: string;
  };
  task: string;
  goal?: string;
  sceneBeat?: string;
  environment?: string;
  lineHint?: string;
  suggestedTypes: Array<"dialogue" | "action" | "thought" | "emotion">;
  createdAt: number;
}

export interface AICandidate {
  id: string;
  content: {
    dialogue?: string;
    action?: string;
    thought?: string;
    emotion?: string;
  };
}

interface UseScenePerformanceOptions {
  scene: Scene;
  room: Room;
  characters: Character[];
  performances: Performance[];
  tempCharacterProfiles: Record<string, any>;
  modelConfig: { provider: ProviderConfig; model: string; thinking?: any } | null;
  onPerformancesChange?: () => Promise<void>;
}

export function useScenePerformance({
  scene,
  room,
  characters,
  performances,
  tempCharacterProfiles,
  modelConfig,
  onPerformancesChange,
}: UseScenePerformanceOptions) {
  const { chatStream, isStreaming, cancel } = useAIChatStream();

  const [streamingContent, setStreamingContent] = useState("");
  const [thinkingContent, setThinkingContent] = useState("");
  const [currentActor, setCurrentActor] = useState("");
  const [isPlanningDirective, setIsPlanningDirective] = useState(false);
  const [isGeneratingCandidates, setIsGeneratingCandidates] = useState(false);

  const mergedCharactersForPrompt = useMemo(() => {
    const tempCharacters = Object.values(tempCharacterProfiles).map((profile: any) => ({
      id: profile.id,
      name: profile.name,
      background: profile.background || "临时角色",
      dialogue_style: profile.dialogueStyle || "自然口语",
      is_user: profile.isUser,
      memory: null,
      type: profile.isUser ? "user" : "ai",
      room_id: "",
      order: 0,
      created_at: 0,
      updated_at: 0,
    } as Character));

    return [...characters, ...tempCharacters];
  }, [characters, tempCharacterProfiles]);

  /**
   * 生成下一步指令
   */
  const generateNextDirective = useCallback(async (): Promise<SceneDirective | null> => {
    if (!modelConfig) {
      throw new Error("未选择模型");
    }

    setIsPlanningDirective(true);
    setCurrentActor("导演 AI");
    setStreamingContent("");
    setThinkingContent("");

    try {
      const prompt = buildSceneDirectivePrompt(
        room,
        scene,
        mergedCharactersForPrompt.map((c) => ({
          name: c.name,
          is_user: c.is_user,
          character_id: c.id,
          background: c.background,
          dialogue_style: c.dialogue_style,
        })),
        performances,
      );

      const messages = [
        {
          role: "system",
          content: "你是剧情导演，只输出可解析 JSON。",
        },
        { role: "user", content: prompt },
      ];

      const { content } = await chatStream(
        modelConfig.provider,
        messages,
        {
          temperature: 0.6,
          max_tokens: 1200,
          model: modelConfig.model,
          thinking: modelConfig.thinking,
        },
        (fullContent, thinking) => {
          setStreamingContent(fullContent);
          setThinkingContent(thinking);
        },
      );

      if (!content || content.trim() === "") {
        throw new Error("AI 返回内容为空");
      }

      const parsed = safeParseJSON<any>(content);
      const shouldEnd =
        parsed?.should_end === true ||
        parsed?.shouldEnd === true ||
        parsed?.is_scene_complete === true;

      if (shouldEnd) {
        setStreamingContent("");
        setThinkingContent("");
        setCurrentActor("");
        return null;
      }

      const speaker = parsed?.speaker || {};
      const speakerMode = String(speaker.mode || "existing").toLowerCase();
      const speakerName = String(speaker.name || "未知角色").trim();

      let isUser = false;
      let isTemp = false;
      let characterId = "";
      let background = "";
      let dialogueStyle = "";

      if (speakerMode === "existing") {
        const byId = characters.find((c) => c.id === String(speaker.character_id || ""));
        const byName = characters.find((c) => c.name === speakerName);
        const matched = byId || byName;
        if (!matched) {
          throw new Error(`指令中的 existing 角色"${speakerName}"不存在`);
        }
        isUser = matched.is_user;
        characterId = matched.id;
        background = matched.background || "";
        dialogueStyle = matched.dialogue_style || "";
      } else {
        isTemp = true;
        isUser = speakerMode === "temp_user";
        characterId = createOrReuseTempId(speakerName, isUser, tempCharacterProfiles);
        background = String(parsed?.speaker?.background || parsed?.persona || "临时角色").trim();
        dialogueStyle = String(parsed?.speaker?.dialogue_style || "自然口语").trim();
      }

      const maxPerformedStep = performances.length > 0 ? Math.max(...performances.map((p) => p.round), 0) : 0;
      const step = maxPerformedStep + 1;

      const directive: SceneDirective = {
        id: `${scene.id}:${step}:${Date.now()}`,
        step,
        speaker: {
          characterId,
          characterName: isTemp ? speakerName : characters.find((c) => c.id === characterId)?.name || speakerName,
          isUser,
          isTemp,
          background,
          dialogueStyle,
        },
        task: String(parsed?.task || "按角色推进剧情").trim(),
        goal: String(parsed?.goal || "推进剧情").trim(),
        sceneBeat: String(parsed?.scene_beat || parsed?.sceneBeat || "").trim(),
        environment: String(parsed?.environment || "").trim(),
        lineHint: String(parsed?.line_hint || parsed?.lineHint || "").trim(),
        suggestedTypes: normalizeTypes(parsed?.suggested_types || parsed?.suggestedTypes),
        createdAt: Date.now(),
      };

      setStreamingContent("");
      setThinkingContent("");
      setCurrentActor("");
      return directive;
    } catch (error: any) {
      console.error("生成下一步指令失败:", error);
      throw error;
    } finally {
      setIsPlanningDirective(false);
    }
  }, [modelConfig, room, scene, mergedCharactersForPrompt, performances, characters, tempCharacterProfiles, chatStream]);

  /**
   * 执行 AI 表演
   */
  const performDirectiveAI = useCallback(
    async (directive: SceneDirective) => {
      if (!modelConfig) {
        throw new Error("未选择模型");
      }

      const character = findOrCreateCharacter(
        directive.speaker.characterName,
        mergedCharactersForPrompt,
        {
          characterId: directive.speaker.characterId,
          isTemp: directive.speaker.isTemp,
        },
      );

      setCurrentActor(character.name);
      setStreamingContent("");
      setThinkingContent("");

      const prompt = buildSceneDirectivePerformancePrompt(
        room,
        scene,
        character,
        mergedCharactersForPrompt,
        performances,
        directive,
      );

      const { content } = await chatStream(
        modelConfig.provider,
        [
          {
            role: "system",
            content: "你是专业演员。根据角色设定和剧情指令生成符合角色性格的表演内容。",
          },
          { role: "user", content: prompt },
        ],
        {
          temperature: 0.7,
          max_tokens: 2048,
          model: modelConfig.model,
          thinking: modelConfig.thinking,
        },
        (fullContent, thinking) => {
          setStreamingContent(fullContent);
          setThinkingContent(thinking);
        },
      );

      if (!content || content.trim() === "") {
        throw new Error("AI 返回内容为空");
      }

      const parsedList = parseMultiplePerformances(content);
      let currentOrder = performances.length;
      let savedCount = 0;

      for (const parsed of parsedList) {
        const contentObj: Record<string, string> = {};
        if (parsed.dialogue) contentObj.dialogue = parsed.dialogue;
        if (parsed.action) contentObj.action = parsed.action;
        if (parsed.thought) contentObj.thought = parsed.thought;
        if (parsed.emotion) contentObj.emotion = parsed.emotion;
        if (Object.keys(contentObj).length === 0) continue;

        await createPerformance({
          scene_id: scene.id,
          character_id: directive.speaker.characterId,
          content: contentObj,
          primary_type: (Object.keys(contentObj)[0] as any) || "dialogue",
          round: directive.step,
          order: currentOrder++,
        });
        savedCount++;
      }

      // 兜底：如果结构化解析失败，至少把原始输出作为一条对话落库
      if (savedCount === 0) {
        const fallback = parseSceneContent(content);
        const fallbackContent: Record<string, string> = {};
        if (fallback.dialogue?.trim()) fallbackContent.dialogue = fallback.dialogue.trim();
        if (fallback.action?.trim()) fallbackContent.action = fallback.action.trim();
        if (fallback.thought?.trim()) fallbackContent.thought = fallback.thought.trim();
        if (fallback.emotion?.trim()) fallbackContent.emotion = fallback.emotion.trim();

        if (Object.keys(fallbackContent).length > 0) {
          await createPerformance({
            scene_id: scene.id,
            character_id: directive.speaker.characterId,
            content: fallbackContent,
            primary_type: (Object.keys(fallbackContent)[0] as any) || "dialogue",
            round: directive.step,
            order: currentOrder++,
          });
          savedCount++;
        }
      }

      if (savedCount === 0) {
        throw new Error("AI 返回为空，未生成可保存内容");
      }

      setStreamingContent("");
      setThinkingContent("");
      setCurrentActor("");
      await onPerformancesChange?.();
    },
    [modelConfig, mergedCharactersForPrompt, room, scene, performances, chatStream, onPerformancesChange],
  );

  /**
   * 生成 AI 候选台词（用于用户回合）
   */
  const generateAICandidates = useCallback(
    async (directive: SceneDirective): Promise<AICandidate[]> => {
      if (!modelConfig) {
        throw new Error("未选择模型");
      }

      const character = findOrCreateCharacter(
        directive.speaker.characterName,
        mergedCharactersForPrompt,
        {
          characterId: directive.speaker.characterId,
          isTemp: directive.speaker.isTemp,
        },
      );

      setIsGeneratingCandidates(true);
      setCurrentActor(`${character.name}（候选生成）`);
      setStreamingContent("");
      setThinkingContent("");

      try {
        const recentHistory = performances
          .slice(-12)
          .map((p) => {
            const c = mergedCharactersForPrompt.find((x) => x.id === p.character_id);
            let content = p.content;
            try {
              const parsed: any = JSON.parse(p.content);
              const parts: string[] = [];
              if (parsed.dialogue) parts.push(parsed.dialogue);
              if (parsed.action) parts.push(`动作:${parsed.action}`);
              if (parsed.thought) parts.push(`心理:${parsed.thought}`);
              if (parsed.emotion) parts.push(`情绪:${parsed.emotion}`);
              content = parts.join(" / ") || p.content;
            } catch {
              // ignore
            }
            return `${c?.name || p.character_id}: ${content}`;
          })
          .join("\n");

        const prompt = `你正在为角色【${character.name}】生成候选台词。
只输出 JSON，不要输出任何解释。

场景：${scene.name}
场景描述：${scene.description || ""}
这一步任务：${directive.task}
这一步目标：${directive.goal || "推进剧情"}
剧情点：${directive.sceneBeat || "自然推进"}
环境：${directive.environment || "默认环境"}
台词提示：${directive.lineHint || "自然表达"}
角色背景：${character.background || "普通人物"}
角色风格：${character.dialogue_style || "自然口语"}

最近剧情：
${recentHistory || "（暂无）"}

输出格式：
{
  "candidates": [
    { "dialogue": "...", "action": "...", "thought": "...", "emotion": "..." },
    { "dialogue": "...", "action": "...", "thought": "...", "emotion": "..." },
    { "dialogue": "...", "action": "...", "thought": "...", "emotion": "..." },
    { "dialogue": "...", "action": "...", "thought": "...", "emotion": "..." }
  ]
}

要求：
1. 必须提供 4 个候选。
2. 每个候选都要明显不同。
3. 对话为主，动作/心理/情绪可选，尽量简洁自然。`;

        const { content } = await chatStream(
          modelConfig.provider,
          [
            { role: "system", content: "你是编剧助手，只输出合法 JSON。" },
            { role: "user", content: prompt },
          ],
          {
            temperature: 0.9,
            max_tokens: 1800,
            model: modelConfig.model,
            thinking: modelConfig.thinking,
          },
          (full, thinking) => {
            setStreamingContent(full);
            setThinkingContent(thinking);
          },
        );

        if (!content || content.trim() === "") {
          throw new Error("AI 返回内容为空");
        }

        const parsed = safeParseJSON<any>(content);
        const list = Array.isArray(parsed?.candidates) ? parsed.candidates : [];
        const normalized: AICandidate[] = list
          .slice(0, 4)
          .map((item: any, idx: number) => {
            const contentObj: Record<string, string> = {};
            if (String(item?.dialogue || "").trim()) {
              contentObj.dialogue = String(item.dialogue).trim();
            }
            if (String(item?.action || "").trim()) {
              contentObj.action = String(item.action).trim();
            }
            if (String(item?.thought || "").trim()) {
              contentObj.thought = String(item.thought).trim();
            }
            if (String(item?.emotion || "").trim()) {
              contentObj.emotion = String(item.emotion).trim();
            }
            return { id: `${directive.id}:cand:${idx}`, content: contentObj };
          })
          .filter((c: AICandidate) => Object.keys(c.content).length > 0);

        if (normalized.length === 0) {
          throw new Error("未生成可用候选台词");
        }

        return normalized;
      } finally {
        setIsGeneratingCandidates(false);
        setCurrentActor("");
        setStreamingContent("");
        setThinkingContent("");
      }
    },
    [modelConfig, mergedCharactersForPrompt, performances, scene, chatStream],
  );

  /**
   * 保存用户表演
   */
  const saveUserPerformance = useCallback(
    async (
      directive: SceneDirective,
      content: {
        dialogue?: string;
        action?: string;
        thought?: string;
        emotion?: string;
      },
    ) => {
      const contentObj: Record<string, string> = {};
      if (content.dialogue?.trim()) contentObj.dialogue = content.dialogue.trim();
      if (content.action?.trim()) contentObj.action = content.action.trim();
      if (content.thought?.trim()) contentObj.thought = content.thought.trim();
      if (content.emotion?.trim()) contentObj.emotion = content.emotion.trim();

      if (Object.keys(contentObj).length === 0) {
        throw new Error("请至少填写一个内容字段");
      }

      await createPerformance({
        scene_id: scene.id,
        character_id: directive.speaker.characterId,
        content: contentObj,
        primary_type: (Object.keys(contentObj)[0] as any) || "dialogue",
        round: directive.step,
        order: performances.length,
      });

      await onPerformancesChange?.();
    },
    [scene.id, performances.length, onPerformancesChange],
  );

  return {
    // 状态
    isStreaming,
    isPlanningDirective,
    isGeneratingCandidates,
    streamingContent,
    thinkingContent,
    currentActor,

    // 方法
    generateNextDirective,
    performDirectiveAI,
    generateAICandidates,
    saveUserPerformance,
    cancel,

    // 计算属性
    mergedCharactersForPrompt,
  };
}

// ============ 工具函数 ============

function createOrReuseTempId(
  speakerName: string,
  isUser: boolean,
  profiles: Record<string, any>,
): string {
  const existing = Object.values(profiles).find(
    (p) => p.name === speakerName && p.isUser === isUser,
  );
  if (existing) return existing.id;
  const prefix = isUser ? "temp_user" : "temp_ai";
  return `${prefix}_${sanitizeNamePart(speakerName)}_${Date.now()}`;
}

function sanitizeNamePart(name: string): string {
  const part = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_").replace(/^_+|_+$/g, "");
  return part || "temp";
}

function normalizeTypes(input: unknown): Array<"dialogue" | "action" | "thought" | "emotion"> {
  const valid = new Set(["dialogue", "action", "thought", "emotion"]);
  if (!Array.isArray(input)) return ["dialogue"];

  const out = input
    .map((t) => String(t || "").toLowerCase().trim())
    .filter((t): t is "dialogue" | "action" | "thought" | "emotion" => valid.has(t));

  return out.length > 0 ? out.slice(0, 2) : ["dialogue"];
}
