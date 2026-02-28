import { FunctionalComponent } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { Button, Modal } from '@components/ui/common'
import { isFileSystemAccessSupported, getStoredFileHandle, storeFileHandle, selectDatabaseFile, createDatabaseFile, clearStoredFileHandle } from '@/db/file-system'
import type { DatabaseSelectorProps } from '@/types/common'

export const DatabaseSelector: FunctionalComponent<DatabaseSelectorProps> = ({ 
  onDatabaseSelected,
  skipSelection 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasStoredHandle, setHasStoredHandle] = useState(false)

  useEffect(() => {
    getStoredFileHandle().then((handle: FileSystemFileHandle | null) => {
      setHasStoredHandle(!!handle)
    })
  }, [])

  const handleSelectFile = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const fileHandle = await selectDatabaseFile()
      if (fileHandle) {
        await storeFileHandle(fileHandle)
        onDatabaseSelected(fileHandle, false)
        setIsModalOpen(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '选择文件失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateFile = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const fileHandle = await createDatabaseFile()
      if (fileHandle) {
        await storeFileHandle(fileHandle)
        onDatabaseSelected(fileHandle, true)
        setIsModalOpen(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建文件失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    setIsModalOpen(false)
    skipSelection?.()
  }

  const handleClearOldData = async () => {
    if (confirm('确定要清除所有旧数据吗？这将删除数据库连接和缓存。')) {
      await clearStoredFileHandle()
      localStorage.clear()
      alert('数据已清除，正在刷新页面...')
      location.reload()
    }
  }

  if (!isFileSystemAccessSupported()) {
    return (
      <div class="fixed inset-0 bg-dark-bg flex items-center justify-center p-4">
        <div class="bg-dark-surface p-8 rounded-lg shadow-xl max-w-md w-full">
          <h2 class="text-xl font-bold text-white mb-4">浏览器不支持</h2>
          <p class="text-gray-300 mb-6">
            当前浏览器不支持 File System Access API，请使用 Chrome、Edge 或其他支持的浏览器。
          </p>
          <Button onClick={handleSkip} variant="secondary">
            继续使用内存模式
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={() => {}}
      title="选择数据库文件"
      size="lg"
    >
      <div class="space-y-4">
        <div class="text-gray-300">
          <p class="mb-4">
            请选择一个 SQLite 数据库文件，或创建一个新的数据库文件。
          </p>
          {hasStoredHandle && (
            <div class="bg-yellow-900/30 border border-yellow-500 text-yellow-300 p-3 rounded-lg text-sm mb-4">
              ⚠️ 检测到之前保存的文件句柄，但无法自动加载。可能是文件被移动或权限被撤销。
              <div class="mt-2 flex gap-2">
                <Button onClick={handleClearOldData} variant="danger" size="sm">
                  清除旧数据
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div class="bg-red-900/30 border border-red-500 text-red-300 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div class="flex flex-col gap-3">
          <Button 
            onClick={handleSelectFile} 
            isLoading={isLoading}
            class="w-full"
          >
            📁 选择现有数据库文件
          </Button>
          
          <Button 
            onClick={handleCreateFile} 
            isLoading={isLoading}
            variant="secondary"
            class="w-full"
          >
            📄 创建新数据库文件
          </Button>
          
          <div class="flex items-center gap-2 my-2">
            <div class="flex-1 h-px bg-dark-accent"></div>
            <span class="text-gray-500 text-sm">或</span>
            <div class="flex-1 h-px bg-dark-accent"></div>
          </div>
          
          <Button 
            onClick={handleSkip} 
            variant="ghost"
            class="w-full"
          >
            使用内存模式（数据不会保存）
          </Button>
        </div>
      </div>
    </Modal>
  )
}
