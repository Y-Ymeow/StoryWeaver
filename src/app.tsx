import { useState, useEffect, useCallback } from 'preact/hooks'
import { Provider as StoreProvider } from '@stores'
import { initDB, type InitDBOptions } from '@db'
import { HomePage, RoomPage } from '@components/pages'
import { LoadingScreen } from '@components/ui/common/LoadingScreen'
import { ErrorBoundary } from '@components/ui/common/ErrorBoundary'
import { DatabaseSelector } from '@components/ui/common/DatabaseSelector'

// Hash Router 组件 - 手动解析路由
function HashRouter() {
  // 从 hash 获取当前路径
  const getUrlFromHash = useCallback(() => {
    const hash = window.location.hash.slice(1) || '/'
    return hash.startsWith('/') ? hash : '/' + hash
  }, [])

  const [url, setUrl] = useState(getUrlFromHash)

  useEffect(() => {
    const handleHashChange = () => {
      const newUrl = getUrlFromHash()
      console.log('Hash changed to:', newUrl)
      setUrl(newUrl)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [getUrlFromHash])

  // 解析路由参数
  const parseRoute = (url: string) => {
    // 匹配 /room/:id
    const roomMatch = url.match(/^\/room\/([^/]+)$/)
    if (roomMatch) {
      return { component: 'room', id: roomMatch[1] }
    }
    // 默认首页
    return { component: 'home', id: null }
  }

  const route = parseRoute(url)

  if (route.component === 'room') {
    return <RoomPage key={`room-${route.id}`} id={route.id!} />
  }

  return <HomePage key="home" />
}

export function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDbSelector, setShowDbSelector] = useState(false)
  const [dbOptions, setDbOptions] = useState<InitDBOptions | null>(null)

  useEffect(() => {
    checkStoredHandle()
  }, [])

  useEffect(() => {
    if (dbOptions) {
      initDB(dbOptions)
        .then(() => {
          setIsLoading(false)
        })
        .catch((err: Error) => {
          console.error('数据库初始化失败:', err)
          setError('数据库初始化失败，请刷新页面重试')
          setIsLoading(false)
        })
    }
  }, [dbOptions])

  async function checkStoredHandle() {
    const { getStoredFileHandle } = await import('@db/file-system')
    const handle = await getStoredFileHandle()

    if (handle) {
      setDbOptions({ fileHandle: handle })
    } else {
      setShowDbSelector(true)
      setIsLoading(false)
    }
  }

  function handleDatabaseSelected(fileHandle: FileSystemFileHandle, isNew: boolean) {
    setDbOptions({ fileHandle, isNew })
    setShowDbSelector(false)
    setIsLoading(true)
  }

  function handleSkipSelection() {
    setDbOptions({ useMemory: true })
    setShowDbSelector(false)
    setIsLoading(true)
  }

  if (error) {
    return (
      <div class="min-h-screen bg-dark-bg flex items-center justify-center">
        <div class="bg-dark-surface p-8 rounded-lg shadow-xl max-w-md">
          <h1 class="text-2xl text-dark-highlight mb-4">错误</h1>
          <p class="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            刷新页面
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingScreen message="正在初始化数据库..." />
  }

  return (
    <ErrorBoundary>
      {showDbSelector && (
        <DatabaseSelector
          onDatabaseSelected={handleDatabaseSelected}
          skipSelection={handleSkipSelection}
        />
      )}
      <StoreProvider>
        <HashRouter />
      </StoreProvider>
    </ErrorBoundary>
  )
}