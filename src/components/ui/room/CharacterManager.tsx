import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Button, Modal, Input, TextArea, Card } from "@components/ui/common";
import { createCharacter, updateCharacter, getCharactersByRoomId } from "@/db";
import type { Character, Room } from "@/stores";
import { AIInputConfig } from "@components/ui/common";
import { loadProviders } from "@/lib/openai/providers";

interface CharacterManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onManaged: () => void;
  roomId: string;
  roomContext: Room;
}

export const CharacterManager: FunctionalComponent<CharacterManagerProps> = ({
  isOpen,
  onClose,
  onManaged,
  roomId,
  roomContext,
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [isAIInputOpen, setIsAIInputOpen] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [viewingMemory, setViewingMemory] = useState<Character | null>(null);
  const [memoryInput, setMemoryInput] = useState("");
  const [isUpdatingMemory, setIsUpdatingMemory] = useState(false);

  // 表单状态
  const [name, setName] = useState("");
  const [background, setBackground] = useState("");
  const [dialogueStyle, setDialogueStyle] = useState("");
  const [isUser, setIsUser] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCharacters();
      loadProvidersData();
    }
  }, [isOpen, roomId]);

  const loadCharacters = async () => {
    const loaded = await getCharactersByRoomId(roomId);
    setCharacters(loaded);
  };

  const loadProvidersData = async () => {
    const loadedProviders = await loadProviders();
    setProviders(loadedProviders);
    const active = loadedProviders.find((p: any) => p.is_active);
    if (active) {
      setActiveProviderId(active.id);
    }
  };

  const resetForm = () => {
    setName("");
    setBackground("");
    setDialogueStyle("");
    setIsUser(false);
    setEditingChar(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleEdit = (char: Character) => {
    setEditingChar(char);
    setName(char.name);
    setBackground(char.background);
    setDialogueStyle(char.dialogue_style);
    setIsUser(char.is_user);
    setIsAdding(false);
  };

  const handleDelete = async (charId: string) => {
    if (!confirm("确定要删除这个角色吗？")) return;

    // TODO: 实现删除功能
    await loadCharacters();
  };

  const handleViewMemory = async (char: Character) => {
    setViewingMemory(char);
    setMemoryInput(char.memory || "");
  };

  const handleUpdateMemory = async () => {
    if (!viewingMemory) return;

    setIsUpdatingMemory(true);
    try {
      await updateCharacter(viewingMemory.id, {
        memory: memoryInput,
      });
      await loadCharacters();
      setViewingMemory(null);
      onManaged();
    } catch (error) {
      console.error("更新记忆失败:", error);
      alert("更新记忆失败，请重试");
    } finally {
      setIsUpdatingMemory(false);
    }
  };

  const handleGenerateMemory = async () => {
    if (!viewingMemory) return;

    setIsUpdatingMemory(true);
    try {
      // TODO: 获取角色的演出记录并生成记忆
      // 这里可以调用 generateCharacterMemory 函数
      const newMemory = `这是${viewingMemory.name}的记忆内容。`;
      setMemoryInput(newMemory);
    } catch (error) {
      console.error("生成记忆失败:", error);
    } finally {
      setIsUpdatingMemory(false);
    }
  };

  const handleAIResult = async (result: { content: string }) => {
    try {
      const jsonStr = result.content.replace(/```(?:json)?/g, "").trim();
      const data = JSON.parse(jsonStr);

      if (data.characters && Array.isArray(data.characters)) {
        // 批量添加角色
        for (const charData of data.characters) {
          await createCharacter({
            room_id: roomId,
            name: charData.name,
            background: charData.background || "",
            dialogue_style: charData.dialogue_style || "",
            memory: null,
            is_user: charData.is_user || false,
            type: charData.is_user ? "user" : "ai",
            order: characters.length,
          });
        }
        await loadCharacters();
        onManaged();
      }
    } catch (error) {
      console.error("解析 AI 结果失败:", error);
    }
    setIsAIInputOpen(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("请输入角色名称");
      return;
    }

    try {
      if (editingChar) {
        await updateCharacter(editingChar.id, {
          name,
          background,
          dialogue_style: dialogueStyle,
          is_user: isUser,
          type: isUser ? "user" : "ai",
        });
      } else {
        await createCharacter({
          room_id: roomId,
          name,
          background,
          dialogue_style: dialogueStyle,
          memory: null,
          is_user: isUser,
          type: isUser ? "user" : "ai",
          order: characters.length,
        });
      }
      await loadCharacters();
      onManaged();
      resetForm();
      setIsAdding(false);
    } catch (error) {
      console.error("保存角色失败:", error);
      alert("保存失败，请重试");
    }
  };

  const cancelAdd = () => {
    resetForm();
    setIsAdding(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          resetForm();
          setIsAdding(false);
        }}
        header={
          <div class="flex max-md:flex-col max-md:gap-3 justify-between md:items-center w-full">
            <h3 class="text-lg font-semibold text-white">
              👥 角色管理 ({characters.length})
            </h3>
            <div class="flex gap-2">
              <Button
                onClick={() => setIsAIInputOpen(true)}
                variant="secondary"
                size="sm"
              >
                🤖 AI 生成
              </Button>
              <Button onClick={handleAdd} size="sm">
                + 添加角色
              </Button>
            </div>
          </div>
        }
        footer={
          isAdding || editingChar ? (
            <div class="flex justify-end gap-3 pt-4 border-t border-dark-accent">
              <Button onClick={cancelAdd} variant="secondary">
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={!name.trim()}>
                {editingChar ? "保存修改" : "添加角色"}
              </Button>
            </div>
          ) : null
        }
        title=""
        size="xl"
      >
        <div class="space-y-4">
          {/* 角色列表 */}
          {!isAdding && !editingChar && (
            <>
              {characters.length === 0 ? (
                <div class="text-center py-8 text-gray-400">
                  <p>暂无角色</p>
                  <Button onClick={handleAdd} class="mt-4">
                    创建第一个角色
                  </Button>
                </div>
              ) : (
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {characters.map((char) => (
                    <Card key={char.id}>
                      <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center gap-2">
                          <div class="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center text-xl">
                            {char.is_user ? "👤" : "🤖"}
                          </div>
                          <div>
                            <h4 class="font-semibold text-white">
                              {char.name}
                            </h4>
                            <span class="text-xs text-gray-400">
                              {char.is_user ? "用户角色" : "AI 角色"}
                            </span>
                          </div>
                        </div>
                        <div class="flex gap-1">
                          <Button
                            onClick={() => handleEdit(char)}
                            variant="ghost"
                            size="sm"
                          >
                            ✏️
                          </Button>
                          <Button
                            onClick={() => handleViewMemory(char)}
                            variant="ghost"
                            size="sm"
                          >
                            🧠
                          </Button>
                          <Button
                            onClick={() => handleDelete(char.id)}
                            variant="ghost"
                            size="sm"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                      <p class="text-sm text-gray-400 line-clamp-2 mb-2">
                        {char.background}
                      </p>
                      <div class="text-xs text-gray-500">
                        台词风格：{char.dialogue_style || "普通"}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 添加/编辑表单 */}
          {(isAdding || editingChar) && (
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-white">
                {editingChar ? "编辑角色" : "添加新角色"}
              </h3>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  角色名称 *
                </label>
                <Input
                  value={name}
                  onInput={(e) => setName((e.target as HTMLInputElement).value)}
                  placeholder="如：张三"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  角色类型
                </label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="charType"
                      checked={isUser}
                      onChange={() => setIsUser(true)}
                      class="w-4 h-4"
                    />
                    <span class="text-gray-300">👤 用户角色</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="charType"
                      checked={!isUser}
                      onChange={() => setIsUser(false)}
                      class="w-4 h-4"
                    />
                    <span class="text-gray-300">🤖 AI 角色</span>
                  </label>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  角色背景
                </label>
                <TextArea
                  value={background}
                  onInput={(e) =>
                    setBackground((e.target as HTMLTextAreaElement).value)
                  }
                  placeholder="描述角色的背景故事、性格特点等..."
                  rows={3}
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  台词风格
                </label>
                <Input
                  value={dialogueStyle}
                  onInput={(e) =>
                    setDialogueStyle((e.target as HTMLInputElement).value)
                  }
                  placeholder="如：古风、现代、幽默、严肃"
                />
              </div>
            </div>
          )}
        </div>
      </Modal>

      <AIInputConfig
        isOpen={isAIInputOpen}
        onClose={() => setIsAIInputOpen(false)}
        onGenerate={handleAIResult}
        providers={providers}
        activeProviderId={activeProviderId}
        mode="character"
        roomContext={roomContext}
        characters={characters.map((c) => ({
          name: c.name,
          background: c.background,
          dialogue_style: c.dialogue_style,
        }))}
        presetPrompt={`为剧本"${roomContext.name}"生成 1-3 个角色。故事背景：${roomContext.setting}`}
      />

      {/* 记忆查看/编辑模态框 */}
      <Modal
        isOpen={!!viewingMemory}
        onClose={() => setViewingMemory(null)}
        title={`🧠 ${viewingMemory?.name}的记忆`}
        size="lg"
        footer={
          <div class="flex justify-end gap-3">
            <Button
              onClick={handleGenerateMemory}
              variant="secondary"
              isLoading={isUpdatingMemory}
            >
              ✨ AI 生成
            </Button>
            <Button onClick={() => setViewingMemory(null)} variant="secondary">
              取消
            </Button>
            <Button onClick={handleUpdateMemory} isLoading={isUpdatingMemory}>
              保存记忆
            </Button>
          </div>
        }
      >
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              记忆内容
            </label>
            <TextArea
              value={memoryInput}
              onInput={(e) =>
                setMemoryInput((e.target as HTMLTextAreaElement).value)
              }
              placeholder="输入或编辑角色记忆..."
              rows={8}
            />
          </div>

          <div class="bg-dark-accent/30 p-3 rounded-lg">
            <p class="text-xs text-gray-400">
              💡 提示：记忆会帮助 AI
              角色记住之前的剧情发展和对话内容，保持角色的一致性。
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};
