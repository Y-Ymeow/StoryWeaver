import { FunctionalComponent } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { Button, Modal } from '@components/ui/common'
import { 
  isFileSystemAccessSupported, 
  isOPFSSupported,
  getStoredFileHandle, 
  storeFileHandle, 
  selectDatabaseFile, 
  createDatabaseFile, 
  clearStoredFileHandle,
  loadFromOPFS,
  saveToOPFS,
  clearOPFS,
  getOPFSFileHandle,
  readOPFSFileData,
} from '@/db/file-system'
import type { DatabaseSelectorProps } from '@/types/common'

export const DatabaseSelector: FunctionalComponent<DatabaseSelectorProps> = ({
  onDatabaseSelected,
  skipSelection
}) => {
  const [isModalOpen, setIsModalOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasStoredHandle, setHasStoredHandle] = useState(false)
  const [hasOPFSData, setHasOPFSData] = useState(false)

  useEffect(() => {
    // 检查 File System Access API 句柄
    getStoredFileHandle().then((handle: FileSystemFileHandle | null) => {
      setHasStoredHandle(!!handle)
    })
    
    // 检查 OPFS 数据
    if (isOPFSSupported()) {
      getOPFSFileHandle().then(async (handle) => {
        if (handle) {
          const data = await handle.getFile();
          setHasOPFSData(data.size > 0);
        }
      });
    }
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

  const handleUseOPFS = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const opfsHandle = await getOPFSFileHandle()
      if (opfsHandle) {
        const file = await opfsHandle.getFile();
        const isNew = file.size === 0;
        
        // 标记为 OPFS 句柄
        (opfsHandle as any).__isOPFS = true;
        
        // 如果是新数据库，先初始化（写入空数据库）
        if (isNew) {
          const initSqlJs = (await import('sql.js')).default;
          const wasmPath = new URL('sql.js/dist/sql-wasm.wasm', import.meta.url).href;
          const SQL = await initSqlJs({ locateFile: () => wasmPath });
          const db = new SQL.Database();
          const data = db.export();
          await saveToOPFS(data);
          db.close();
          onDatabaseSelected(opfsHandle, true)
        } else {
          onDatabaseSelected(opfsHandle, false)
        }
        
        setIsModalOpen(false)
      } else {
        setError('无法获取 OPFS 文件句柄')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OPFS 初始化失败')
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
      await clearOPFS()
      localStorage.clear()
      alert('数据已清除，正在刷新页面...')
      location.reload()
    }
  }

  if (!isFileSystemAccessSupported()) {
    return (
      <div class="fixed inset-0 bg-dark-bg flex items-center justify-center p-4">
        <div class="bg-dark-surface p-8 rounded-lg shadow-xl max-w-md w-full">
          <h2 class="text-xl font-bold text-white mb-4">📱 移动端模式</h2>
          <p class="text-gray-300 mb-6">
            当前浏览器不支持 File System Access API。
          </p>

          <div class="space-y-3">
            {isOPFSSupported() && (
              <Button
                onClick={handleUseOPFS}
                isLoading={isLoading}
                class="w-full"
                variant="primary"
              >
                📂 使用 OPFS 存储（推荐）
                {hasOPFSData && <span class="ml-2 text-xs text-green-400">已有数据</span>}
              </Button>
            )}

            <Button
              onClick={handleSkip}
              variant="secondary"
              class="w-full"
            >
              使用内存模式（数据不会保存）
            </Button>

            {isOPFSSupported() && (
              <p class="text-xs text-gray-500 text-center mt-2">
                💡 OPFS 数据会持久保存，无需每次选择文件。
              </p>
            )}
          </div>
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
            请选择数据库存储方式：
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

        <div class="space-y-3">
          <div class="text-sm text-gray-400 font-semibold mb-2">💾 本地文件存储（推荐）</div>
          
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

          {isOPFSSupported() && (
            <>
              <div class="flex items-center gap-2 my-4">
                <div class="flex-1 h-px bg-dark-accent"></div>
                <span class="text-gray-500 text-sm">或</span>
                <div class="flex-1 h-px bg-dark-accent"></div>
              </div>

              <div class="text-sm text-gray-400 font-semibold mb-2">📱 移动端/便捷模式</div>
              
              <Button
                onClick={handleUseOPFS}
                isLoading={isLoading}
                variant="primary"
                class="w-full"
              >
                📂 使用 OPFS 存储
                {hasOPFSData && <span class="ml-2 text-xs text-green-400">已有数据</span>}
              </Button>
            </>
          )}

          <div class="flex items-center gap-2 my-4">
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

        <div class="bg-dark-accent/30 rounded-lg p-3 mt-4">
          <div class="text-xs text-gray-400 space-y-1">
            <p>💡 <strong>本地文件</strong>：数据保存在你选择的文件中，最安全可靠</p>
            {isOPFSSupported() && (
              <p>📱 <strong>OPFS</strong>：数据保存在浏览器私有存储，移动端可用，但可能被清除</p>
            )}
            <p>⚠️ <strong>内存模式</strong>：临时测试用，刷新页面后数据丢失</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
