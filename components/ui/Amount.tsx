import React from 'react';
import { motion } from 'framer-motion';

/**
 * ========================================
 * Amount 组件 - 专业金融数字显示
 * 支持涨跌色、动画、发光效果
 * ========================================
 */

interface AmountProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  showCurrency?: boolean;
  className?: string;
  animated?: boolean;
  glow?: boolean;
  strike?: boolean; // 删除线（用于撤销等场景）
}

const sizeClasses: Record<Exclude<AmountProps['size'], undefined>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
};

/**
 * 金额显示组件
 */
export const Amount: React.FC<AmountProps> = ({
  amount,
  size = 'lg',
  showSign = true,
  showCurrency = false,
  className = '',
  animated = false,
  glow = true,
  strike = false,
}) => {
  const isPositive = amount >= 0;
  const colorClass = isPositive ? 'text-win-crimson' : 'text-loss-emerald';
  const sign = showSign ? (isPositive ? '+' : '') : '';
  const currency = showCurrency ? '¥' : '';

  const baseClasses = [
    'font-mono-numeric',
    'font-bold',
    'tracking-tight',
    sizeClasses[size],
    colorClass,
    className,
  ];

  if (glow) {
    baseClasses.push(
      isPositive
        ? 'drop-shadow-[0_0_20px_rgba(220,20,60,0.4)]'
        : 'drop-shadow-[0_0_20px_rgba(0,200,83,0.4)]'
    );
  }

  if (strike) {
    baseClasses.push('line-through opacity-50');
  }

  const amountText = `${currency}${sign}${amount.toLocaleString()}`;

  if (animated) {
    return (
      <motion.span
        className={baseClasses.join(' ')}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
      >
        {amountText}
      </motion.span>
    );
  }

  return <span className={baseClasses.join(' ')}>{amountText}</span>;
};

/**
 * 格式化金额为带单位的显示
 */
export const formatAmount = (
  amount: number,
  options: {
    showSign?: boolean;
    showCurrency?: boolean;
    compact?: boolean; // 是否使用紧凑格式（如 1.2K）
  } = {}
): string => {
  const { showSign = true, showCurrency = false, compact = false } = options;

  let value = amount;

  // 紧凑格式
  if (compact) {
    const absValue = Math.abs(amount);
    if (absValue >= 10000) {
      value = amount / 10000;
      return `${showSign && amount > 0 ? '+' : ''}${value.toFixed(1)}万`;
    } else if (absValue >= 1000) {
      value = amount / 1000;
      return `${showSign && amount > 0 ? '+' : ''}${value.toFixed(1)}K`;
    }
  }

  const sign = showSign ? (amount >= 0 ? '+' : '') : '';
  const currency = showCurrency ? '¥' : '';

  return `${currency}${sign}${value.toLocaleString()}`;
};

/**
 * 数字滚动动画组件
 */
export const CountUpAmount: React.FC<
  AmountProps & {
    duration?: number; // 动画时长（ms）
  }
> = ({ amount, size = 'xl', showSign = true, showCurrency = true, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  const isPositive = amount >= 0;

  React.useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + duration;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      // 使用 easeOutQuart 缓动
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * amount));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(amount);
      }
    };

    animate();
  }, [amount, duration]);

  return (
    <Amount
      amount={displayValue}
      size={size}
      showSign={showSign}
      showCurrency={showCurrency}
      animated={false}
      glow
    />
  );
};

export default Amount;
