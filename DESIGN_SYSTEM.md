# 🎨 马上记 - 新设计系统文档

## ✨ 设计理念

**「金融交易终端 × 东方奢华」** - 融合专业金融感与东方美学，打造独特的财富管理体验

### 核心特点

- **红涨绿跌**：符合中国股市习惯的配色方案
- **奢华金**：使用金色作为主视觉元素，营造财富感
- **专业数据**：等宽数字字体，精确的数据展示
- **流畅动效**：金色闪光、3D 卡片、粒子特效

---

## 📦 已完成的工作

### 1. 设计系统基础 ✅

#### Tailwind 配置扩展 (`tailwind.config.js`)
- ✅ 自定义颜色：猩红（盈利）、翠绿（亏损）、奢华金
- ✅ 自定义字体：Noto Serif SC、JetBrains Mono、Inter
- ✅ 自定义动画：reveal-up、gold-shimmer、win-particles
- ✅ 自定义阴影：gold-glow、win-glow、card-3d
- ✅ 自定义渐变：gold-gradient、win-gradient、loss-gradient

#### CSS 主题文件 (`styles/theme.css`)
- ✅ CSS 变量定义
- ✅ 全局基础样式
- ✅ 工具类扩展（text-gold-shimmer、glass、card-3d 等）
- ✅ 关键帧动画

#### Google Fonts 引入 (`index.html`)
- ✅ Noto Serif SC（标题）
- ✅ Noto Sans SC（副标题）
- ✅ JetBrains Mono（数字）
- ✅ Inter（正文）

### 2. 核心 UI 组件 ✅

#### Card 组件 (`components/ui/Card.tsx`)
```tsx
import { Card, WealthCard, StatCard } from './components/ui/Card';

// 基础卡片
<Card variant="gold" size="lg" hover shimmer>
  内容
</Card>

// 财富卡片
<WealthCard
  amount={12580}
  subtitle="本月累计盈亏"
  trend={23}
/>

// 数据统计卡片
<StatCard
  label="场次"
  value="42"
  icon={<Wallet />}
/>
```

**变体**：
- `default` - 默认深色卡片
- `gold` - 金色财富卡片
- `win` - 盈利卡片（红）
- `loss` - 亏损卡片（绿）
- `glass` - 玻璃态卡片
- `light` - 浅色卡片

#### Amount 组件 (`components/ui/Amount.tsx`)
```tsx
import { Amount, formatAmount, CountUpAmount } from './components/ui/Amount';

// 基础金额显示
<Amount amount={12580} size="xl" showSign showCurrency />

// 格式化工具
formatAmount(12580, { showSign: true, compact: true }); // "+1.3万"

// 数字滚动动画
<CountUpAmount amount={12580} duration={1000} />
```

#### Button 组件 (`components/ui/Button.tsx`)
```tsx
import { Button, PillButton, FloatingActionButton } from './components/ui/Button';

// 主按钮
<Button variant="primary" size="lg" loading>
  保存
</Button>

// Pill 按钮（筛选器）
<PillButton active>全部</PillButton>

// 浮动操作按钮
<FloatingActionButton position="bottom-right">
  <Plus />
</FloatingActionButton>
```

**变体**：
- `primary` - 金色主按钮
- `secondary` - 次要按钮
- `ghost` - 幽灵按钮
- `win` - 盈利按钮（红）
- `loss` - 亏损按钮（绿）
- `danger` - 危险操作

### 3. 页面重构 ✅

#### Dashboard 页面
- ✅ 金色财富卡片（带涨跌幅显示）
- ✅ Pill 形圈子筛选器
- ✅ 3D 悬浮效果战绩列表
- ✅ 空状态优化
- ✅ 流畅的加载动画

---

## 🎨 使用指南

### 颜色使用

```tsx
// 盈利色（猩红）
className="text-win-crimson bg-win-crimson/20"

// 亏损色（翠绿）
className="text-loss-emerald bg-loss-emerald/20"

// 奢华金
className="text-luxury-gold-500 bg-luxury-gold-500/20"

// 金色闪光文字
className="text-gold-shimmer"
```

### 动画使用

```tsx
import { motion } from 'framer-motion';

// 页面加载动画
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>

// 悬停效果
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}

// 列表项延迟
transition={{ delay: index * 0.1 }}
```

### 卡片效果

```tsx
// 3D 卡片
className="card-3d"

// 玻璃态
className="glass"

// 金色发光
className="glow-gold"

// 渐变边框
className="gradient-border"
```

---

## 📝 待完成的工作

### 第二阶段
- [ ] Statistics 页面重构（自定义图表样式）
- [ ] AddRecord 页面优化（自定义数字键盘）
- [ ] CircleManager 页面优化（拖拽效果）
- [ ] Settings 页面优化

### 第三阶段
- [ ] 粒子特效系统（盈利红色粒子、亏损绿色雨滴）
- [ ] 页面转场动画（使用 AnimatePresence）
- [ ] 触觉反馈集成（Haptics）
- [ ] 深色模式完善

---

## 🚀 运行项目

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览构建
npm run preview
```

---

## 🎯 设计决策

### 为什么选择这个风格？

1. **差异化**：避开通用 AI 美学（Inter 字体 + 紫色渐变）
2. **文化契合**：红涨绿跌符合中国用户习惯
3. **专业感**：等宽数字字体 + 交易终端风格
4. **记忆点**：金色闪光 + 3D 卡片

### 技术选择

- **Framer Motion**：流畅的动画和交互
- **Tailwind CSS**：快速开发，易于定制
- **Google Fonts**：高质量字体，CDN 加速
- **TypeScript**：类型安全

---

## 📱 适配说明

- ✅ 移动端优先
- ✅ 深色/浅色主题
- ✅ 安全区域适配（notch、home indicator）
- ✅ 触摸优化

---

**Created with ❤️ using frontend-design skill**
