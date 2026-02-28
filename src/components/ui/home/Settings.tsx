import { FunctionalComponent } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { Button, Card, Modal } from '@components/ui/common'
import { getStoredFileHandle, clearStoredFileHandle, selectDatabaseFile, storeFileHandle } from '@/db/file-system'
import { setFileHandle, saveDBToFile, isMemoryMode } from '@/db/core'
import { AIModelSettings } from './AIModelSettings'
import { createClient } from '@/lib/openai/client'
import type { ProviderConfig } from '@stores/types'

interface SettingsProps {
  onClose: () => void
}

// 模拟的 Provider 管理（实际应该从 store 获取）
const STORAGE_KEY = 'ai-providers'

function loadProviders(): ProviderConfig[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveProviders(providers: ProviderConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(providers))
}

export const Settings: FunctionalComponent<SettingsProps> = ({ onClose }) => {
  const [hasStoredHandle, setHasStoredHandle] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isMemory, setIsMemory] = useState(false)
  const [showAIModelSettings, setShowAIModelSettings] = useState(false)
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null)

  const checkStoredHandle = async () => {
    const handle = await getStoredFileHandle()
    setHasStoredHandle(!!handle)
    setIsMemory(isMemoryMode())
  }

  const loadProvidersFromStorage = () => {
    const loaded = loadProviders()
    setProviders(loaded)
    const active = loaded.find(p => p.is_active)
    if (active) {
      setActiveProviderId(active.id)
    }
  }

  useEffect(() => {
    checkStoredHandle()
    loadProvidersFromStorage()
  }, [])

  const handleSelectNewFile = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const fileHandle = await selectDatabaseFile()
      if (fileHandle) {
        await storeFileHandle(fileHandle)
        setFileHandle(fileHandle)
        setHasStoredHandle(true)
        setMessage({ type: 'success', text: '数据库文件已连接' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '选择文件失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearHandle = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      await clearStoredFileHandle()
      setHasStoredHandle(false)
      setMessage({ type: 'success', text: '已清除数据库连接，刷新页面后生效' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '清除失败' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNow = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      await saveDBToFile()
      setMessage({ type: 'success', text: '数据库已保存' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '保存失败' })
    } finally {
      setIsLoading(false)
    }
  }

  // Provider 管理函数
  const handleAddProvider = (config: Omit<ProviderConfig, 'id'>) => {
    const newProvider: ProviderConfig = {
      ...config,
      id: crypto.randomUUID()
    }
    const updated = [...providers, newProvider]
    saveProviders(updated)
    setProviders(updated)
    if (newProvider.is_active) {
      setActiveProviderId(newProvider.id)
    }
  }

  const handleUpdateProvider = (id: string, updates: Partial<ProviderConfig>) => {
    const updated = providers.map(p => 
      p.id === id ? { ...p, ...updates } : p
    )
    saveProviders(updated)
    setProviders(updated)
  }

  const handleDeleteProvider = (id: string) => {
    const updated = providers.filter(p => p.id !== id)
    saveProviders(updated)
    setProviders(updated)
    if (activeProviderId === id) {
      setActiveProviderId(null)
    }
  }

  const handleSetActive = (id: string) => {
    const updated = providers.map(p => ({
      ...p,
      is_active: p.id === id
    }))
    saveProviders(updated)
    setProviders(updated)
    setActiveProviderId(id)
  }

  const handleFetchModels = async (providerId: string): Promise<string[]> => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider) throw new Error('Provider 不存在')
    
    const client = createClient(provider)
    const models = await client.listModels()
    return models.map(m => m.id)
  }

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title="设置"
        size="lg"
      >
        <div class="space-y-4 max-h-[70vh] overflow-y-auto">
          {message && (
            <div class={`p-3 rounded-lg text-sm ${
              message.type === 'success' 
                ? 'bg-green-900/30 border border-green-500 text-green-300' 
                : 'bg-red-900/30 border border-red-500 text-red-300'
            }`}>
              {message.text}
            </div>
          )}

          <Card hover={false}>
            <h3 class="text-lg font-semibold text-white mb-2">📁 数据库设置</h3>
            <div class="text-gray-300 space-y-2">
              <p>
                连接状态：
                {hasStoredHandle ? (
                  <span class="text-green-400">✅ 已连接数据库文件</span>
                ) : isMemory ? (
                  <span class="text-yellow-400">⚠️ 内存模式（数据不会保存）</span>
                ) : (
                  <span class="text-red-400">❌ 未连接数据库文件</span>
                )}
              </p>
              
              <div class="flex flex-wrap gap-2 mt-4">
                <Button
                  onClick={handleSelectNewFile}
                  isLoading={isLoading}
                >
                  📁 选择数据库文件
                </Button>
                
                {hasStoredHandle && (
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
            </div>
          </Card>

          <Card hover={false}>
            <h3 class="text-lg font-semibold text-white mb-2">🤖 AI 模型设置</h3>
            <div class="text-gray-300 space-y-2">
              <p class="text-sm">
                已添加 {providers.length} 个 Provider
                {activeProviderId && (
                  <span class="text-green-400 ml-2">
                    (当前使用：{providers.find(p => p.id === activeProviderId)?.name})
                  </span>
                )}
              </p>
              <Button
                onClick={() => setShowAIModelSettings(true)}
                variant="secondary"
                class="w-full sm:w-auto"
              >
                ⚙️ 管理 AI 模型
              </Button>
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
                  if (confirm('确定要清除所有数据吗？这将删除数据库连接和所有缓存，应用将恢复到初始状态。')) {
                    await clearStoredFileHandle()
                    localStorage.clear()
                    if ('caches' in window) {
                      const names = await caches.keys()
                      await Promise.all(names.map(n => caches.delete(n)))
                    }
                    alert('数据已清除，正在刷新页面...')
                    location.reload()
                  }
                }}
                variant="danger"
                class="w-full sm:w-auto"
              >
                🗑️ 清除所有应用数据
              </Button>
            </div>
          </Card>

          <Card hover={false}>
            <h3 class="text-lg font-semibold text-white mb-2">ℹ️ 关于</h3>
            <div class="text-gray-300 text-sm space-y-1">
              <p>AI 剧本房 v0.0.1</p>
              <p>使用 Preact + Vite + TailwindCSS 构建</p>
              <p class="text-gray-500 mt-2">
                数据存储在本地，不会上传到服务器
              </p>
            </div>
          </Card>
        </div>
      </Modal>

      {showAIModelSettings && (
        <AIModelSettings
          onClose={() => setShowAIModelSettings(false)}
          providers={providers}
          activeProviderId={activeProviderId}
          onAddProvider={handleAddProvider}
          onUpdateProvider={handleUpdateProvider}
          onDeleteProvider={handleDeleteProvider}
          onSetActive={handleSetActive}
          onFetchModels={handleFetchModels}
        />
      )}
    </>
  )
}
