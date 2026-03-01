import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Card, Modal } from "@components/ui/common";
import { useRoomActions } from "@/stores";
import { createRoom, getAllRooms, createCharacter, createScene } from "@/db";
import type { Room } from "@/stores";
import { Settings } from "@/components/ui/home/Settings";
import {
  CreateRoomWizard,
  type CreateRoomData,
} from "@/components/ui/home/CreateRoomWizard";
import {
  isFileSystemAccessSupported,
  isOPFSSupported,
  getOPFSFileHandle,
  getStoredFileHandle,
  clearOPFS,
} from "@/db/file-system";
import { isOPFSMode } from "@/db/core";

// Hash 路由导航函数
function navigateTo(path: string) {
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  window.location.hash = normalizedPath;
}

// 从 localStorage 加载 Provider
const STORAGE_KEY = "ai-providers";
function loadProviders() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export const HomePage: FunctionalComponent = () => {
  const { setCurrentRoom, setRooms } = useRoomActions();
  const [rooms, setRoomsLocal] = useState<Room[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);

  // 数据库状态
  const [showDbStatus, setShowDbStatus] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [dbType, setDbType] = useState<"file" | "opfs" | "memory" | null>(null);

  // 加载 Provider
  useEffect(() => {
    const loaded = loadProviders();
    setProviders(loaded);
    const active = loaded.find((p: any) => p.is_active);
    if (active) {
      setActiveProviderId(active.id);
    }
  }, []);

  // 初始化加载房间数据 + 检测数据库状态
  useEffect(() => {
    loadRooms();
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    const fileHandle = await getStoredFileHandle();
    if (fileHandle) {
      setDbConnected(true);
      setDbType("file");
      return;
    }

    if (isOPFSMode()) {
      setDbConnected(true);
      setDbType("opfs");
      return;
    }

    setDbConnected(false);
    setDbType(null);
  };

  const handleRefresh = async () => {
    await checkDatabaseStatus();
    loadRooms();
  };

  const handleClearOPFS = async () => {
    if (!confirm("确定要清除 OPFS 数据库吗？此操作不可恢复！")) {
      return;
    }
    try {
      await clearOPFS();
      setDbConnected(false);
      setDbType(null);
      alert("OPFS 数据库已清除，请刷新页面。");
    } catch (err) {
      alert("清除失败：" + (err instanceof Error ? err.message : "未知错误"));
    }
  };

  const loadRooms = async () => {
    try {
      const loadedRooms = await getAllRooms();
      setRoomsLocal(loadedRooms);
      setRooms(loadedRooms);
    } catch (error) {
      console.error("加载房间失败:", error);
    }
  };

  // 创建新房间（包含角色和场景）
  const handleCreateRoom = async (data: CreateRoomData) => {
    setIsCreating(true);
    try {
      // 1. 创建房间
      const room = await createRoom({
        name: data.room.name,
        setting: data.room.setting,
        plot_summary: data.room.plot_summary || "",
        worldview: data.room.worldview || "",
        tone: data.room.tone || "",
        current_performance_summary: "",
      });

      // 2. 创建角色
      for (let i = 0; i < data.characters.length; i++) {
        const char = data.characters[i];
        await createCharacter({
          room_id: room.id,
          name: char.name,
          background: char.background || "",
          dialogue_style: char.dialogue_style || "",
          memory: null,
          is_user: char.is_user,
          type: char.type,
          order: i,
        });
      }

      // 3. 创建场景
      for (let i = 0; i < data.scenes.length; i++) {
        const scene = data.scenes[i];
        await createScene({
          room_id: room.id,
          name: scene.name,
          description: scene.description || "",
          goal: scene.goal || "",
          setup: scene.setup || "",
          summary: "",
          max_rounds: scene.max_rounds || 10,
          order: i,
        });
      }

      // 4. 导航到房间详情页
      setCurrentRoom(room);
      setIsCreateModalOpen(false);
      loadRooms();
      navigateTo(`/room/${room.id}`);
    } catch (error) {
      console.error("创建房间失败:", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  // 选择房间（进入详情页）
  const handleSelectRoom = (room: Room) => {
    setCurrentRoom(room);
    navigateTo(`/room/${room.id}`);
  };

  return (
    <div class="min-h-screen bg-dark-bg">
      {/* 头部 */}
      <header class="bg-dark-surface border-b border-dark-accent">
        <div class="container-responsive py-4">
          <div class="flex items-center justify-between py-4">
            <h1 class="text-2xl font-bold gradient-text">AI 剧本房</h1>
            <div class="flex max-md:grid max-md:grid-cols-2 gap-2 items-center">
              {/* 数据库状态指示器 */}
              <div class="flex items-center gap-1 text-xs px-2 py-1 rounded bg-dark-accent/30">
                <span
                  class={`w-2 h-2 rounded-full ${
                    dbConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                ></span>
                <span class="text-gray-400">
                  {dbConnected
                    ? dbType === "opfs"
                      ? "OPFS"
                      : "文件"
                    : "未连接"}
                </span>
              </div>

              <Button
                onClick={() => setShowSettings(true)}
                variant="ghost"
                size="sm"
              >
                ⚙️ 设置
              </Button>
              <Button onClick={handleRefresh} variant="secondary" size="sm">
                🔄 刷新
              </Button>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                创建新房间
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main class="container-responsive py-8">
        {rooms.length === 0 ? (
          <div class="text-center py-16">
            <div class="text-gray-400 mb-4">
              <svg
                class="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p class="text-lg">暂无房间</p>
              <p class="text-sm mt-2">创建你的第一个剧本房间开始创作吧！</p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              创建第一个房间
            </Button>
          </div>
        ) : (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
            {rooms.map((room) => (
              <Card
                key={room.id}
                onClick={() => handleSelectRoom(room)}
                class="card-hover"
              >
                <h3 class="text-lg font-semibold text-white mb-2">
                  {room.name}
                </h3>
                <p class="text-gray-400 text-sm mb-2 line-clamp-2">
                  {room.setting}
                </p>
                <div class="flex flex-col text-xs text-gray-500">
                  <span>世界观：{room.worldview || "未设置"}</span>
                  <span>
                    {new Date(room.updated_at || Date.now()).toLocaleDateString(
                      "zh-CN",
                    )}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 创建房间向导 */}
      <CreateRoomWizard
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRoom}
        isLoading={isCreating}
        providers={providers}
        activeProviderId={activeProviderId}
      />

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
};
