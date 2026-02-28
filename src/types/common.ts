import type { ComponentChildren, JSX } from "preact";

/**
 * Button 组件 Props
 */
export interface ButtonProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "disabled" | "class"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  type?: "button" | "submit" | "reset";
  class?: string;
  disabled?: boolean;
  children: ComponentChildren;
}

/**
 * Card 组件 Props
 */
export interface CardProps {
  children?: ComponentChildren;
  class?: string;
  onClick?: () => void;
  hover?: boolean;
  /** 自定义头部内容 */
  header?: ComponentChildren;
  /** 自定义底部内容 */
  footer?: ComponentChildren;
  /** 样式变体 */
  variant?: "default" | "bordered" | "elevated";
  /** 内边距 */
  padding?: "none" | "sm" | "md" | "lg";
}

/**
 * Input 组件 Props
 */
export interface InputProps
  extends Omit<JSX.HTMLAttributes<HTMLInputElement>, "value" | "type" | "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  type?: string;
  inputSize?: "sm" | "md" | "lg";
  onInput?: (e: JSX.TargetedInputEvent<HTMLInputElement>) => void;
}

/**
 * TextArea 组件 Props
 */
export interface TextAreaProps
  extends Omit<JSX.HTMLAttributes<HTMLTextAreaElement>, "value" | "rows"> {
  label?: string;
  error?: string;
  helperText?: string;
  rows?: number;
  name?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onInput?: (e: JSX.TargetedInputEvent<HTMLTextAreaElement>) => void;
}

/**
 * Modal 组件 Props
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: ComponentChildren;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** 自定义头部内容 */
  header?: ComponentChildren;
  /** 自定义底部内容 */
  footer?: ComponentChildren;
  /** 是否显示关闭按钮 */
  showClose?: boolean;
  /** 内容区域是否可滚动 */
  scrollable?: boolean;
  /** 内容区域最大高度 */
  maxHeight?: string;
}

/**
 * LoadingScreen 组件 Props
 */
export interface LoadingScreenProps {
  message?: string;
}

/**
 * ErrorBoundary Props
 */
export interface ErrorBoundaryProps {
  children: ComponentChildren;
  fallback?: ComponentChildren;
}

/**
 * ErrorBoundary State
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ModelButton 组件 Props
 */
export interface ModelButtonProps {
  providers: import("@stores").ProviderConfig[];
  selectedProviderId: string | null;
  selectedModel: string;
  isThinkingModel: boolean;
  enableThinking: boolean;
  thinkingBudget: number;
  onConfirm: (config: {
    providerId: string;
    model: string;
    isThinkingModel: boolean;
    enableThinking: boolean;
    thinkingBudget: number;
  }) => void;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
  showFullName?: boolean;
}

/**
 * ModelSelector 组件 Props
 */
export interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: {
    providerId: string;
    model: string;
    isThinkingModel: boolean;
    enableThinking: boolean;
    thinkingBudget: number;
  }) => void;
  providers: import("@stores").ProviderConfig[];
  initialProviderId?: string | null;
  initialModel?: string;
}

/**
 * AIInputConfig 组件 Props
 */
export interface AIInputConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * DatabaseSelector 组件 Props
 */
export interface DatabaseSelectorProps {
  onDatabaseSelected: (fileHandle: FileSystemFileHandle, isNew: boolean) => void;
  skipSelection?: () => void;
}
