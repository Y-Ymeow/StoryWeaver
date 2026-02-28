/**
 * 指令类型定义
 */

/**
 * 指令类型
 */
export type CommandType = 
  | 'help'
  | 'summary'
  | 'skip'
  | 'retry'
  | 'memory'
  | 'character'
  | 'scene'
  | 'exit'
  | 'save'
  | 'settings'
  | 'unknown'

/**
 * 指令结果
 */
export interface CommandResult {
  // 是否是指令
  isCommand: boolean
  // 指令类型
  type: CommandType
  // 指令参数
  args: string[]
  // 原始输入
  raw: string
  // 是否需要执行特殊处理
  shouldExecute: boolean
}

/**
 * 指令执行上下文
 */
export interface CommandContext {
  // 当前房间 ID
  roomId?: string
  // 当前场景 ID
  sceneId?: string
  // 当前角色 ID
  characterId?: string
  // 当前轮次
  currentRound?: number
  // 其他上下文信息
  [key: string]: any
}

/**
 * 指令执行结果
 */
export interface CommandExecutionResult {
  // 是否成功
  success: boolean
  // 结果消息
  message: string
  // 附加数据
  data?: any
  // 是否需要刷新界面
  shouldRefresh?: boolean
  // 是否需要导航
  shouldNavigate?: boolean
  // 导航目标
  navigateTo?: string
}
