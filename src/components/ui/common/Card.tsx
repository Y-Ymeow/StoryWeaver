import { FunctionalComponent } from "preact";
import type { ComponentChildren } from "preact";

interface CardProps {
  children?: ComponentChildren;
  class?: string;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  // 结构化插槽
  header?: ComponentChildren;
  footer?: ComponentChildren;
  // 样式变体
  variant?: "default" | "bordered" | "elevated";
  // 内边距
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
};

const variantStyles = {
  default: "bg-dark-surface",
  bordered: "bg-dark-surface border border-dark-accent",
  elevated: "bg-dark-surface shadow-xl",
};

export const Card: FunctionalComponent<CardProps> = ({
  children,
  class: className = "",
  className: classNameAlt = "",
  onClick,
  hover = true,
  header,
  footer,
  variant = "default",
  padding = "md",
}) => {
  const hoverClass = hover && onClick ? "card-hover cursor-pointer" : "";
  const combinedClassName =
    `flex flex-col ${variantStyles[variant]} rounded-lg shadow-lg ${hoverClass} ${className} ${classNameAlt}`.trim();

  return (
    <div class={combinedClassName} onClick={onClick}>
      {header && (
        <div class="shrink-0 px-4 py-3 border-b border-dark-accent">
          {header}
        </div>
      )}
      <div class={`flex-1 ${header || footer ? "" : paddingStyles[padding]}`}>
        {children}
      </div>
      {footer && (
        <div class="shrink-0 px-4 py-3 border-t border-dark-accent">
          {footer}
        </div>
      )}
    </div>
  );
};

// 子组件
export const CardHeader: FunctionalComponent<{
  children?: ComponentChildren;
  class?: string;
}> = ({ children, class: className = "" }) => (
  <div class={`shrink-0 px-4 py-3 border-b border-dark-accent ${className}`}>
    {children}
  </div>
);

export const CardBody: FunctionalComponent<{
  children?: ComponentChildren;
  class?: string;
  scrollable?: boolean;
  maxHeight?: string;
}> = ({ children, class: className = "", scrollable = false, maxHeight }) => (
  <div
    class={`flex-1 p-4 ${scrollable ? "overflow-y-auto" : ""} ${className}`}
    style={maxHeight ? { maxHeight } : undefined}
  >
    {children}
  </div>
);

export const CardFooter: FunctionalComponent<{
  children?: ComponentChildren;
  class?: string;
}> = ({ children, class: className = "" }) => (
  <div
    class={`flex-none flex flex-row shrink-0 px-4 py-3 border-t border-dark-accent ${className}`}
  >
    {children}
  </div>
);

