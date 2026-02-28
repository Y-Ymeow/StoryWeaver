import { FunctionalComponent } from 'preact'
import type { TextAreaProps } from '@/types/common'

export const TextArea: FunctionalComponent<TextAreaProps> = ({
  label,
  error,
  helperText,
  rows = 4,
  class: className = '',
  id,
  ...props
}) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div class="w-full">
      {label && (
        <label htmlFor={textareaId} class="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        class={`w-full px-4 py-2 bg-dark-accent border ${error ? 'border-red-500' : 'border-transparent'} rounded-lg text-white placeholder-gray-500 input-focus resize-none ${className}`}
        {...props}
      />
      {error && (
        <p class="mt-1 text-sm text-red-500">{error}</p>
      )}
      {helperText && !error && (
        <p class="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}
