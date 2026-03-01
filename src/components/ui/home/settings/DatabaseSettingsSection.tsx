/**
 * 设置页面 - 数据库设置子组件
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Card } from "@components/ui/common";
import {
  getStoredFileHandle,
  clearStoredFileHandle,
  selectDatabaseFile,
  storeFileHandle,
  isOPFSSupported,
  getOPFSFileHandle,
  readFileData,
  saveToOPFS,
  clearOPFS,
  isFileSystemAccessSupported,
  readOPFSFileData,
} from "@/db/file-system";
import { setFileHandle, saveDBToFile, isMemoryMode, getDB, isOPFSMode } from "@/db/core";

interface DatabaseSettingsSectionProps {
  onMessage: (type: "success" | "error", text: string) => void;
}

export const DatabaseSettingsSection: FunctionalComponent<DatabaseSettingsSectionProps> = ({
  onMessage,
}) => {
  const [hasStoredHandle, setHasStoredHandle] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMemory, setIsMemory] = useState(false);
  const [isOPFS, setIsOPFS] = useState(false);

  const checkStoredHandle = async () => {
    const handle = await getStoredFileHandle();
    setHasStoredHandle(!!handle);
    setIsMemory(isMemoryMode());
    setIsOPFS(isOPFSMode());
  };

  useEffect(() => {
    checkStoredHandle();
  }, []);

  const handleSelectNewFile = async () => {
    setIsLoading(true);
    try {
      const fileHandle = await selectDatabaseFile();
      if (fileHandle) {
        await storeFileHandle(fileHandle);
        setFileHandle(fileHandle);
        setHasStoredHandle(true);
        setIsOPFS(false);
        onMessage("success", "数据库文件已连接");
        checkStoredHandle();
      }
    } catch (err) {
      onMessage("error", err instanceof Error ? err.message : "选择文件失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportToOPFS = async () => {
    if (!confirm('确定要将本地数据库导入到 OPFS 吗？\n\n注意：导入后数据将保存在浏览器私有存储中。')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const fileHandle = await selectDatabaseFile();
      if (fileHandle) {
        const data = await readFileData(fileHandle);
        if (data) {
          await saveToOPFS(data);
          onMessage("success", "数据库已导入到 OPFS");
          checkStoredHandle();
        }
      }
    } catch (err) {
      onMessage("error", err instanceof Error ? err.message : "导入失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHandle = async () => {
    if (!confirm('确定要清除数据库连接吗？\n\n这将删除保存的文件句柄，下次需要重新选择数据库。')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await clearStoredFileHandle();
      setFileHandle(null as any);
      setHasStoredHandle(false);
      setIsOPFS(false);
      onMessage("success", "数据库连接已清除。");
    } catch (err) {
      onMessage("error", err instanceof Error ? err.message : "清除失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearOPFS = async () => {
    if (!confirm('确定要清除 OPFS 中的数据库吗？\n\n警告：此操作将永久删除 OPFS 中的所有数据，且无法恢复！')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await clearOPFS();
      onMessage("success", "OPFS 数据库已清除，刷新页面后生效");
      checkStoredHandle();
    } catch (err) {
      onMessage("error", err instanceof Error ? err.message : "清除 OPFS 失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadOPFS = async () => {
    setIsLoading(true);
    try {
      const opfsHandle = await getOPFSFileHandle();
      if (!opfsHandle) {
        throw new Error('OPFS 数据库不存在');
      }
      
      const data = await readOPFSFileData(opfsHandle);
      if (!data || data.length === 0) {
        throw new Error('OPFS 数据库为空');
      }
      
      // 创建下载链接 - 转换为 ArrayBuffer
      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-cinama-opfs-${new Date().toISOString().slice(0, 10)}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      onMessage("success", "OPFS 数据库已下载");
    } catch (err) {
      onMessage("error", err instanceof Error ? err.message : "下载失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNow = async () => {
    setIsLoading(true);
    try {
      await saveDBToFile();
      onMessage("success", "数据库已保存");
    } catch (err) {
      onMessage("error", err instanceof Error ? err.message : "保存失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestDatabase = async () => {
    setIsLoading(true);
    try {
      console.log("[测试] 检查数据库连接...");
      const db = getDB();
      console.log("[测试] 数据库实例:", db ? "已连接" : "未连接");

      console.log("[测试] 写入测试数据...");
      const testTableName = "_test_table";
      db.run(`CREATE TABLE IF NOT EXISTS ${testTableName} (id TEXT PRIMARY KEY, value TEXT, created_at INTEGER)`);

      const testId = `test_${Date.now()}`;
      const testData = {
        message: "数据库写入测试",
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };

      const stmt = db.prepare(`INSERT INTO ${testTableName} (id, value, created_at) VALUES (?, ?, ?)`);
      stmt.run([testId, JSON.stringify(testData), Date.now()]);
      stmt.free();

      console.log("[测试] 读取测试数据...");
      const selectStmt = db.prepare(`SELECT * FROM ${testTableName} WHERE id = ?`);
      selectStmt.bind([testId]);
      let result: any = null;
      if (selectStmt.step()) {
        result = selectStmt.getAsObject();
      }
      selectStmt.free();

      console.log("[测试] 读取结果:", result);

      console.log("[测试] 清理测试数据...");
      const deleteStmt = db.prepare(`DELETE FROM ${testTableName} WHERE id = ?`);
      deleteStmt.run([testId]);
      deleteStmt.free();

      console.log("[测试] 保存到文件...");
      await saveDBToFile();

      onMessage("success", `数据库测试成功！${result ? "读写正常" : "读取失败"}，已保存到文件`);
      console.log("[测试] 数据库测试完成", result);
    } catch (err: any) {
      console.error("[测试] 数据库测试失败:", err);
      onMessage("error", `数据库测试失败：${err.message || "未知错误"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card hover={false}>
        <h3 class="text-lg font-semibold text-white mb-2">📁 数据库设置</h3>
        <div class="text-gray-300 space-y-2">
          <p>
            连接状态：
            {isOPFS ? (
              <span class="text-green-400">✅ 已连接 OPFS 存储</span>
            ) : hasStoredHandle ? (
              <span class="text-green-400">✅ 已连接数据库文件</span>
            ) : isMemory ? (
              <span class="text-yellow-400">⚠️ 内存模式（数据不会保存）</span>
            ) : (
              <span class="text-red-400">❌ 未连接数据库文件</span>
            )}
          </p>

          {/* 移动端提示 */}
          {!isFileSystemAccessSupported() && isOPFSSupported() && (
            <div class="space-y-2">
              <div class="bg-blue-900/30 border border-blue-500 text-blue-300 p-3 rounded-lg text-sm">
                💡 <strong>移动端提示：</strong>建议使用 OPFS 存储，数据会持久保存且无需每次选择文件。
              </div>
              {isOPFS && (
                <div class="bg-yellow-900/30 border border-yellow-500 text-yellow-300 p-3 rounded-lg text-sm">
                  ⚠️ <strong>注意：</strong>当前使用 OPFS 存储。如需手动选择文件，请先清除 OPFS 数据。
                </div>
              )}
            </div>
          )}

          <div class="flex flex-wrap gap-2 mt-4">
            <Button
              onClick={handleSelectNewFile}
              isLoading={isLoading}
            >
              📁 选择数据库文件
            </Button>

            {isFileSystemAccessSupported() && isOPFSSupported() && (
              <Button
                onClick={handleImportToOPFS}
                isLoading={isLoading}
                variant="secondary"
              >
                📥 导入到 OPFS
              </Button>
            )}

            {(hasStoredHandle || isOPFS) && (
              <Button
                onClick={handleClearHandle}
                variant="danger"
                isLoading={isLoading}
              >
                🗑️ 清除数据库连接
              </Button>
            )}

            {!isMemory && (
              <Button
                onClick={handleSaveNow}
                variant="secondary"
                isLoading={isLoading}
              >
                💾 立即保存
              </Button>
            )}
          </div>

          {/* OPFS 专用操作 */}
          {isOPFSSupported() && (
            <div class="mt-4 pt-4 border-t border-dark-accent">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-semibold text-gray-300">📱 OPFS 管理</h4>
                <div class="flex gap-2">
                  <Button
                    onClick={handleDownloadOPFS}
                    variant="secondary"
                    size="sm"
                    isLoading={isLoading}
                  >
                    📥 下载备份
                  </Button>
                  <Button
                    onClick={handleClearOPFS}
                    variant="danger"
                    size="sm"
                    isLoading={isLoading}
                  >
                    🗑️ 清除 OPFS 数据
                  </Button>
                </div>
              </div>
              <p class="text-xs text-gray-500">
                💡 清除 OPFS 数据后，下次可以选择其他数据库文件或重新创建 OPFS 数据库。
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card hover={false}>
        <h3 class="text-lg font-semibold text-white mb-2">🧪 数据库测试</h3>
        <div class="text-gray-300 space-y-2">
          <p class="text-sm">
            测试数据库连接、写入、读取和保存功能是否正常。
          </p>
          <div class="flex gap-2">
            <Button
              onClick={handleTestDatabase}
              isLoading={isLoading}
              variant="primary"
              size="sm"
            >
              💾 测试数据库写入/读取
            </Button>
          </div>
          <p class="text-xs text-gray-500">
            💡 测试会创建一个临时表并写入测试数据，然后自动清理。
          </p>
        </div>
      </Card>

      <Card hover={false}>
        <h3 class="text-lg font-semibold text-white mb-2">📊 数据管理</h3>
        <div class="text-gray-300 space-y-2">
          <p class="text-sm">
            如需清除所有应用数据（包括数据库连接和缓存），请点击下方按钮：
          </p>
          <Button
            onClick={async () => {
              if (
                confirm(
                  "确定要清除所有数据吗？这将删除数据库连接和所有缓存，应用将恢复到初始状态。"
                )
              ) {
                await clearStoredFileHandle();
                localStorage.clear();
                if ("caches" in window) {
                  const names = await caches.keys();
                  await Promise.all(names.map((name) => caches.delete(name)));
                }
                alert("数据已清除，正在刷新页面...");
                location.reload();
              }
            }}
            variant="danger"
            class="w-full sm:w-auto"
          >
            🗑️ 清除所有应用数据
          </Button>
        </div>
      </Card>
    </>
  );
};
