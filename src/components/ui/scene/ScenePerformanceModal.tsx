/**
 * 场景演出模态框
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import { PerformanceList } from "./PerformanceList";
import { ScenePerformanceHeader } from "./ScenePerformanceHeader";
import { ScenePerformanceFooter } from "./ScenePerformanceFooter";
import { SummaryEditModal } from "./SummaryEditModal";
import { useAIChatStream } from "@/hooks/useAIChatStream";
import type { Room, Scene, Character, Performance } from "@/stores";
import {
  getPerformancesBySceneId,
  createPerformance,
  deletePerformance,
  deletePerformancesBySceneId,
} from "@/db/models/performances";
import { updateScene } from "@/db/models/scenes";
import { generateSceneSummary } from "@/lib/memory";
import { parseMultiplePerformances, parseSceneContent } from "@/lib/parser";
import {
  buildSceneDirectivePerformancePrompt,
  buildSceneDirectivePrompt,
} from "@/lib/prompts/scene";
import { findOrCreateCharacter } from "@/lib/rules/character-helper";

interface ScenePerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene;
  room: Room;
  characters: Character[];
  onPerformancesChange: () => void;
}

export type PerformanceStatus = "idle" | "performing" | "completed";

interface SceneDirective {
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

interface TempCharacterProfile {
  id: string;
  name: string;
  isUser: boolean;
  background?: string;
  dialogueStyle?: string;
}

interface PersistedDirectiveState {
  nextDirective: SceneDirective | null;
  directiveHistory: SceneDirective[];
  tempCharacterProfiles: Record<string, TempCharacterProfile>;
}

interface AICandidate {
  id: string;
  content: {
    dialogue?: string;
    action?: string;
    thought?: string;
    emotion?: string;
  };
}

const DIRECTIVE_STORAGE_PREFIX = "scene-next-directive";

function getDirectiveStorageKey(sceneId: string): string {
  return `${DIRECTIVE_STORAGE_PREFIX}:${sceneId}`;
}

function findBalancedJsonEnd(text: string, start: number): number {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  const startChar = text[start];
  if (startChar === "{") stack.push("}");
  else if (startChar === "[") stack.push("]");
  else return -1;

  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      stack.push("}");
      continue;
    }
    if (ch === "[") {
      stack.push("]");
      continue;
    }
    if ((ch === "}" || ch === "]") && stack.length > 0) {
      const expected = stack[stack.length - 1];
      if (ch !== expected) return -1;
      stack.pop();
      if (stack.length === 0) return i;
    }
  }

  return -1;
}

function safeParseJSON<T = unknown>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // ignore
  }

  const codeBlockPattern = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match: RegExpExecArray | null;
  while ((match = codeBlockPattern.exec(text)) !== null) {
    const candidate = match[1]?.trim();
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // ignore
    }
  }

  const cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch !== "{" && ch !== "[") continue;
    const end = findBalancedJsonEnd(cleaned, i);
    if (end === -1) continue;
    const candidate = cleaned.slice(i, end + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // continue scan
    }
  }

  throw new Error("AI 返回中未找到可解析 JSON");
}

function normalizeTypes(input: unknown): Array<"dialogue" | "action" | "thought" | "emotion"> {
  const valid = new Set(["dialogue", "action", "thought", "emotion"]);
  if (!Array.isArray(input)) return ["dialogue"];

  const out = input
    .map((t) => String(t || "").toLowerCase().trim())
    .filter((t): t is "dialogue" | "action" | "thought" | "emotion" => valid.has(t));

  return out.length > 0 ? out.slice(0, 2) : ["dialogue"];
}

function sanitizeNamePart(name: string): string {
  const part = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "_").replace(/^_+|_+$/g, "");
  return part || "temp";
}

function createOrReuseTempId(
  speakerName: string,
  isUser: boolean,
  profiles: Record<string, TempCharacterProfile>,
): string {
  const existing = Object.values(profiles).find(
    (p) => p.name === speakerName && p.isUser === isUser,
  );
  if (existing) return existing.id;
  const prefix = isUser ? "temp_user" : "temp_ai";
  return `${prefix}_${sanitizeNamePart(speakerName)}_${Date.now()}`;
}

function parsePersistedDirectiveState(raw: string | null): PersistedDirectiveState {
  if (!raw) {
    return {
      nextDirective: null,
      directiveHistory: [],
      tempCharacterProfiles: {},
    };
  }

  try {
    const data = JSON.parse(raw) as Partial<PersistedDirectiveState>;
    return {
      nextDirective: data.nextDirective || null,
      directiveHistory: Array.isArray(data.directiveHistory)
        ? data.directiveHistory
        : [],
      tempCharacterProfiles: data.tempCharacterProfiles || {},
    };
  } catch {
    return {
      nextDirective: null,
      directiveHistory: [],
      tempCharacterProfiles: {},
    };
  }
}

export const ScenePerformanceModal: FunctionalComponent<
  ScenePerformanceModalProps
> = ({ isOpen, onClose, scene, room, characters, onPerformancesChange }) => {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [status, setStatus] = useState<PerformanceStatus>("idle");
  const [isLoaded, setIsLoaded] = useState(false);

  const [modelConfig, setModelConfig] = useState<{
    provider: any;
    model: string;
    thinking: any;
  } | null>(null);

  const [generatedSummary, setGeneratedSummary] = useState("");
  const [isProcessingSummary, setIsProcessingSummary] = useState(false);

  const [nextDirective, setNextDirective] = useState<SceneDirective | null>(null);
  const [directiveHistory, setDirectiveHistory] = useState<SceneDirective[]>([]);
  const [tempCharacterProfiles, setTempCharacterProfiles] = useState<
    Record<string, TempCharacterProfile>
  >({});
  const [isPlanningDirective, setIsPlanningDirective] = useState(false);
  const [aiCandidates, setAICandidates] = useState<AICandidate[]>([]);
  const [isGeneratingCandidates, setIsGeneratingCandidates] = useState(false);
  const [completionReason, setCompletionReason] = useState("");

  const { chatStream, isStreaming, cancel } = useAIChatStream();

  const [streamingContent, setStreamingContent] = useState("");
  const [thinkingContent, setThinkingContent] = useState("");
  const [currentActor, setCurrentActor] = useState("");

  const totalSteps = scene.max_rounds || 10;
  const maxPerformedStep =
    performances.length > 0 ? Math.max(...performances.map((p) => p.round), 0) : 0;
  const currentStep = Math.min(nextDirective?.step || maxPerformedStep + 1, totalSteps);
  const progress =
    totalSteps > 0 && isLoaded
      ? Math.min(100, Math.round((maxPerformedStep / totalSteps) * 100))
      : 0;

  const mergedCharactersForPrompt = useMemo(() => {
    const tempCharacters = Object.values(tempCharacterProfiles).map((profile) => ({
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

  const loadPerformances = useCallback(async () => {
    const perfs = await getPerformancesBySceneId(scene.id);
    setPerformances(perfs);

    if (perfs.length === 0) {
      setStatus("idle");
    } else if (status !== "completed") {
      setStatus("performing");
    }

    setIsLoaded(true);
  }, [scene.id, status]);

  useEffect(() => {
    if (!isOpen) return;
    loadPerformances();

    const key = getDirectiveStorageKey(scene.id);
    const raw = localStorage.getItem(key);
    const parsed = parsePersistedDirectiveState(raw);
    setNextDirective(parsed.nextDirective);
    setDirectiveHistory(parsed.directiveHistory);
    setTempCharacterProfiles(parsed.tempCharacterProfiles);
  }, [isOpen, scene.id, loadPerformances]);

  useEffect(() => {
    if (!isOpen || modelConfig) return;
    try {
      const data = localStorage.getItem("ai-providers");
      const loadedProviders = data ? JSON.parse(data) : [];
      const target =
        loadedProviders.find((p: any) => p.is_active) || loadedProviders[0];
      if (!target) return;
      const model = target.custom_models?.[0] || target.model;
      if (!model) return;
      setModelConfig({ provider: target, model, thinking: undefined });
    } catch {
      // ignore bootstrap errors
    }
  }, [isOpen, modelConfig]);

  useEffect(() => {
    if (!isOpen) return;
    const key = getDirectiveStorageKey(scene.id);
    const payload: PersistedDirectiveState = {
      nextDirective,
      directiveHistory,
      tempCharacterProfiles,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  }, [isOpen, scene.id, nextDirective, directiveHistory, tempCharacterProfiles]);

  const generateNextDirective = useCallback(async (): Promise<SceneDirective | null> => {
    if (!modelConfig) {
      alert("请先选择模型");
      return null;
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
          ...(modelConfig.thinking?.enabled && modelConfig.provider.reasoning_effort
            ? { reasoning_effort: modelConfig.provider.reasoning_effort }
            : {}),
        },
        (fullContent, thinking) => {
          setStreamingContent(fullContent);
          setThinkingContent(thinking);
        },
      );

      const parsed = safeParseJSON<any>(content);
      const shouldEnd =
        parsed?.should_end === true ||
        parsed?.shouldEnd === true ||
        parsed?.is_scene_complete === true;
      const endReason = String(
        parsed?.end_reason || parsed?.endReason || "剧情目标已完成",
      ).trim();

      if (shouldEnd) {
        setNextDirective(null);
        setAICandidates([]);
        setCompletionReason(endReason || "剧情目标已完成");
        setStatus("completed");
        setStreamingContent("");
        setThinkingContent("");
        setCurrentActor("");
        return null;
      }

      const speaker = parsed?.speaker || {};
      const speakerMode = String(speaker.mode || "existing").toLowerCase();
      const speakerName = String(speaker.name || "未知角色").trim() || "未知角色";

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
          throw new Error("指令中的 existing 角色不存在，请重新生成");
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

      setNextDirective(directive);

      if (isTemp) {
        setTempCharacterProfiles((prev) => ({
          ...prev,
          [characterId]: {
            id: characterId,
            name: speakerName,
            isUser,
            background,
            dialogueStyle,
          },
        }));
      }

      setStreamingContent("");
      setThinkingContent("");
      setCurrentActor("");
      setCompletionReason("");
      if (status === "idle") setStatus("performing");
      return directive;
    } catch (error: any) {
      console.error("生成下一步指令失败:", error);
      alert(`生成下一步指令失败：${error?.message || "请重试"}`);
      setCurrentActor("");
      return null;
    } finally {
      setIsPlanningDirective(false);
    }
  }, [
    modelConfig,
    room,
    scene,
    mergedCharactersForPrompt,
    performances,
    characters,
    tempCharacterProfiles,
    maxPerformedStep,
    status,
    chatStream,
  ]);

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
        alert("请至少填写一个内容字段");
        return;
      }

      await createPerformance({
        scene_id: scene.id,
        character_id: directive.speaker.characterId,
        content: contentObj,
        primary_type: (Object.keys(contentObj)[0] as any) || "dialogue",
        round: directive.step,
        order: performances.length,
      });

      setDirectiveHistory((prev) => [...prev, directive]);
      setNextDirective(null);
      setAICandidates([]);
      await loadPerformances();
      if (directive.step >= totalSteps) {
        setCompletionReason("已达到场景设定的最大步数");
        setStatus("completed");
      }
    },
    [scene.id, performances.length, loadPerformances, totalSteps],
  );

  const performDirectiveAI = useCallback(
    async (directive: SceneDirective) => {
      if (!modelConfig) {
        alert("请先选择模型");
        return;
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
            content:
              "你是专业演员。根据角色设定和剧情指令生成符合角色性格的表演内容。",
          },
          { role: "user", content: prompt },
        ],
        {
          temperature: 0.7,
          max_tokens: 2048,
          model: modelConfig.model,
          thinking: modelConfig.thinking,
          ...(modelConfig.thinking?.enabled && modelConfig.provider.reasoning_effort
            ? { reasoning_effort: modelConfig.provider.reasoning_effort }
            : {}),
        },
        (fullContent, thinking) => {
          setStreamingContent(fullContent);
          setThinkingContent(thinking);
        },
      );

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

      setDirectiveHistory((prev) => [...prev, directive]);
      setNextDirective(null);
      setAICandidates([]);
      setStreamingContent("");
      setThinkingContent("");
      setCurrentActor("");
      await loadPerformances();
      if (directive.step >= totalSteps) {
        setCompletionReason("已达到场景设定的最大步数");
        setStatus("completed");
      }
    },
    [
      modelConfig,
      mergedCharactersForPrompt,
      room,
      scene,
      performances,
      chatStream,
      loadPerformances,
      totalSteps,
    ],
  );

  const generateAICandidates = useCallback(
    async (directive: SceneDirective) => {
      if (!directive.speaker.isUser) {
        alert("四选一只用于用户步骤");
        return;
      }
      if (!modelConfig) {
        alert("请先选择模型");
        return;
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
            ...(modelConfig.thinking?.enabled && modelConfig.provider.reasoning_effort
              ? { reasoning_effort: modelConfig.provider.reasoning_effort }
              : {}),
          },
          (full, thinking) => {
            setStreamingContent(full);
            setThinkingContent(thinking);
          },
        );

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
        setAICandidates(normalized);
      } catch (error: any) {
        console.error("生成候选台词失败:", error);
        alert(`生成候选台词失败：${error?.message || "请重试"}`);
      } finally {
        setIsGeneratingCandidates(false);
        setCurrentActor("");
        setStreamingContent("");
        setThinkingContent("");
      }
    },
    [modelConfig, mergedCharactersForPrompt, performances, scene, chatStream],
  );

  const applyAICandidate = useCallback(
    async (directive: SceneDirective, candidate: AICandidate) => {
      if (!candidate || Object.keys(candidate.content).length === 0) {
        alert("候选内容为空");
        return;
      }

      await createPerformance({
        scene_id: scene.id,
        character_id: directive.speaker.characterId,
        content: candidate.content,
        primary_type: (Object.keys(candidate.content)[0] as any) || "dialogue",
        round: directive.step,
        order: performances.length,
      });

      setDirectiveHistory((prev) => [...prev, directive]);
      setNextDirective(null);
      setAICandidates([]);
      await loadPerformances();
      if (directive.step >= totalSteps) {
        setCompletionReason("已达到场景设定的最大步数");
        setStatus("completed");
      }
    },
    [scene.id, performances.length, loadPerformances, totalSteps],
  );

  const handleGenerateSummary = async () => {
    setIsProcessingSummary(true);
    try {
      const summary = await generateSceneSummary(
        scene,
        performances,
        mergedCharactersForPrompt,
        modelConfig
          ? {
              provider: modelConfig.provider,
              model: modelConfig.model,
            }
          : undefined,
      );
      setGeneratedSummary(summary);
    } catch (error) {
      console.error("生成摘要失败:", error);
      setGeneratedSummary("生成摘要失败，请手动输入摘要。");
    } finally {
      setIsProcessingSummary(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!generatedSummary.trim()) {
      alert("请输入场景摘要");
      return;
    }
    setIsProcessingSummary(true);
    try {
      await updateScene(scene.id, { summary: generatedSummary });
      setGeneratedSummary("");
      setStatus("completed");
      onPerformancesChange();
    } catch (error) {
      console.error("保存摘要失败:", error);
      alert("保存摘要失败，请重试");
    } finally {
      setIsProcessingSummary(false);
    }
  };

  const handleSkipSummary = () => {
    setGeneratedSummary("");
    setCompletionReason("");
    setStatus("completed");
    onPerformancesChange();
  };

  const clearHistory = useCallback(async () => {
    if (!confirm("确定要清空所有演出记录吗？")) return;
    await deletePerformancesBySceneId(scene.id);
    localStorage.removeItem(getDirectiveStorageKey(scene.id));
    setNextDirective(null);
    setDirectiveHistory([]);
    setTempCharacterProfiles({});
    setCompletionReason("");
    await loadPerformances();
    setStatus("idle");
  }, [scene.id, loadPerformances]);

  const deletePerf = useCallback(
    async (id: string) => {
      await deletePerformance(id);
      await loadPerformances();
      onPerformancesChange();
    },
    [loadPerformances, onPerformancesChange],
  );

  const handleClose = () => {
    if (isStreaming) {
      cancel();
    }
    onPerformancesChange();
    onClose();
  };

  const handleContinue = useCallback(async () => {
    if (status === "idle") setStatus("performing");

    if (!modelConfig) {
      alert("未检测到可用模型，请先在顶部模型按钮中选择模型");
      if (performances.length === 0 && !nextDirective) {
        setStatus("idle");
      }
      return;
    }

    if (status === "completed") {
      return;
    }

    if (!nextDirective && maxPerformedStep >= totalSteps) {
      setCompletionReason("已达到场景设定的最大步数");
      setStatus("completed");
      return;
    }

    if (nextDirective) {
      if (nextDirective.speaker.isUser) {
        alert("当前是用户步骤，请先提交你的内容（或生成4句候选后选择）");
        return;
      }
      try {
        await performDirectiveAI(nextDirective);
      } catch (error: any) {
        console.error("AI 表演失败:", error);
        alert(`AI 表演失败：${error?.message || "请重试"}`);
      }
      return;
    }

    const directive = await generateNextDirective();
    if (!directive) return;

    setAICandidates([]);
    if (status === "idle") setStatus("performing");
    if (!directive.speaker.isUser) {
      try {
        await performDirectiveAI(directive);
      } catch (error: any) {
        console.error("AI 表演失败:", error);
        alert(`AI 表演失败：${error?.message || "请重试"}`);
      }
    }
  }, [
    modelConfig,
    status,
    nextDirective,
    maxPerformedStep,
    totalSteps,
    generateNextDirective,
    performDirectiveAI,
    performances.length,
  ]);

  const handleEndPerformance = useCallback(() => {
    setAICandidates([]);
    setNextDirective(null);
    setCompletionReason("手动结束演出");
    setStatus("completed");
  }, []);

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div class="w-full h-full max-w-7xl mx-auto p-2 md:p-4 flex flex-col">
        <div class="bg-dark-surface rounded-lg shadow-2xl flex flex-col h-full overflow-hidden">
          <ScenePerformanceHeader
            scene={scene}
            status={status}
            currentStep={currentStep}
            totalSteps={totalSteps}
            progress={progress}
            nextDirective={nextDirective}
            completionReason={completionReason}
            onClearHistory={clearHistory}
            onClose={handleClose}
            onModelConfigChange={setModelConfig}
          />

          <div class="flex-1 overflow-y-auto p-2 md:p-4">
            <PerformanceList
              performances={performances}
              characters={characters}
              tempCharacterProfiles={tempCharacterProfiles}
              onDeletePerformance={deletePerf}
            />
          </div>

          <ScenePerformanceFooter
            status={status}
            currentStep={currentStep}
            totalSteps={totalSteps}
            nextDirective={nextDirective}
            isLoaded={isLoaded}
            characters={characters}
            isAdvancing={isPlanningDirective || isStreaming || isGeneratingCandidates}
            aiCandidates={aiCandidates}
            isGeneratingCandidates={isGeneratingCandidates}
            saveUserPerformance={saveUserPerformance}
            onGenerateCandidates={generateAICandidates}
            onSelectCandidate={applyAICandidate}
            onContinue={handleContinue}
            onEndPerformance={handleEndPerformance}
            onFinish={handleGenerateSummary}
            generatedSummary={generatedSummary}
            isProcessingSummary={isProcessingSummary}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            thinkingContent={thinkingContent}
            currentActor={currentActor}
          />
        </div>
      </div>

      <SummaryEditModal
        isOpen={status === "completed" && !!generatedSummary}
        totalSteps={totalSteps}
        performanceCount={performances.length}
        generatedSummary={generatedSummary}
        isProcessing={isProcessingSummary}
        onSummaryChange={setGeneratedSummary}
        onSave={handleSaveSummary}
        onSkip={handleSkipSummary}
      />
    </div>
  );
};
