import { FunctionalComponent } from 'preact'
import type { InputProps } from '@/types/common'

export const Input: FunctionalComponent<InputProps> = ({
  label,
  error,
  helperText,
  class: className = '',
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div class="w-full">
      {label && (
        <label htmlFor={inputId} class="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        class={`w-full px-4 py-2 bg-dark-accent border ${error ? 'border-red-500' : 'border-transparent'} rounded-lg text-white placeholder-gray-500 input-focus ${className}`}
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
