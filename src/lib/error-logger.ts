/**
 * 错误日志工具
 * 用于收集和存储运行时错误，方便移动端调试
 */

const STORAGE_KEY = "error-logs";
const MAX_LOGS = 100; // 最多保存 100 条错误
const CALLER_EXCLUDE_PATTERNS = [
  "error-logger.ts",
  "error-logger.js",
  "<anonymous>",
];

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

  function captureConsole(
    type: ErrorLog["type"],
    method: string,
    args: any[],
  ): void {
    const caller = getCallerInfo();
    const source = caller.location ? `${method}@${caller.location}` : method;
    queueLog(
      buildErrorLog(
        type,
        source,
        args.map(stringifyArg).join(" "),
        caller.stack,
        caller.location,
      ),
    );
  }

  // 拦截 console.log
  console.log = function (...args: any[]) {
    originalConsole.log.apply(console, args);
    captureConsole("info", "console.log", args);
  };

  // 拦截 console.debug
  console.debug = function (...args: any[]) {
    originalConsole.debug.apply(console, args);
    captureConsole("info", "console.debug", args);
  };

  // 拦截 console.info
  console.info = function (...args: any[]) {
    originalConsole.info.apply(console, args);
    captureConsole("info", "console.info", args);
  };

  // 拦截 console.warn
  console.warn = function (...args: any[]) {
    originalConsole.warn.apply(console, args);
    captureConsole("warn", "console.warn", args);
  };

  // 拦截 console.error
  console.error = function (...args: any[]) {
    originalConsole.error.apply(console, args);
    captureConsole("error", "console.error", args);
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
  location?: string; // 代码位置：src/xx.ts:line:col
  userAgent?: string;
}

interface CallerInfo {
  location?: string;
  stack?: string;
}

function extractLocationFromStack(stack?: string): string | undefined {
  if (!stack) return undefined;

  const lines = stack.split("\n").map((line) => line.trim());
  for (const line of lines) {
    if (!line) continue;
    if (CALLER_EXCLUDE_PATTERNS.some((pattern) => line.includes(pattern))) {
      continue;
    }

    const chromeLike = line.match(
      /(?:at\s+.*?\()?(https?:\/\/[^\s)]+|file:\/\/[^\s)]+|\/[^\s):]+):(\d+):(\d+)\)?$/,
    );
    if (chromeLike) {
      return normalizeLocation(chromeLike[1], chromeLike[2], chromeLike[3]);
    }

    const firefoxLike = line.match(
      /@((?:https?:\/\/|file:\/\/)[^\s)]+|\/[^\s):]+):(\d+):(\d+)$/,
    );
    if (firefoxLike) {
      return normalizeLocation(firefoxLike[1], firefoxLike[2], firefoxLike[3]);
    }
  }

  return undefined;
}

function normalizeLocation(rawPath: string, line: string, column: string): string {
  let path = rawPath;

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("file://")
  ) {
    try {
      path = new URL(path).pathname;
    } catch {
      // ignore URL parse errors
    }
  }

  const srcIndex = path.indexOf("/src/");
  if (srcIndex >= 0) {
    path = path.slice(srcIndex + 1);
  } else {
    path = path.split("/").filter(Boolean).slice(-2).join("/");
  }

  return `${path}:${line}:${column}`;
}

function getCallerInfo(): CallerInfo {
  const stack = new Error().stack;
  return {
    stack,
    location: extractLocationFromStack(stack),
  };
}

function buildErrorLog(
  type: ErrorLog["type"],
  source: string,
  message: string,
  stack?: string,
  location?: string,
): ErrorLog {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type,
    message,
    stack,
    source,
    location,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
}

/**
 * 添加错误日志
 */
export function logError(
  message: string,
  error?: any,
  source: string = "unknown",
): void {
  try {
    const caller = getCallerInfo();
    const stack = error?.stack || error?.message || caller.stack;
    const location = extractLocationFromStack(stack) || caller.location;
    const log = buildErrorLog("error", source, message, stack, location);

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
  source: string = "unknown",
): void {
  try {
    const caller = getCallerInfo();
    const stack = data?.stack || (typeof data === "string" ? data : caller.stack);
    const location = extractLocationFromStack(stack) || caller.location;
    const log = buildErrorLog("warn", source, message, stack, location);

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
  source: string = "unknown",
): void {
  try {
    const caller = getCallerInfo();
    const stack = data?.stack || caller.stack;
    const location = extractLocationFromStack(stack) || caller.location;
    const log = buildErrorLog("info", source, message, stack, location);

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
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
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
export function getLogsStats(): {
  total: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
} {
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
    const testLog: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "info",
      message: "这是测试日志",
      source: "test",
      userAgent: navigator.userAgent,
    };

    saveLog(testLog);
  }
}
