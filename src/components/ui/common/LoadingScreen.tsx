import { FunctionalComponent } from 'preact'
import type { LoadingScreenProps } from '@/types/common'

export const LoadingScreen: FunctionalComponent<LoadingScreenProps> = ({ message = '加载中...' }) => {
  return (
    <div class="min-h-screen bg-dark-bg flex items-center justify-center">
      <div class="text-center">
        <div class="loading-dots mb-4">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p class="text-gray-400 animate-pulse">{message}</p>
      </div>
    </div>
  )
}
