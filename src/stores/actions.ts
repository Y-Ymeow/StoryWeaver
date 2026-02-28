import { useContext } from 'preact/hooks'
import { StoreContext } from './context'
import type { Room, Scene, Character, Performance, ProviderConfig } from './types'

/**
 * 房间相关的状态操作
 */
export function useRoomActions() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useRoomActions 必须在 StoreProvider 内部使用')
  }
  const dispatch = context.dispatch

  const setCurrentRoom = (room: Room | null) => {
    dispatch({ type: 'SET_CURRENT_ROOM', payload: room })
  }

  const setRooms = (rooms: Room[]) => {
    dispatch({ type: 'SET_ROOMS', payload: rooms })
  }

  return {
    setCurrentRoom,
    setRooms
  }
}

/**
 * 场景相关的状态操作
 */
export function useSceneActions() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useSceneActions 必须在 StoreProvider 内部使用')
  }
  const dispatch = context.dispatch

  const setCurrentScene = (scene: Scene | null) => {
    dispatch({ type: 'SET_CURRENT_SCENE', payload: scene })
  }

  const setScenes = (scenes: Scene[]) => {
    dispatch({ type: 'SET_SCENES', payload: scenes })
  }

  return {
    setCurrentScene,
    setScenes
  }
}

/**
 * 角色相关的状态操作
 */
export function useCharacterActions() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useCharacterActions 必须在 StoreProvider 内部使用')
  }
  const dispatch = context.dispatch

  const setCurrentCharacter = (character: Character | null) => {
    dispatch({ type: 'SET_CURRENT_CHARACTER', payload: character })
  }

  const setCharacters = (characters: Character[]) => {
    dispatch({ type: 'SET_CHARACTERS', payload: characters })
  }

  return {
    setCurrentCharacter,
    setCharacters
  }
}

/**
 * 演出相关的状态操作
 */
export function usePerformanceActions() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('usePerformanceActions 必须在 StoreProvider 内部使用')
  }
  const dispatch = context.dispatch

  const setPerformances = (performances: Performance[]) => {
    dispatch({ type: 'SET_PERFORMANCES', payload: performances })
  }

  const addPerformance = (performance: Performance) => {
    dispatch({ type: 'ADD_PERFORMANCE', payload: performance })
  }

  return {
    setPerformances,
    addPerformance
  }
}

/**
 * UI 状态操作
 */
export function useUIActions() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useUIActions 必须在 StoreProvider 内部使用')
  }
  const dispatch = context.dispatch

  const setUIState = (state: Partial<{
    isLoading: boolean
    error: string | null
    sidebarOpen: boolean
    modalOpen: boolean
  }>) => {
    dispatch({ type: 'SET_UI_STATE', payload: state })
  }

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_UI_STATE', payload: { isLoading: loading } })
  }

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_UI_STATE', payload: { error } })
  }

  const toggleSidebar = () => {
    dispatch({ 
      type: 'SET_UI_STATE', 
      payload: { sidebarOpen: !context.state.ui.sidebarOpen } 
    })
  }

  return {
    setUIState,
    setLoading,
    setError,
    toggleSidebar
  }
}

/**
 * Provider 配置操作
 */
export function useProviderActions() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useProviderActions 必须在 StoreProvider 内部使用')
  }
  const dispatch = context.dispatch

  const setProviderConfig = (config: ProviderConfig | null) => {
    dispatch({ type: 'SET_PROVIDER_CONFIG', payload: config })
  }

  return {
    setProviderConfig
  }
}
