我将优化 AI 分析逻辑，确保只有当输入包含**有效的记账信息（金额）**时才进行解析，否则返回空数组，触发我们刚刚实现的“友好提示”。

### 1. 优化 Prompt (geminiService.ts)
-   **目标**：告诉 AI，如果输入内容是无意义的闲聊（garbage input）或者不包含任何财务/输赢信息，**必须返回空数组 `[]`**，而不是强行编造一个金额为 0 的记录。
-   **修改点**：
    在 `Extraction Rules` 中增加一条明确规则：
    > 6. **Invalid Input**:
    >    - If the text does NOT contain any financial context (no amount, no win/loss keywords), or is just casual conversation (e.g., "hello", "test", "whatever"), return an **EMPTY ARRAY `[]`**.
    >    - Do NOT return a record with amount 0 unless the text explicitly says "won 0" or "lost 0".

### 2. 后处理过滤 (geminiService.ts)
-   **目标**：作为双重保险，如果 AI 还是返回了 `amount: 0` 且没有明确备注说明是“平局”，则将其过滤掉。
-   **修改点**：
    在返回数据前，增加过滤逻辑：
    ```typescript
    return data.map(...).filter(item => item.amount > 0 || item.note.includes('平'));
    ```
    *(不过考虑到有些用户可能真的想记 0 元的流水，最好还是完全依赖 Prompt 的智能判断。如果是纯闲聊，Prompt 应该能搞定。)*
    
    **修正策略**：主要依靠 Prompt 约束。如果 AI 返回了 `amount: 0`，我们检查一下原始文本是否真的包含数字“0”。如果没有，说明是 AI 幻觉，应该丢弃。

### 3. 预期效果
-   输入：“随便说点什么” -> AI 返回 `[]` -> 前端显示：“没听清？请尝试包含金额...”
-   输入：“赢了0” -> AI 返回 `[{amount: 0...}]` -> 正常记账。
-   输入：“赢了100” -> AI 返回 `[{amount: 100...}]` -> 正常记账。

**你觉得这个逻辑是否严谨？如果没问题，我将开始修改 Prompt。**