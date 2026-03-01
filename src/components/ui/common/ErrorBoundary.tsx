import { Component, type ComponentChildren } from 'preact'
import type { ErrorBoundaryProps, ErrorBoundaryState } from '@/types/common'
import { logError } from '@/lib/error-logger'

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    logError(
      `组件错误：${error.message}`,
      { error, errorInfo },
      'ErrorBoundary'
    )
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div class="min-h-screen bg-dark-bg flex items-center justify-center p-4">
          <div class="bg-dark-surface p-8 rounded-lg shadow-xl max-w-md w-full">
            <h1 class="text-2xl text-dark-highlight mb-4">出错了</h1>
            <p class="text-gray-300 mb-4">
              {this.state.error?.message || '发生未知错误，请刷新页面重试'}
            </p>
            <button
              onClick={() => window.location.reload()}
              class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors btn-active"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
