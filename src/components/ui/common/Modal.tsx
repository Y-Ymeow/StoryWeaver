import { FunctionalComponent } from 'preact'
import { useEffect } from 'preact/hooks'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children?: any
  /** 自定义头部内容，传入后会覆盖默认的 title */
  header?: any
  /** 自定义底部内容 */
  footer?: any
  /** 是否显示关闭按钮 */
  showClose?: boolean
  /** 内容区域是否可滚动 */
  scrollable?: boolean
  /** 内容区域最大高度 */
  maxHeight?: string
}

export const Modal: FunctionalComponent<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  header,
  footer,
  showClose = true,
  scrollable = true,
  maxHeight = '70vh'
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl'
  }

  const hasHeader = header || title

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* 模态框内容 */}
      <div
        class={`relative bg-dark-surface rounded-lg shadow-2xl w-full ${sizeStyles[size]} flex flex-col animate-slide-up`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* 头部 */}
        {hasHeader && (
          <div class="flex items-center justify-between p-4 border-b border-dark-accent flex-shrink-0">
            {header ? (
              header
            ) : (
              <h2 id="modal-title" class="text-xl font-semibold text-white">
                {title}
              </h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                class="text-gray-400 hover:text-white transition-colors p-1 ml-auto"
                aria-label="关闭"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* 内容区域 */}
        <div 
          class={`p-4 flex-1 ${scrollable ? 'overflow-y-auto' : ''}`}
          style={scrollable ? { maxHeight } : {}}
        >
          {children}
        </div>

        {/* 底部 */}
        {footer && (
          <div class="p-4 border-t border-dark-accent flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}