/**
 * 设置页面 - 错误日志设置子组件
 */

import { FunctionalComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Button, Card, Modal } from "@components/ui/common";
import {
  getLogs,
  clearLogs,
  downloadLogs,
  getLogsStats,
  testErrorLogger,
  logError,
  type ErrorLog,
} from "@/lib/error-logger";

interface ErrorLogsSectionProps {
  onMessage: (type: "success" | "error", text: string) => void;
}

export const ErrorLogsSection: FunctionalComponent<ErrorLogsSectionProps> = ({
  onMessage,
}) => {
  const [showErrorLogs, setShowErrorLogs] = useState(false);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [errorLogsStats, setErrorLogsStats] = useState<{
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    loadErrorLogs();
  }, []);

  const loadErrorLogs = () => {
    try {
      const logs = getLogs();

      setErrorLogs(logs);
      setErrorLogsStats(getLogsStats());
    } catch (e: any) {
      console.error("[Settings] 加载错误日志失败:", e.message || e);
    }
  };

  const handleClearErrorLogs = () => {
    if (confirm("确定要清除所有错误日志吗？")) {
      clearLogs();
      loadErrorLogs();
      onMessage("success", "错误日志已清除");
    }
  };

  const handleDownloadErrorLogs = () => {
    downloadLogs();
    onMessage("success", "错误日志已下载");
  };

  const handleTestErrorLogger = () => {
    testErrorLogger();

    logError("这是一个测试错误", new Error("测试用错误"), "test-button");

    loadErrorLogs();
    onMessage("success", "测试错误已生成，请查看日志列表和控制台");
  };

  return (
    <>
      <Card hover={false}>
        <h3 class="text-lg font-semibold text-white mb-2">🐛 错误日志</h3>
        <div class="text-gray-300 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-sm">
              {errorLogsStats ? (
                <>
                  共{" "}
                  <span class="text-white font-medium">
                    {errorLogsStats.total}
                  </span>{" "}
                  条日志
                  {errorLogsStats.byType.error > 0 && (
                    <span class="text-red-400 ml-2">
                      错误：{errorLogsStats.byType.error}
                    </span>
                  )}
                  {errorLogsStats.byType.warn > 0 && (
                    <span class="text-yellow-400 ml-2">
                      警告：{errorLogsStats.byType.warn}
                    </span>
                  )}
                </>
              ) : (
                "加载中..."
              )}
            </p>
            <div class="flex gap-2">
              <Button
                onClick={() => {
                  setShowErrorLogs(true);
                  loadErrorLogs();
                }}
                variant="secondary"
                size="sm"
              >
                📋 查看日志
              </Button>
              <Button
                onClick={handleDownloadErrorLogs}
                variant="secondary"
                size="sm"
                disabled={!errorLogsStats || errorLogsStats.total === 0}
              >
                📥 导出日志
              </Button>
              <Button
                onClick={handleClearErrorLogs}
                variant="danger"
                size="sm"
                disabled={!errorLogsStats || errorLogsStats.total === 0}
              >
                🗑️ 清除
              </Button>
            </div>
          </div>
          <div class="flex gap-2 mt-2">
            <Button
              onClick={handleTestErrorLogger}
              variant="secondary"
              size="sm"
            >
              🧪 测试日志
            </Button>
          </div>
          <p class="text-xs text-gray-500">
            💡 错误日志会保存在本地，用于移动端调试。建议定期清理。
          </p>
        </div>
      </Card>

      {/* 错误日志查看器 */}
      {showErrorLogs && (
        <Modal
          isOpen={showErrorLogs}
          onClose={() => setShowErrorLogs(false)}
          title="🐛 错误日志"
          size="xl"
          footer={
            <div class="flex justify-between w-full">
              <Button onClick={loadErrorLogs} variant="secondary">
                🔄 刷新
              </Button>
              <div class="flex gap-2">
                <Button onClick={handleDownloadErrorLogs} variant="secondary">
                  📥 导出
                </Button>
                <Button onClick={handleClearErrorLogs} variant="danger">
                  🗑️ 清除
                </Button>
                <Button onClick={() => setShowErrorLogs(false)}>关闭</Button>
              </div>
            </div>
          }
        >
          <div class="space-y-2">
            {errorLogs.length === 0 ? (
              <div class="text-center py-8 text-gray-400">
                <div class="text-4xl mb-2">✨</div>
                <p>暂无错误日志</p>
              </div>
            ) : (
              errorLogs.map((log) => (
                <div
                  key={log.id}
                  class={`p-3 rounded-lg border ${
                    log.type === "error"
                      ? "bg-red-900/20 border-red-500/30"
                      : log.type === "warn"
                        ? "bg-yellow-900/20 border-yellow-500/30"
                        : "bg-blue-900/20 border-blue-500/30"
                  }`}
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-lg">
                          {log.type === "error"
                            ? "❌"
                            : log.type === "warn"
                              ? "⚠️"
                              : "ℹ️"}
                        </span>
                        <span
                          class={`text-xs font-medium px-2 py-0.5 rounded ${
                            log.type === "error"
                              ? "bg-red-500/30 text-red-300"
                              : log.type === "warn"
                                ? "bg-yellow-500/30 text-yellow-300"
                                : "bg-blue-500/30 text-blue-300"
                          }`}
                        >
                          {log.type}
                        </span>
                        <span class="text-xs text-gray-500">
                          [{log.source}]
                        </span>
                        <span class="text-xs text-gray-500 ml-auto">
                          {new Date(log.timestamp).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      <div class="text-sm text-gray-200 break-all">
                        {log.message}
                      </div>
                      {log.stack && (
                        <details class="mt-2">
                          <summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                            查看堆栈详情
                          </summary>
                          <pre class="mt-1 text-xs text-gray-400 bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                            {log.stack}
                          </pre>
                        </details>
                      )}
                      {log.userAgent && (
                        <div class="mt-2 text-xs text-gray-500">
                          🌐 {log.userAgent}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </>
  );
};
