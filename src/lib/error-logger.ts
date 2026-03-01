/**
 * 错误日志工具
 * 用于收集和存储运行时错误，方便移动端调试
 */

const STORAGE_KEY = "error-logs";
const MAX_LOGS = 100; // 最多保存 100 条错误

export interface ErrorLog {
  id: string;
  timestamp: number;
  type: "error" | "warn" | "info";
  message: string;
  stack?: string;
  source?: string; // 错误来源：component, api, db, etc.
  userAgent?: string;
}

/**
 * 添加错误日志
 */
export function logError(
  message: string,
  error?: any,
  source: string = "unknown"
): void {
  const log: ErrorLog = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type: "error",
    message,
    stack: error?.stack || error?.message,
    source,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  // 同时输出到 console.error
  console.error(`[${source}] ${message}`, error);

  saveLog(log);
}

/**
 * 添加警告日志
 */
export function logWarn(
  message: string,
  data?: any,
  source: string = "unknown"
): void {
  const log: ErrorLog = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type: "warn",
    message,
    stack: data?.stack || (typeof data === "string" ? data : undefined),
    source,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  console.warn(`[${source}] ${message}`, data);

  saveLog(log);
}

/**
 * 添加信息日志
 */
export function logInfo(
  message: string,
  data?: any,
  source: string = "unknown"
): void {
  const log: ErrorLog = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type: "info",
    message,
    source,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  console.log(`[${source}] ${message}`, data);

  saveLog(log);
}

/**
 * 保存日志到 localStorage
 */
function saveLog(log: ErrorLog): void {
  try {
    const logs = getLogs();
    logs.unshift(log); // 新日志放在最前面
    
    // 限制日志数量
    if (logs.length > MAX_LOGS) {
      logs.splice(MAX_LOGS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    // 如果 localStorage 失败，只输出到 console
    console.error("保存错误日志失败:", e);
  }
}

/**
 * 获取所有日志
 */
export function getLogs(): ErrorLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * 清除所有日志
 */
export function clearLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 导出日志为 JSON 字符串
 */
export function exportLogs(): string {
  const logs = getLogs();
  const exportData = {
    exportedAt: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    logsCount: logs.length,
    logs,
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * 下载日志文件
 */
export function downloadLogs(): void {
  const json = exportLogs();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `error-logs-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 获取日志统计信息
 */
export function getLogsStats(): { total: number; byType: Record<string, number>; bySource: Record<string, number> } {
  const logs = getLogs();
  const stats = {
    total: logs.length,
    byType: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
  };

  for (const log of logs) {
    if (log.type) {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
    }
    if (log.source) {
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
    }
  }

  return stats;
}
