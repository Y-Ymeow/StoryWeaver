import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Card, CardBody } from "@components/ui/common";
import {
  useRoomActions,
  useSceneActions,
  useCharacterActions,
  useUIActions,
} from "@/stores";
import type { Room, Scene, Character } from "@/stores";
import {
  getScenesByRoomId,
  getCharactersByRoomId,
  deleteScene,
  deleteRoom,
  updateRoom,
} from "@/db";
import { ScenePerformanceModal } from "@/components/ui/scene/ScenePerformanceModal";
import { CharacterManager } from "@/components/ui/room/CharacterManager";
import { SceneEditor } from "@/components/ui/scene/SceneEditor";
import { PerformanceHistory } from "@/components/ui/room/PerformanceHistory";
import { RoomSummaryGenerator } from "@/components/ui/room/RoomSummaryGenerator";
import { RoomExportImport } from "@/components/ui/room/RoomExportImport";
import { RoomInfoEditor } from "@/components/ui/room/RoomInfoEditor";

interface RoomDetailPageProps {
  room: Room;
  onBack: () => void;
}

export const RoomDetailPage: FunctionalComponent<RoomDetailPageProps> = ({
  room,
  onBack,
}) => {
  const { setCurrentRoom } = useRoomActions();
  const { setScenes, setCurrentScene } = useSceneActions();
  const { setCharacters } = useCharacterActions();
  const { setLoading } = useUIActions();

  const [scenes, setScenesLocal] = useState<Scene[]>([]);
  const [characters, setCharactersLocal] = useState<Character[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [activeTab, setActiveTab] = useState<"scenes" | "settings">("scenes");
  const [isSceneEditorOpen, setIsSceneEditorOpen] = useState(false);
  const [isCharacterManagerOpen, setIsCharacterManagerOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [performanceScene, setPerformanceScene] = useState<Scene | null>(null);
  const [showSummaryGenerator, setShowSummaryGenerator] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 加载房间数据
  useEffect(() => {
    loadRoomData();
  }, [room.id]);

  const loadRoomData = async () => {
    setLoading(true);
    try {
      const [loadedScenes, loadedCharacters] = await Promise.all([
        getScenesByRoomId(room.id),
        getCharactersByRoomId(room.id),
      ]);
      setScenesLocal(loadedScenes);
      setCharactersLocal(loadedCharacters);
      setScenes(loadedScenes);
      setCharacters(loadedCharacters);
    } catch (error) {
      console.error("加载房间数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScene = (scene: Scene) => {
    setSelectedScene(scene);
    setCurrentScene(scene);
  };

  const handleCreateScene = () => {
    setEditingScene(null);
    setIsSceneEditorOpen(true);
  };

  const handleEditScene = (scene: Scene) => {
    setEditingScene(scene);
    setIsSceneEditorOpen(true);
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!confirm("确定要删除这个场景吗？相关的演出记录也会被删除。")) return;

    try {
      await deleteScene(sceneId);
      setScenesLocal(scenes.filter((s) => s.id !== sceneId));
      setScenes(scenes.filter((s) => s.id !== sceneId));
      if (selectedScene?.id === sceneId) {
        setSelectedScene(null);
        setCurrentScene(null);
      }
    } catch (error) {
      console.error("删除场景失败:", error);
    }
  };

  const handleSceneSaved = () => {
    loadRoomData();
    setIsSceneEditorOpen(false);
  };

  const handleCharacterManaged = () => {
    loadRoomData();
    setIsCharacterManagerOpen(false);
  };

  const handleSummaryGenerated = () => {
    loadRoomData();
  };

  const handleImported = () => {
    loadRoomData();
  };

  const handleUpdateRoom = (data: {
    name: string;
    setting: string;
    plot_summary: string;
    worldview: string;
    tone: string;
  }) => {
    setIsDeleting(true);
    try {
      updateRoom(room.id, {
        name: data.name,
        setting: data.setting,
        plot_summary: data.plot_summary || "",
        worldview: data.worldview || "",
        tone: data.tone || "",
      }).then(() => {
        setIsEditing(false);
        loadRoomData();
        alert("房间信息已更新");
      });
    } catch (error) {
      console.error("更新房间失败:", error);
      alert("更新房间失败");
      setIsDeleting(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!confirm("确定要删除这个房间吗？所有数据将被删除，此操作不可恢复！"))
      return;

    setIsDeleting(true);
    try {
      await deleteRoom(room.id);
      onBack();
    } catch (error) {
      console.error("删除房间失败:", error);
      alert("删除房间失败");
      setIsDeleting(false);
    }
  };

  return (
    <div class="min-h-screen bg-dark-bg">
      {/* 头部 */}
      <header class="bg-dark-surface border-b border-dark-accent">
        <div class="container-responsive py-4">
          <div class="flex max-md:flex-col md:items-center justify-between py-4 flex-wrap">
            <div class="flex items-center gap-4">
              <Button onClick={onBack} variant="ghost" size="sm">
                ← 返回
              </Button>
              <div>
                <h1 class="text-2xl font-bold gradient-text">{room.name}</h1>
                <p class="text-sm text-gray-400">
                  {scenes.length} 场景 · {characters.length} 角色
                </p>
              </div>
            </div>
            <div class="flex max-md:grid max-md:grid-cols-2 gap-2 max-md:pt-4">
              <Button
                onClick={() => setShowExportImport(true)}
                variant="secondary"
                size="sm"
              >
                📦 导出/导入
              </Button>
              <Button
                onClick={() => setShowHistory(true)}
                variant="secondary"
                size="sm"
              >
                📜 历史
              </Button>
              <Button
                onClick={() => setIsCharacterManagerOpen(true)}
                variant="secondary"
                size="sm"
              >
                👥 角色 ({characters.length})
              </Button>
              <Button onClick={handleCreateScene}>+ 添加场景</Button>
            </div>
          </div>

          {/* 标签页 */}
          <div class="flex gap-4 mt-4 border-b border-dark-accent">
            <button
              onClick={() => setActiveTab("scenes")}
              class={`py-2 px-4 transition-colors ${
                activeTab === "scenes"
                  ? "text-primary-400 border-b-2 border-primary-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              场景 ({scenes.length})
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              class={`py-2 px-4 transition-colors ${
                activeTab === "settings"
                  ? "text-primary-400 border-b-2 border-primary-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              设置
            </button>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main class="container-responsive py-8">
        {activeTab === "scenes" && (
          <div class="py-8">
            {/* 场景列表 */}
            <div class="space-y-4">
              <h2 class="text-lg font-semibold text-white mb-4">场景列表</h2>
              {scenes.length === 0 ? (
                <div class="text-center py-8 text-gray-400">
                  <p>暂无场景</p>
                  <Button onClick={handleCreateScene} class="mt-4">
                    创建第一个场景
                  </Button>
                </div>
              ) : (
                <div class="space-y-2 grid grid-cols-3 max-md:grid-cols-1 gap-5">
                  {scenes.map((scene) => (
                    <Card
                      key={scene.id}
                      class="card-hover cursor-pointer h-full"
                      header={
                        <div
                          class="flex-1 flex flex-row justify-between cursor-pointer"
                          onClick={() => {
                            setPerformanceScene(scene);
                            setShowPerformanceModal(true);
                          }}
                        >
                          <h3 class="text-base font-semibold text-white">
                            {scene.name}
                          </h3>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditScene(scene);
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            ✏️
                          </Button>
                        </div>
                      }
                      footer={
                        <div class="flex flex-row justify-between items-center gap-1">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPerformanceScene(scene);
                              setShowPerformanceModal(true);
                            }}
                            variant="primary"
                            size="sm"
                          >
                            🎬 演出
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScene(scene.id);
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            🗑️
                          </Button>
                        </div>
                      }
                    >
                      <CardBody>
                        <p class="text-sm text-gray-400 line-clamp-2">
                          {scene.description}
                        </p>
                        {scene.summary && (
                          <p class="text-xs text-gray-500 mt-1 line-clamp-1">
                            📝 {scene.summary}
                          </p>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div class="max-w-2xl mx-auto space-y-6 py-8">
            <Card class="p-6">
              <h2 class="text-xl font-semibold text-white mb-4">房间信息</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    名称
                  </label>
                  <div class="text-white">{room.name}</div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    设定
                  </label>
                  <div class="text-white">{room.setting}</div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    剧情大纲
                  </label>
                  <div class="text-white text-sm">
                    {room.plot_summary || "未设置"}
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    世界观
                  </label>
                  <div class="text-white text-sm">
                    {room.worldview || "未设置"}
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    基调
                  </label>
                  <div class="text-white text-sm">{room.tone || "未设置"}</div>
                </div>
                {room.current_performance_summary && (
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">
                      📊 当前摘要
                    </label>
                    <div class="text-white text-sm bg-dark-accent/30 rounded-lg p-3">
                      {room.current_performance_summary}
                    </div>
                  </div>
                )}
              </div>
              <div class="mt-4 flex max-md:flex-col gap-3">
                <Button
                  onClick={() => setShowSummaryGenerator(true)}
                  variant="primary"
                >
                  📊 生成/更新房间摘要
                </Button>
                <Button onClick={() => setIsEditing(true)} variant="secondary">
                  ✏️ 编辑房间
                </Button>
              </div>
            </Card>

            <Card class="p-6">
              <h2 class="text-xl font-semibold text-white mb-4">⚠️ 危险操作</h2>
              <div class="text-sm text-gray-400 mb-4">
                删除房间将同时删除所有相关的场景、角色和演出记录，此操作不可恢复。
              </div>
              <Button
                variant="danger"
                onClick={handleDeleteRoom}
                isLoading={isDeleting}
              >
                🗑️ 删除房间
              </Button>
            </Card>
          </div>
        )}
      </main>

      {/* 场景编辑器模态框 */}
      <SceneEditor
        isOpen={isSceneEditorOpen}
        onClose={() => setIsSceneEditorOpen(false)}
        onSaved={handleSceneSaved}
        roomId={room.id}
        editingScene={editingScene}
        roomContext={room}
        characters={characters}
        existingScenes={scenes.filter((s) => s.id !== editingScene?.id)}
      />

      {/* 角色管理器模态框 */}
      <CharacterManager
        isOpen={isCharacterManagerOpen}
        onClose={() => setIsCharacterManagerOpen(false)}
        onManaged={handleCharacterManaged}
        roomId={room.id}
        roomContext={room}
      />

      {/* 演出历史模态框 */}
      <PerformanceHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        room={room}
      />

      {/* 演出模态框 */}
      {performanceScene && (
        <ScenePerformanceModal
          isOpen={showPerformanceModal}
          onClose={() => {
            setShowPerformanceModal(false);
            setPerformanceScene(null);
          }}
          scene={performanceScene}
          room={room}
          characters={characters}
          onPerformancesChange={loadRoomData}
        />
      )}

      {/* 房间摘要生成器 */}
      <RoomSummaryGenerator
        isOpen={showSummaryGenerator}
        onClose={() => setShowSummaryGenerator(false)}
        room={room}
        onSummaryGenerated={handleSummaryGenerated}
      />

      {/* 导出/导入管理 */}
      <RoomExportImport
        isOpen={showExportImport}
        onClose={() => setShowExportImport(false)}
        room={room}
        onImported={handleImported}
      />

      {/* 编辑房间信息 */}
      <RoomInfoEditor
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={handleUpdateRoom}
        room={room}
        isLoading={isDeleting}
      />
    </div>
  );
};

