# 🚀 快速开始：App Store 提交

您的所有 App Store 提交材料已准备完毕！以下是快速上传的步骤。

## 📸 第一步：部署隐私政策（10分钟）

隐私政策是提交的必需项，选择以下最简单的方式：

### 方法：使用 Vercel（最快最简单）

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 进入目录并部署
cd AppStoreAssets
vercel privacy-policy.html --prod

# 3. 复制返回的 URL（类似：https://privacy-policy-xxx.vercel.app/）
# 这个 URL 就是您的隐私政策地址
```

**完成后：**
- ✅ 记下隐私政策 URL
- ✅ 在浏览器中打开确认可访问

---

## 💻 第二步：提交到 App Store Connect（1小时）

### 2.1 创建 Archive（30分钟）

```bash
# 1. 确保生产版本已构建
npm run build

# 2. 同步到 iOS
npm run cap:sync

# 3. 打开 Xcode
npm run cap:open
```

**在 Xcode 中：**
1. 顶部选择 `Any iOS Device (arm64)`
2. 菜单栏：Product → Archive
3. 等待构建完成（3-5分钟）
4. 在 Organizer 中选择 Archive
5. 点击 `Distribute App` → `App Store Connect` → `Upload`
6. 等待上传完成并处理

---

### 2.2 配置 App Store Connect（30分钟）

访问：https://appstoreconnect.apple.com/

#### 创建 App（如果还没有）
- 点击「我的 App」→「+」
- 名称：`麻上记`
- Bundle ID：`com.longhai.mashangji`
- SKU：`mashangji-001`

#### 上传截图
导航到「App Store」标签 → 选择 6.7" Display：

上传这 5 张图片（按顺序）：
1. `AppStoreAssets/Screenshots/01_Login.png`
2. `AppStoreAssets/Screenshots/02_Dashboard.png`
3. `AppStoreAssets/Screenshots/03_AddRecord.png`
4. `AppStoreAssets/Screenshots/04_Statistics.png`
5. `AppStoreAssets/Screenshots/05_Settings.png`

#### 填写文案

**App 名称：**
```
麻上记
```

**副标题：**
```
记录每一份好运
```

**关键词：**
```
麻将,记录,统计,分数,战绩,娱乐,游戏,数据分析,趋势,运势
```

**描述：**
（从 `AppStoreAssets/SUBMISSION_CHECKLIST.md` 中复制完整描述）

**隐私政策 URL：**
```
[粘贴您第一步部署的 Vercel URL]
```

**支持 URL：**
```
https://github.com/longhaiqwe/mashangji
```

#### 配置 App 隐私

- 数据收集类型：
  - ✅ 联系信息（邮箱）
  - ✅ 用户内容（游戏记录）
- 数据用途：App 功能
- 数据关联：✅ 与用户身份关联

#### 审核信息

**演示账号：**
```
用户名：longhaiqwe@gmail.com
密码：longhai123
```

**备注：**
```
麻上记是一款麻将游戏记录工具。
应用无内购、无广告、无第三方广告 SDK。
```

#### 选择构建版本
- 等待处理完成后，选择最新的构建

---

### 2.3 提交审核

1. 检查所有必填项是否完成
2. 点击「提交以供审核」
3. 回答问卷：
   - 加密：否
   - 广告：否
   - 内购：否
4. 点击「提交」

**完成！** 🎉

---

## ⏰ 预期时间线

| 步骤 | 时间 |
|------|------|
| 部署隐私政策 | 10分钟 |
| Xcode Archive | 30分钟 |
| App Store Connect 配置 | 30分钟 |
| 构建处理 | 5-30分钟 |
| Apple 审核 | 1-3天 |
| **总计** | **2-4天** |

---

## ✅ 快速检查清单

提交前确认：
- [ ] 隐私政策已部署并可访问
- [ ] Archive 上传成功
- [ ] 5 张截图已上传
- [ ] 所有文案已填写
- [ ] 测试账号确认可用：longhaiqwe@gmail.com / longhai123
- [ ] 已提交审核

---

## 📚 详细文档

如需详细说明，请查看：
- 完整指南：`walkthrough.md`
- 提交清单：`AppStoreAssets/SUBMISSION_CHECKLIST.md`

---

## 💬 遇到问题？

如果提交过程中遇到任何错误或疑问，请随时告诉我！

**祝您的应用顺利上架！** 🚀
