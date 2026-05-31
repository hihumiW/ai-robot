import clsx from 'clsx';
import type { ButtonHTMLAttributes, FunctionalComponent } from 'vue';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'text' | 'unstyled';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md';
export type ButtonShape = 'rounded' | 'pill' | 'square';

export interface ButtonProps extends ButtonHTMLAttributes {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
}

const Button: FunctionalComponent<ButtonProps> = (props, { slots }) => {
  const {
    variant = 'unstyled', // 默认设为 'unstyled'，确保向下兼容原有手写 class 的按钮
    size,
    shape,
    type = 'button',
    disabled = false,
    class: customClass,
    ...restProps
  } = props;

  let combinedClass;

  if (variant === 'unstyled') {
    // 如果是 unstyled，直接继承外部传入的 class，不拼装任何默认样式
    combinedClass = clsx(customClass);
  } else {
    // 1. 基础样式
    const baseClass =
      'inline-flex items-center justify-center font-medium transition-all duration-150 outline-none select-none shrink-0 disabled:cursor-not-allowed disabled:opacity-50';

    // 2. 变体样式
    const variantClasses = {
      primary: 'bg-zinc-100 text-zinc-950 hover:bg-white active:bg-zinc-200 shadow-md shadow-zinc-950/10',
      secondary: 'bg-zinc-800 text-zinc-200 border border-zinc-700/50 hover:bg-zinc-700/80 hover:text-white active:bg-zinc-800/80',
      ghost: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-800/60',
      text: 'text-zinc-400 hover:text-zinc-100 active:text-white',
    };

    // 3. 尺寸样式
    const activeSize = size || 'md';
    const sizeClasses = {
      sm: 'px-3.5 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
      'icon-sm': 'h-6 w-6 p-0',
      'icon-md': 'h-8 w-8 p-0',
    };

    // 4. 形状样式
    const activeShape = shape || 'rounded';
    const shapeClasses = {
      rounded: activeSize.startsWith('icon') ? 'rounded-md' : 'rounded-lg',
      pill: 'rounded-full',
      square: 'rounded-none',
    };

    combinedClass = clsx(
      baseClass,
      variantClasses[variant],
      sizeClasses[activeSize],
      shapeClasses[activeShape],
      customClass
    );
  }

  return (
    <button
      {...restProps}
      type={type}
      disabled={disabled}
      class={combinedClass}
    >
      {slots.default?.()}
    </button>
  );
};

Button.displayName = 'Button';

export default Button;
