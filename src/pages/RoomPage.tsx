import { FunctionalComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { LoadingScreen } from "@components/ui/common/LoadingScreen";
import { RoomDetailPage } from "@/pages/RoomDetailPage";
import { useRoomActions } from "@/stores";
import { getRoomById } from "@/db";
import type { Room } from "@/stores";

interface RoomPageProps {
  id?: string;
  path?: string;
}

// Hash 路由导航函数
function navigateTo(path: string) {
  window.location.hash = path;
}

export const RoomPage: FunctionalComponent<RoomPageProps> = ({ id }) => {
  const { setCurrentRoom } = useRoomActions();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigateTo("/");
      return;
    }

    loadRoom();
  }, [id]);

  const loadRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const loadedRoom = await getRoomById(id!);
      if (!loadedRoom) {
        setError("房间不存在");
        return;
      }
      setRoom(loadedRoom);
      setCurrentRoom(loadedRoom);
    } catch (err) {
      console.error("加载房间失败:", err);
      setError("加载房间失败");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentRoom(null);
    navigateTo("/");
  };

  if (loading) {
    return <LoadingScreen message="加载房间..." />;
  }

  if (error || !room) {
    return (
      <div class="min-h-screen bg-dark-bg flex items-center justify-center">
        <div class="bg-dark-surface p-8 rounded-lg shadow-xl max-w-md text-center">
          <h1 class="text-2xl text-red-400 mb-4">错误</h1>
          <p class="text-gray-300 mb-4">{error || "房间不存在"}</p>
          <button
            onClick={() => navigateTo("/")}
            class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return <RoomDetailPage room={room} onBack={handleBack} />;
};

