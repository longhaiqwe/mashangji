import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export type ParticleType = 'win' | 'loss';

interface ParticleEffectProps {
  type: ParticleType;
  isVisible: boolean;
  onComplete?: () => void;
}

/**
 * 粒子特效组件
 * - win: 红色金色爆发粒子（盈利庆祝）
 * - loss: 绿色雨滴粒子（亏损安慰）
 */
export const ParticleEffect: React.FC<ParticleEffectProps> = ({
  type,
  isVisible,
  onComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!isVisible) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置 canvas 尺寸
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 创建粒子
    particlesRef.current = createParticles(type, canvas.width, canvas.height);

    // 动画循环
    let frameCount = 0;
    const maxFrames = type === 'win' ? 180 : 120; // win 3秒，loss 2秒

    const animate = () => {
      frameCount++;

      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 更新和绘制粒子
      particlesRef.current = particlesRef.current.filter(p => {
        updateParticle(p, type);
        drawParticle(ctx, p);
        return p.life > 0;
      });

      // 继续动画或结束
      if (frameCount < maxFrames && particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, type, onComplete]);

  if (!isVisible) return null;

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  );
};

// ==================== 粒子类型定义 ====================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // 0-1
  decay: number;
  rotation?: number;
  rotationSpeed?: number;
}

// ==================== 粒子创建 ====================

function createParticles(type: ParticleType, width: number, height: number): Particle[] {
  if (type === 'win') {
    return createWinParticles(width, height);
  } else {
    return createLossParticles(width, height);
  }
}

// 盈利粒子：红色金色爆发效果
function createWinParticles(width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  const centerX = width / 2;
  const centerY = height / 2;

  // 爆发点（多个源头）
  const burstPoints = [
    { x: centerX, y: centerY },
    { x: centerX - 100, y: centerY - 50 },
    { x: centerX + 100, y: centerY - 50 },
  ];

  // 创建 150 个粒子
  for (let i = 0; i < 150; i++) {
    const point = burstPoints[Math.floor(Math.random() * burstPoints.length)];

    // 随机角度和速度
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;

    particles.push({
      x: point.x + (Math.random() - 0.5) * 50,
      y: point.y + (Math.random() - 0.5) * 50,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2, // 初始向上速度
      size: 3 + Math.random() * 6,
      color: Math.random() > 0.5 ? '#DC143C' : '#FFD700', // 猩红或金色
      life: 1,
      decay: 0.008 + Math.random() * 0.012,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
    });
  }

  // 添加一些金色星星粒子
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;

    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 8 + Math.random() * 12,
      color: '#FFD700',
      life: 1,
      decay: 0.01 + Math.random() * 0.02,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
    });
  }

  return particles;
}

// 亏损粒子：绿色雨滴效果
function createLossParticles(width: number, height: number): Particle[] {
  const particles: Particle[] = [];

  // 创建 80 个雨滴粒子
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * width,
      y: -20 - Math.random() * height, // 从顶部上方开始
      vx: 0,
      vy: 3 + Math.random() * 4, // 向下掉落
      size: 2 + Math.random() * 3,
      color: `rgba(0, 200, 83, ${0.3 + Math.random() * 0.4})`, // 绿色半透明
      life: 1,
      decay: 0.008 + Math.random() * 0.01,
    });
  }

  return particles;
}

// ==================== 粒子更新 ====================

function updateParticle(particle: Particle, type: ParticleType) {
  if (type === 'win') {
    // 盈利粒子：重力、摩擦力
    particle.vy += 0.15; // 重力
    particle.vx *= 0.99; // 摩擦力
    particle.vy *= 0.99;

    particle.x += particle.vx;
    particle.y += particle.vy;

    if (particle.rotation !== undefined && particle.rotationSpeed !== undefined) {
      particle.rotation += particle.rotationSpeed;
    }
  } else {
    // 亏损粒子：匀速下落
    particle.y += particle.vy;
    particle.x += Math.sin(particle.y * 0.02) * 0.5; // 轻微摇摆
  }

  particle.life -= particle.decay;
}

// ==================== 粒子绘制 ====================

function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
  ctx.save();
  ctx.globalAlpha = particle.life;

  if (particle.rotation !== undefined) {
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.translate(-particle.x, -particle.y);
  }

  // 绘制圆形粒子
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fill();

  // 添加发光效果（仅盈利粒子）
  if (particle.color === '#FFD700' || particle.color === '#DC143C') {
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 10;
    ctx.fill();
  }

  ctx.restore();
}

// ==================== Hook ====================

/**
 * 粒子特效 Hook
 * 用于在组件中触发粒子效果
 */
export const useParticleEffect = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [type, setType] = React.useState<ParticleType>('win');

  const trigger = (effectType: ParticleType, duration?: number) => {
    setType(effectType);
    setIsVisible(true);

    // 自动隐藏
    const autoDuration = duration || (effectType === 'win' ? 3000 : 2000);
    setTimeout(() => {
      setIsVisible(false);
    }, autoDuration);
  };

  const hide = () => setIsVisible(false);

  return {
    isVisible,
    type,
    trigger,
    hide,
    Component: ({ onComplete }: { onComplete?: () => void }) => (
      <ParticleEffect
        type={type}
        isVisible={isVisible}
        onComplete={() => {
          hide();
          onComplete?.();
        }}
      />
    ),
  };
};
