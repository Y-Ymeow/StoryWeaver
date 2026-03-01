/**
 * 错误日志工具
 * 用于收集和存储运行时错误，方便移动端调试
 */

const STORAGE_KEY = "error-logs";
const MAX_LOGS = 100; // 最多保存 100 条错误

// 检查 localStorage 是否可用
function isLocalStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    console.error("[error-logger] localStorage 不可用:", e);
    return false;
  }
}

const HAS_LOCAL_STORAGE = isLocalStorageAvailable();

// 日志队列，用于批量保存
let logQueue: ErrorLog[] = [];
let saveTimeout: number | null = null;

/**
 * 批量保存日志（防抖，避免频繁写入 localStorage）
 */
function flushLogQueue(): void {
  if (logQueue.length === 0) return;

  try {
    const logs = getLogs();
    logs.unshift(...logQueue);
    
    if (logs.length > MAX_LOGS) {
      logs.splice(MAX_LOGS);
    }
    
    const jsonStr = JSON.stringify(logs);
    localStorage.setItem(STORAGE_KEY, jsonStr);
    logQueue = [];
  } catch (e: any) {
    console.error("[error-logger] 批量保存失败:", e.message || e);
  }
}

/**
 * 将日志加入队列并安排保存
 */
function queueLog(log: ErrorLog): void {
  logQueue.push(log);
  
  // 清除之前的定时器
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  // 500ms 后保存，避免频繁写入
  saveTimeout = window.setTimeout(() => {
    flushLogQueue();
    saveTimeout = null;
  }, 500);
}

/**
 * 拦截 console 输出
 */
export function interceptConsole(): void {
  if (typeof console === "undefined") return;

  // 保存原始 console 方法
  const originalConsole = {
    log: console.log,
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  // 拦截 console.log
  console.log = function (...args: any[]) {
    originalConsole.log.apply(console, args);
    queueLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "info",
      message: args.map(stringifyArg).join(" "),
      source: "console.log",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
  };

  // 拦截 console.debug
  console.debug = function (...args: any[]) {
    originalConsole.debug.apply(console, args);
    queueLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "info",
      message: args.map(stringifyArg).join(" "),
      source: "console.debug",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
  };

  // 拦截 console.info
  console.info = function (...args: any[]) {
    originalConsole.info.apply(console, args);
    queueLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "info",
      message: args.map(stringifyArg).join(" "),
      source: "console.info",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
  };

  // 拦截 console.warn
  console.warn = function (...args: any[]) {
    originalConsole.warn.apply(console, args);
    queueLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "warn",
      message: args.map(stringifyArg).join(" "),
      source: "console.warn",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
  };

  // 拦截 console.error
  console.error = function (...args: any[]) {
    originalConsole.error.apply(console, args);
    queueLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "error",
      message: args.map(stringifyArg).join(" "),
      source: "console.error",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
  };

  console.log("[error-logger] Console 拦截已启用");
}

/**
 * 将参数转换为字符串
 */
function stringifyArg(arg: any): string {
  try {
    if (arg === undefined) return "undefined";
    if (arg === null) return "null";
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return arg.message;
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

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
  try {
    const log: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "error",
      message,
      stack: error?.stack || error?.message,
      source,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    // 同时输出到 console.error（会被拦截）
    console.error(`[${source}] ${message}`, error);

    // 加入队列
    queueLog(log);
  } catch (e: any) {
    console.error("[error-logger] logError 失败:", e.message || e);
  }
}

/**
 * 添加警告日志
 */
export function logWarn(
  message: string,
  data?: any,
  source: string = "unknown"
): void {
  try {
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
    queueLog(log);
  } catch (e: any) {
    console.error("[error-logger] logWarn 失败:", e.message || e);
  }
}

/**
 * 添加信息日志
 */
export function logInfo(
  message: string,
  data?: any,
  source: string = "unknown"
): void {
  try {
    const log: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "info",
      message,
      source,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    console.log(`[${source}] ${message}`, data);
    queueLog(log);
  } catch (e: any) {
    console.error("[error-logger] logInfo 失败:", e.message || e);
  }
}

/**
 * 保存日志到 localStorage
 */
function saveLog(log: ErrorLog): void {
  if (!HAS_LOCAL_STORAGE) {
    console.error("[error-logger] localStorage 不可用，使用内存存储");
    return;
  }

  try {
    const logs = getLogs();
    logs.unshift(log); // 新日志放在最前面

    // 限制日志数量
    if (logs.length > MAX_LOGS) {
      logs.splice(MAX_LOGS);
    }

    const jsonStr = JSON.stringify(logs);
    localStorage.setItem(STORAGE_KEY, jsonStr);
    console.log(`[error-logger] 日志已保存，共 ${logs.length} 条`);
  } catch (e: any) {
    // 如果是序列化失败，尝试清理循环引用
    if (e.message?.includes("circular")) {
      console.error("[error-logger] JSON 序列化失败，可能是循环引用:", log);
    } else {
      console.error("[error-logger] 保存错误日志失败:", e.message || e);
    }
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

/**
 * 测试日志系统是否正常工作
 */
export function testErrorLogger(): void {
  console.log("[error-logger] 测试日志系统...");
  console.log("[error-logger] localStorage 可用:", HAS_LOCAL_STORAGE);
  
  if (HAS_LOCAL_STORAGE) {
    const currentData = localStorage.getItem(STORAGE_KEY);
    console.log("[error-logger] 当前存储的日志数据:", currentData?.slice(0, 100) + "...");
    
    const testLog: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "info",
      message: "这是测试日志",
      source: "test",
      userAgent: navigator.userAgent,
    };
    
    saveLog(testLog);
    
    const afterSave = localStorage.getItem(STORAGE_KEY);
    console.log("[error-logger] 保存测试日志后:", afterSave?.slice(0, 100) + "...");
    
    const logs = getLogs();
    console.log("[error-logger] 获取到的日志数量:", logs.length);
  }
}
