/**
 * 房间信息编辑器组件
 * 用于编辑房间的基本信息（名称、设定、大纲等）
 */

import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Modal, Input, TextArea } from "@components/ui/common";
import type { Room } from "@/stores";

interface RoomInfoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    setting: string;
    plot_summary: string;
    worldview: string;
    tone: string;
  }) => void;
  room: Room;
  isLoading?: boolean;
}

export const RoomInfoEditor: FunctionalComponent<RoomInfoEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  room,
  isLoading = false,
}) => {
  const [name, setName] = useState("");
  const [setting, setSetting] = useState("");
  const [plotSummary, setPlotSummary] = useState("");
  const [worldview, setWorldview] = useState("");
  const [tone, setTone] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(room.name);
      setSetting(room.setting);
      setPlotSummary(room.plot_summary || "");
      setWorldview(room.worldview || "");
      setTone(room.tone || "");
    }
  }, [isOpen, room]);

  const handleSubmit = () => {
    if (!name.trim()) {
      alert("请输入房间名称");
      return;
    }

    onSave({
      name,
      setting,
      plot_summary: plotSummary,
      worldview,
      tone,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✏️ 编辑房间信息"
      size="lg"
      footer={
        <div class="flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!name.trim()}
          >
            保存
          </Button>
        </div>
      }
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            房间名称 *
          </label>
          <Input
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="输入房间名称"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            设定
          </label>
          <TextArea
            value={setting}
            onInput={(e) => setSetting((e.target as HTMLTextAreaElement).value)}
            placeholder="描述故事的基本设定..."
            rows={3}
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            剧情大纲
          </label>
          <TextArea
            value={plotSummary}
            onInput={(e) =>
              setPlotSummary((e.target as HTMLTextAreaElement).value)
            }
            placeholder="描述主要剧情发展..."
            rows={3}
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            世界观
          </label>
          <TextArea
            value={worldview}
            onInput={(e) =>
              setWorldview((e.target as HTMLTextAreaElement).value)
            }
            placeholder="描述故事发生的世界背景..."
            rows={2}
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            基调
          </label>
          <Input
            value={tone}
            onInput={(e) => setTone((e.target as HTMLInputElement).value)}
            placeholder="如：轻松、悬疑、悲伤"
          />
        </div>
      </div>
    </Modal>
  );
};
