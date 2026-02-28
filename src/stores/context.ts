/**
 * Store Context 定义
 * 单独导出 Context 以避免循环依赖
 */

import { createContext } from 'preact'
import type { Store } from './types'

export const StoreContext = createContext<Store | null>(null)

/**
 * Hook 函数定义
 */
import { useContext } from 'preact/hooks'

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore 必须在 StoreProvider 内部使用')
  }
  return context
}

export function useDispatch() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useDispatch 必须在 StoreProvider 内部使用')
  }
  return context.dispatch
}

export function useStateValue() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStateValue 必须在 StoreProvider 内部使用')
  }
  return context.state
}
