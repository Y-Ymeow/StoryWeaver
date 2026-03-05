/**
 * 设置页面 - 数据库设置子组件（Dexie / IndexedDB）
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Card } from "@components/ui/common";
import { saveDBToFile, isMemoryMode, isIndexedDBMode } from "@/db/core";
import { dexieDB } from "@/db/dexie";

interface DatabaseSettingsSectionProps {
  onMessage: (type: "success" | "error", text: string) => void;
}

export const DatabaseSettingsSection: FunctionalComponent<DatabaseSettingsSectionProps> = ({
  onMessage,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isMemory, setIsMemory] = useState(false);
  const [isIndexedDB, setIsIndexedDB] = useState(false);

  const refreshStatus = () => {
    setIsMemory(isMemoryMode());
    setIsIndexedDB(isIndexedDBMode());
  };

  useEffect(() => {
    refreshStatus();
  }, []);

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
      const testKey = `_test:${Date.now()}`;
      const testData = {
        message: "数据库写入测试",
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };

      await dexieDB.system_settings.put({
        key: testKey,
        value: JSON.stringify(testData),
      });

      const result = await dexieDB.system_settings.get(testKey);
      await dexieDB.system_settings.delete(testKey);

      await saveDBToFile();
      onMessage("success", `数据库测试成功！${result ? "读写正常" : "读取失败"}`);
    } catch (err: any) {
      onMessage("error", `数据库测试失败：${err.message || "未知错误"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearIndexedDB = async () => {
    if (!confirm("确定要清空 IndexedDB 数据吗？此操作不可恢复。")) {
      return;
    }

    setIsLoading(true);
    try {
      await dexieDB.delete();
      onMessage("success", "IndexedDB 数据已清空，正在刷新页面...");
      setTimeout(() => location.reload(), 300);
    } catch (err) {
      onMessage("error", err instanceof Error ? err.message : "清空失败");
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
            {isIndexedDB ? (
              <span class="text-green-400">✅ 已连接 IndexedDB 存储（Dexie）</span>
            ) : isMemory ? (
              <span class="text-yellow-400">⚠️ 内存模式（数据不会保存）</span>
            ) : (
              <span class="text-red-400">❌ 未连接数据库</span>
            )}
          </p>

          <div class="flex flex-wrap gap-2 mt-4">
            <Button onClick={handleSaveNow} variant="secondary" isLoading={isLoading}>
              💾 立即保存
            </Button>

            <Button onClick={handleClearIndexedDB} variant="danger" isLoading={isLoading}>
              🗑️ 清空 IndexedDB
            </Button>
          </div>
        </div>
      </Card>

      <Card hover={false}>
        <h3 class="text-lg font-semibold text-white mb-2">🧪 数据库测试</h3>
        <div class="text-gray-300 space-y-2">
          <p class="text-sm">测试 IndexedDB 的写入、读取和删除功能是否正常。</p>
          <div class="flex gap-2">
            <Button
              onClick={handleTestDatabase}
              isLoading={isLoading}
              variant="primary"
              size="sm"
            >
              💾 测试数据库读写
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
};
