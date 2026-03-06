/**
 * 指令持久化 Hook
 * 封装 localStorage 中导演指令状态的存储和读取
 */

import { useState, useEffect, useCallback } from "preact/hooks";
import type { SceneDirective } from "./useScenePerformance";

interface TempCharacterProfile {
  id: string;
  name: string;
  isUser: boolean;
  background?: string;
  dialogueStyle?: string;
}

export interface PersistedDirectiveState {
  nextDirective: SceneDirective | null;
  directiveHistory: SceneDirective[];
  tempCharacterProfiles: Record<string, TempCharacterProfile>;
}

const DIRECTIVE_STORAGE_PREFIX = "scene-next-directive";

function getDirectiveStorageKey(sceneId: string): string {
  return `${DIRECTIVE_STORAGE_PREFIX}:${sceneId}`;
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

export function useDirectivePersistence(sceneId: string) {
  const [state, setState] = useState<PersistedDirectiveState>({
    nextDirective: null,
    directiveHistory: [],
    tempCharacterProfiles: {},
  });

  // 加载持久化数据
  const loadState = useCallback(() => {
    const key = getDirectiveStorageKey(sceneId);
    const raw = localStorage.getItem(key);
    const parsed = parsePersistedDirectiveState(raw);
    setState(parsed);
  }, [sceneId]);

  // 保存状态
  const saveState = useCallback((newState: Partial<PersistedDirectiveState>) => {
    setState((prev) => {
      const updated = { ...prev, ...newState };
      return updated;
    });
  }, []);

  // 持久化到 localStorage
  useEffect(() => {
    const key = getDirectiveStorageKey(sceneId);
    localStorage.setItem(key, JSON.stringify(state));
  }, [sceneId, state]);

  // 清除持久化数据
  const clearState = useCallback(() => {
    const key = getDirectiveStorageKey(sceneId);
    localStorage.removeItem(key);
    setState({
      nextDirective: null,
      directiveHistory: [],
      tempCharacterProfiles: {},
    });
  }, [sceneId]);

  return {
    // 状态
    nextDirective: state.nextDirective,
    directiveHistory: state.directiveHistory,
    tempCharacterProfiles: state.tempCharacterProfiles,

    // 方法
    loadState,
    saveState,
    clearState,
    setNextDirective: (directive: SceneDirective | null) => {
      saveState({ nextDirective: directive });
    },
    addDirectiveToHistory: (directive: SceneDirective) => {
      saveState({ directiveHistory: [...state.directiveHistory, directive] });
    },
    updateTempCharacterProfile: (profile: TempCharacterProfile) => {
      saveState({
        tempCharacterProfiles: {
          ...state.tempCharacterProfiles,
          [profile.id]: profile,
        },
      });
    },
  };
}
