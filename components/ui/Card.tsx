import React from 'react';
import { motion } from 'framer-motion';

/**
 * ========================================
 * Card 组件 - 金融终端风格卡片
 * 支持多种变体和交互效果
 * ========================================
 */

export type CardVariant =
  | 'default'      // 默认深色卡片
  | 'gold'         // 金色财富卡片
  | 'win'          // 盈利卡片（红）
  | 'loss'         // 亏损卡片（绿）
  | 'glass'        // 玻璃态卡片
  | 'light';       // 浅色卡片

export type CardSize = 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  className?: string;
  hover?: boolean;
  shimmer?: boolean;
  gradientBorder?: boolean;
  onClick?: () => void;
  delay?: number; // 动画延迟（ms）
}

const sizeClasses: Record<CardSize, string> = {
  sm: 'p-4 rounded-2xl',
  md: 'p-6 rounded-3xl',
  lg: 'p-8 rounded-[2.5rem]',
};

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-dark-bg-secondary border border-dark-border/20',
  gold: 'bg-gradient-to-br from-luxury-gold-500/20 to-luxury-gold-600/10 border border-luxury-gold-500/30',
  win: 'bg-win-gradient border border-win-crimson/30',
  loss: 'bg-loss-gradient border border-loss-emerald/30',
  glass: 'glass border border-white/10',
  light: 'bg-light-bg-secondary border border-light-border',
};

/**
 * Card 组件
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  hover = true,
  shimmer = false,
  gradientBorder = false,
  onClick,
  delay = 0,
}) => {
  // 基础样式
  const baseClasses = [
    sizeClasses[size],
    variantClasses[variant],
    'relative overflow-hidden transition-all duration-300',
  ];

  // 悬停效果
  if (hover) {
    baseClasses.push(
      'card-3d',
      'shadow-card-3d',
      'hover:shadow-card-3d-hover'
    );
  } else {
    baseClasses.push('shadow-card-3d');
  }

  // 渐变边框
  if (gradientBorder) {
    baseClasses.push('gradient-border');
  }

  // 可点击
  if (onClick) {
    baseClasses.push('cursor-pointer active:scale-[0.98]');
  }

  // 微光效果
  if (shimmer) {
    baseClasses.push('shimmer-sweep');
  }

  const cardClassName = [...baseClasses, className].filter(Boolean).join(' ');

  return (
    <motion.div
      className={cardClassName}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: delay / 1000,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      whileHover={hover ? { y: -4 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {/* 内发光效果 */}
      <div className="absolute inset-0 shadow-inner-glow rounded-inherit pointer-events-none" />

      {/* 内容 */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

/**
 * 特殊变体：金色财富卡片
 */
export const WealthCard: React.FC<
  Omit<CardProps, 'variant'> & {
    amount: number;
    subtitle?: string;
    trend?: number; // 涨跌幅百分比
  }
> = ({ amount, subtitle, trend, ...props }) => {
  const isPositive = amount >= 0;
  const isTrendUp = trend && trend > 0;

  return (
    <Card variant="gold" size="lg" {...props}>
      <div className="text-center">
        {/* 副标题 */}
        {subtitle && (
          <p className="text-sm text-luxury-gold-500/70 mb-2 tracking-wider uppercase">
            {subtitle}
          </p>
        )}

        {/* 金额 */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-3xl font-mono-numeric font-bold text-gold-shimmer">
            ¥
          </span>
          <span
            className={`text-6xl font-mono-numeric font-black ${
              isPositive ? 'text-win-crimson' : 'text-loss-emerald'
            }`}
            style={{
              textShadow: isPositive
                ? '0 0 30px rgba(220, 20, 60, 0.5)'
                : '0 0 30px rgba(0, 200, 83, 0.5)',
            }}
          >
            {isPositive ? '+' : ''}
            {amount.toLocaleString()}
          </span>
        </div>

        {/* 涨跌幅 */}
        {trend !== undefined && (
          <div
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
              isTrendUp
                ? 'bg-win-crimson/20 text-win-crimson'
                : 'bg-loss-emerald/20 text-loss-emerald'
            }`}
          >
            <span>{isTrendUp ? '↑' : '↓'}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </Card>
  );
};

/**
 * 特殊变体：数据统计卡片
 */
export const StatCard: React.FC<
  {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: number;
  } & Omit<CardProps, 'variant' | 'children'>
> = ({ label, value, icon, trend, ...props }) => {
  const isTrendUp = trend && trend > 0;

  return (
    <Card variant="default" size="md" {...props}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* 标签 */}
          <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
            {label}
          </p>

          {/* 数值 */}
          <p className="text-2xl font-bold text-text-primary font-mono-numeric">
            {value}
          </p>

          {/* 涨跌幅 */}
          {trend !== undefined && (
            <div
              className={`inline-flex items-center gap-1 mt-2 text-xs font-bold ${
                isTrendUp ? 'text-win-crimson' : 'text-loss-emerald'
              }`}
            >
              <span>{isTrendUp ? '↑' : '↓'}</span>
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        {/* 图标 */}
        {icon && (
          <div className="p-2 rounded-xl bg-white/5 text-luxury-gold-500">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default Card;
