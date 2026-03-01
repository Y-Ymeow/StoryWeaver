/**
 * 房间导出/导入管理组件
 */

import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";
import { Button, Modal, Card } from "@components/ui/common";
import type { Room } from "@/stores";
import { exportRoomToFile } from "@/lib/export-import";
import { importRoomFromJSON } from "@/lib/export-import";
import { TextArea } from "@components/ui/common";

interface RoomExportImportProps {
  isOpen: boolean;
  onClose: () => void;
  room?: Room;
  onImported?: (result: {
    roomId: string;
    stats: { scenes: number; characters: number; performances: number };
  }) => void;
}

export const RoomExportImport: FunctionalComponent<RoomExportImportProps> = ({
  isOpen,
  onClose,
  room,
  onImported,
}) => {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [importJson, setImportJson] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    roomId: string;
    stats: { scenes: number; characters: number; performances: number };
  } | null>(null);

  const handleExport = async () => {
    if (!room) return;

    setIsProcessing(true);
    try {
      await exportRoomToFile(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportFromJson = async () => {
    if (!importJson.trim()) return;

    setIsProcessing(true);
    setError(null);
    setImportResult(null);

    try {
      const result = await importRoomFromJSON(importJson);
      setImportResult(result);
      onImported?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileImport = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // 创建 input 元素
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const json = event.target?.result as string;
            const result = await importRoomFromJSON(json);
            setImportResult(result);
            onImported?.(result);
          } catch (err) {
            setError(err instanceof Error ? err.message : "导入失败");
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsText(file);
      };

      input.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📦 导出/导入房间" size="lg">
      <div class="space-y-4">
        {/* 标签页 */}
        <div class="flex border-b border-dark-accent">
          <button
            onClick={() => {
              setActiveTab("export");
              setError(null);
              setImportResult(null);
            }}
            class={`py-2 px-4 transition-colors ${
              activeTab === "export"
                ? "text-primary-400 border-b-2 border-primary-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            📤 导出
          </button>
          <button
            onClick={() => {
              setActiveTab("import");
              setError(null);
              setImportResult(null);
            }}
            class={`py-2 px-4 transition-colors ${
              activeTab === "import"
                ? "text-primary-400 border-b-2 border-primary-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            📥 导入
          </button>
        </div>

        {/* 导出标签页 */}
        {activeTab === "export" && (
          <div class="space-y-4">
            {!room ? (
              <div class="text-center py-8 text-gray-400">
                <p>请在房间详情页使用导出功能</p>
              </div>
            ) : (
              <>
                <Card class="p-4 bg-dark-accent/30">
                  <h3 class="text-lg font-semibold text-white mb-2">
                    📋 导出信息
                  </h3>
                  <div class="space-y-2 text-sm text-gray-300">
                    <div>
                      <span class="text-gray-400">房间名称：</span>
                      {room.name}
                    </div>
                    <div>
                      <span class="text-gray-400">包含内容：</span>
                      场景、角色、演出记录
                    </div>
                    <div>
                      <span class="text-gray-400">导出格式：</span>
                      JSON 文件
                    </div>
                  </div>
                </Card>

                <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div class="flex items-start gap-3">
                    <span class="text-xl">💡</span>
                    <div class="text-sm text-blue-200">
                      <p>导出文件包含：</p>
                      <ul class="list-disc list-inside mt-2 space-y-1 text-blue-300/80">
                        <li>房间基本信息（设定、剧情大纲、世界观等）</li>
                        <li>所有场景数据</li>
                        <li>所有角色数据</li>
                        <li>所有演出记录</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div class="flex justify-end">
                  <Button
                    onClick={handleExport}
                    isLoading={isProcessing}
                    variant="primary"
                  >
                    📤 导出为 JSON 文件
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 导入标签页 */}
        {activeTab === "import" && (
          <div class="space-y-4">
            {/* 文件导入 */}
            <Card>
              <h3 class="text-lg font-semibold text-white mb-3">
                📁 从文件导入
              </h3>
              <p class="text-sm text-gray-400 mb-4">
                选择之前导出的 JSON 文件进行导入
              </p>
              <Button
                onClick={handleFileImport}
                isLoading={isProcessing}
                variant="secondary"
                class="w-full"
              >
                📂 选择 JSON 文件
              </Button>
            </Card>

            {/* JSON 文本导入 */}
            <Card>
              <h3 class="text-lg font-semibold text-white mb-3">
                📝 从文本导入
              </h3>
              <p class="text-sm text-gray-400 mb-4">
                粘贴导出的 JSON 内容进行导入
              </p>
              <TextArea
                value={importJson}
                onInput={(e) =>
                  setImportJson((e.target as HTMLTextAreaElement).value)
                }
                placeholder="在此粘贴 JSON 内容..."
                rows={6}
                class="w-full resize-none font-mono text-xs"
              />
              <div class="mt-3 flex justify-end">
                <Button
                  onClick={handleImportFromJson}
                  isLoading={isProcessing}
                  disabled={!importJson.trim()}
                  variant="primary"
                >
                  📥 导入
                </Button>
              </div>
            </Card>

            {/* 导入结果 */}
            {importResult && (
              <Card class="p-4 bg-green-900/20 border-green-500/30">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-xl">✅</span>
                  <h3 class="text-lg font-semibold text-green-300">
                    导入成功！
                  </h3>
                </div>
                <div class="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div class="text-2xl font-bold text-green-400">
                      {importResult.stats.scenes}
                    </div>
                    <div class="text-xs text-gray-400">场景</div>
                  </div>
                  <div>
                    <div class="text-2xl font-bold text-green-400">
                      {importResult.stats.characters}
                    </div>
                    <div class="text-xs text-gray-400">角色</div>
                  </div>
                  <div>
                    <div class="text-2xl font-bold text-green-400">
                      {importResult.stats.performances}
                    </div>
                    <div class="text-xs text-gray-400">演出记录</div>
                  </div>
                </div>
              </Card>
            )}

            {/* 错误信息 */}
            {error && (
              <div class="bg-red-900/30 border border-red-500 text-red-300 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
