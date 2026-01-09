import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * ========================================
 * Button 组件 - 金色奢华风格按钮
 * 支持多种变体和尺寸
 * ========================================
 */

export type ButtonVariant =
  | 'primary'      // 金色主按钮
  | 'secondary'    // 次要按钮
  | 'ghost'        // 幽灵按钮
  | 'win'          // 盈利按钮（红）
  | 'loss'         // 亏损按钮（绿）
  | 'danger';      // 危险操作

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-base',
  lg: 'px-8 py-3 text-lg',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-gold-gradient
    text-dark-bg-primary
    font-semibold
    shadow-gold-glow-sm
    hover:shadow-gold-glow
    hover:scale-105
    active:scale-95
  `,
  secondary: `
    bg-white/10
    border border-luxury-gold-500/30
    text-luxury-gold-500
    hover:bg-white/20
    hover:border-luxury-gold-500/50
  `,
  ghost: `
    bg-transparent
    text-text-secondary
    hover:bg-white/5
    hover:text-text-primary
  `,
  win: `
    bg-win-crimson
    text-white
    font-semibold
    shadow-win-glow
    hover:scale-105
    active:scale-95
  `,
  loss: `
    bg-loss-emerald
    text-white
    font-semibold
    hover:scale-105
    active:scale-95
  `,
  danger: `
    bg-rose-600
    text-white
    font-semibold
    hover:bg-rose-700
  `,
};

/**
 * Button 组件
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'gap-2',
    'rounded-full',
    'transition-all',
    'duration-300',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-luxury-gold-500/50',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:hover:scale-100',
    sizeClasses[size],
    variantClasses[variant],
  ];

  if (fullWidth) {
    baseClasses.push('w-full');
  }

  const buttonClassName = [...baseClasses, className].join(' ');

  return (
    <motion.button
      className={buttonClassName}
      disabled={disabled || loading}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </motion.button>
  );
};

/**
 * Pill 按钮（胶囊形，用于筛选器等）
 */
export const PillButton: React.FC<
  Omit<ButtonProps, 'variant'> & {
    active?: boolean;
  }
> = ({
  children,
  size = 'sm',
  active = false,
  className = '',
  ...props
}) => {
  const baseClasses = [
    'whitespace-nowrap',
    'rounded-full',
    'font-medium',
    'transition-all',
    'duration-200',
    size === 'sm' ? 'px-4 py-1.5 text-xs' : 'px-5 py-2 text-sm',
  ];

  if (active) {
    baseClasses.push(
      'bg-dark-bg-primary',
      'text-white',
      'shadow-md',
      'scale-105'
    );
  } else {
    baseClasses.push(
      'bg-white/10',
      'text-text-secondary',
      'border',
      'border-white/10',
      'hover:bg-white/20'
    );
  }

  return (
    <motion.button
      className={[...baseClasses, className].join(' ')}
      whileHover={{ scale: active ? 1.05 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
};

/**
 * 浮动操作按钮（FAB）
 */
export const FloatingActionButton: React.FC<
  Omit<ButtonProps, 'variant' | 'size'> & {
    position?: 'bottom-right' | 'bottom-left';
  }
> = ({
  children,
  position = 'bottom-right',
  className = '',
  ...props
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  return (
    <motion.button
      className={[
        'fixed',
        'z-50',
        'w-14',
        'h-14',
        'rounded-full',
        'bg-gold-gradient',
        'text-dark-bg-primary',
        'shadow-gold-glow',
        'flex',
        'items-center',
        'justify-center',
        'hover:scale-110',
        'active:scale-95',
        'transition-transform',
        'duration-200',
        positionClasses[position],
        className,
      ].join(' ')}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
