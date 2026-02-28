/**
 * 指令处理模块
 * 
 * 处理用户输入的特殊指令，如 /help, /summary, /skip 等
 */

import type { CommandContext, CommandExecutionResult } from './types'
export type { CommandType, CommandResult, CommandExecutionResult, CommandContext } from './types'

/**
 * 解析用户输入中的指令
 */
export function parseCommand(input: string): CommandResult {
  const trimmed = input.trim()

  // 检查是否以 / 开头
  if (!trimmed.startsWith('/')) {
    return {
      isCommand: false,
      type: 'unknown',
      args: [],
      raw: input,
      shouldExecute: false
    }
  }

  // 解析指令和参数
  const parts = trimmed.slice(1).split(/\s+/)
  const command = parts[0].toLowerCase()
  const args = parts.slice(1)

  const validCommands: CommandType[] = [
    'help',
    'summary',
    'skip',
    'retry',
    'memory',
    'character',
    'scene',
    'exit',
    'save',
    'settings'
  ]

  const type = validCommands.includes(command as CommandType) 
    ? (command as CommandType)
    : 'unknown'

  return {
    isCommand: true,
    type,
    args,
    raw: input,
    shouldExecute: type !== 'unknown'
  }
}

/**
 * 执行指令
 */
export async function executeCommand(
  command: CommandResult,
  context: CommandContext
): Promise<CommandExecutionResult> {
  if (!command.shouldExecute) {
    return {
      success: false,
      message: '不是有效的指令'
    }
  }

  switch (command.type) {
    case 'help':
      return executeHelp(context)
    case 'summary':
      return executeSummary(context)
    case 'skip':
      return executeSkip(context)
    case 'retry':
      return executeRetry(context)
    case 'memory':
      return executeMemory(context)
    case 'character':
      return executeCharacter(context)
    case 'scene':
      return executeScene(context)
    case 'exit':
      return executeExit(context)
    case 'save':
      return executeSave(context)
    case 'settings':
      return executeSettings(context)
    default:
      return {
        success: false,
        message: '未知指令'
      }
  }
}

import type { CommandType, CommandResult } from './types'

/**
 * 帮助指令
 */
function executeHelp(_context: CommandContext): CommandExecutionResult {
  const helpText = `
可用指令:
  /help - 显示帮助信息
  /summary - 查看当前场景总结
  /skip - 跳过当前轮次
  /retry - 重新生成 AI 回复
  /memory - 查看角色记忆
  /character - 查看角色信息
  /scene - 查看场景信息
  /exit - 退出当前场景
  /save - 保存当前进度
  /settings - 打开设置

使用方式：在输入框中输入指令并按回车
`.trim()

  return {
    success: true,
    message: helpText
  }
}

/**
 * 总结指令
 */
async function executeSummary(context: CommandContext): Promise<CommandExecutionResult> {
  // 实际实现需要从数据库获取数据
  return {
    success: true,
    message: '正在获取场景总结...',
    data: {
      sceneId: context.sceneId
    }
  }
}

/**
 * 跳过指令
 */
async function executeSkip(_context: CommandContext): Promise<CommandExecutionResult> {
  return {
    success: true,
    message: '已跳过当前轮次',
    shouldRefresh: true
  }
}

/**
 * 重试指令
 */
async function executeRetry(_context: CommandContext): Promise<CommandExecutionResult> {
  return {
    success: true,
    message: '正在重新生成...',
    shouldRefresh: true
  }
}

/**
 * 记忆指令
 */
async function executeMemory(context: CommandContext): Promise<CommandExecutionResult> {
  return {
    success: true,
    message: '正在获取角色记忆...',
    data: {
      characterId: context.characterId
    }
  }
}

/**
 * 角色指令
 */
async function executeCharacter(context: CommandContext): Promise<CommandExecutionResult> {
  return {
    success: true,
    message: '正在获取角色信息...',
    data: {
      characterId: context.characterId
    }
  }
}

/**
 * 场景指令
 */
async function executeScene(context: CommandContext): Promise<CommandExecutionResult> {
  return {
    success: true,
    message: '正在获取场景信息...',
    data: {
      sceneId: context.sceneId
    }
  }
}

/**
 * 退出指令
 */
async function executeExit(context: CommandContext): Promise<CommandExecutionResult> {
  return {
    success: true,
    message: '正在退出场景...',
    shouldNavigate: true,
    navigateTo: `/room/${context.roomId}`
  }
}

/**
 * 保存指令
 */
async function executeSave(_context: CommandContext): Promise<CommandExecutionResult> {
  return {
    success: true,
    message: '进度已保存'
  }
}

/**
 * 设置指令
 */
async function executeSettings(_context: CommandContext): Promise<CommandExecutionResult> {
  return {
    success: true,
    message: '正在打开设置...',
    shouldNavigate: true,
    navigateTo: '/settings'
  }
}

/**
 * 获取所有可用指令列表
 */
export function getAvailableCommands(): Array<{
  command: string
  description: string
  usage: string
}> {
  return [
    {
      command: '/help',
      description: '显示帮助信息',
      usage: '/help'
    },
    {
      command: '/summary',
      description: '查看当前场景总结',
      usage: '/summary'
    },
    {
      command: '/skip',
      description: '跳过当前轮次',
      usage: '/skip'
    },
    {
      command: '/retry',
      description: '重新生成 AI 回复',
      usage: '/retry'
    },
    {
      command: '/memory',
      description: '查看角色记忆',
      usage: '/memory'
    },
    {
      command: '/character',
      description: '查看角色信息',
      usage: '/character'
    },
    {
      command: '/scene',
      description: '查看场景信息',
      usage: '/scene'
    },
    {
      command: '/exit',
      description: '退出当前场景',
      usage: '/exit'
    },
    {
      command: '/save',
      description: '保存当前进度',
      usage: '/save'
    },
    {
      command: '/settings',
      description: '打开设置',
      usage: '/settings'
    }
  ]
}
