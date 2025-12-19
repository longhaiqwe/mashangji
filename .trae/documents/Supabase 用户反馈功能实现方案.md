# Supabase 用户反馈功能实现方案（含语音输入）

## 1. 方案概述
我们将基于 Supabase 数据库存储反馈，并在前端实现一个支持**语音输入**的反馈界面。为了复用现有的语音识别逻辑，我们将创建一个自定义 Hook。

## 2. 详细实施计划

### 步骤 1：数据库准备 (SQL)
在 Supabase Dashboard 运行以下 SQL 创建表和安全策略：

```sql
create table feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  content text not null,
  contact_info text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table feedback enable row level security;

create policy "Users can insert their own feedback"
on feedback for insert
with check (auth.uid() = user_id);
```

### 步骤 2：前端核心逻辑
1.  **封装语音 Hook (`hooks/useVoiceInput.ts`)**:
    - 将 `AddRecord.tsx` 中的语音识别逻辑（兼容 Web Speech API 和 Capacitor Native）提取为通用的 `useVoiceInput` Hook。
    - 提供 `start`, `stop`, `isListening`, `transcript` 等接口。

2.  **更新类型定义 (`types.ts`)**:
    - 添加 `SETTINGS_FEEDBACK` 到 `ViewState`。

### 步骤 3：UI 实现
1.  **创建反馈组件 (`components/Feedback.tsx`)**:
    - **文本区域**: 用于手动输入或显示语音转换结果。
    - **语音按钮**: 调用 `useVoiceInput`，点击开始/停止录音，将结果追加到文本区域。
    - **提交按钮**: 将内容保存到 Supabase。

2.  **入口集成**:
    - **`Settings.tsx`**: 添加“意见反馈”菜单项。
    - **`App.tsx`**: 处理路由跳转。

此方案不仅满足了数据收集需求，还通过提取语音逻辑优化了代码结构，符合 DRY 原则。