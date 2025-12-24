# Android Studio 新手入门指南 (Capacitor 版)

欢迎来到 Android 开发的世界！对于使用 Tailwind/React 开发 Web 应用的您来说，Android Studio 主要充当一个**“运行器”和“打包器”**。您的大部分代码编写工作仍然在 Antigravity/VS Code 中完成。

以下是针对您项目的详细入门教程：

## 第一步：初始配置 (SDK)

如果您刚安装好，可能会遇到 SDK 设置向导：
1. **SDK Components**: 确保勾选 "Android SDK", "Android SDK Platform", 和 "Android Virtual Device"。
2. **License Agreement**: 一路点击 "Accept" 同意协议。
3. **Finish**: 等待下载完成（这可能需要几分钟）。

## 第二步：认识主界面

打开项目 (`npx cap open android`) 后，您会看到以下核心区域：

1.  **左侧项目栏 (Project)**:
    *   默认视图是 **"Android"**，它把文件按逻辑（Manifest, Java, Res）分类，而不是按物理文件夹。
    *   **核心文件**: `app/manifests/AndroidManifest.xml` (类似于 `index.html` + `package.json`，定义权限和 App 名称)。
2.  **顶部工具栏**:
    *   **设备选择器**: 显示 "No Devices" 或您创建的模拟器名字。
    *   **绿色三角形 (Run)**: 类似于 `npm run dev`，把 App 安装到模拟器或手机上。
    *   **大象图标 (Gradle Sync)**: 当您修改了原生配置依赖后，需要点它重新同步。
3.  **底部工具栏**:
    *   **Logcat**: 最重要的调试区域！这里显示 App 的运行日志（类似于浏览器的 Console）。

## 第三步：创建模拟器 (虚拟手机)

要看到 App 运行，您需要一台“手机”：

1.  如果在顶部工具栏看到 "No Device"，点击它，选择 **"Device Manager"** (或者右侧边栏的小手机图标)。
2.  点击 **"Create Device"** (加号)。
3.  **Hardware**: 选择一个带有 "Play Store" 图标的设备，例如 **Pixel 7** 或 **Pixel 6**。
4.  **System Image**: 选择一个 Android 系统版本（推荐最新的 **Android 14 (UpsideDownCake)** 或 **Android 13 (Tiramisu)**）。
    *   *注意：如果旁边有 "Download" 按钮，需要先点击下载。*
5.  点击 **Next** -> **Finish**。

## 第四步：运行 App

1.  在顶部工具栏选中刚才创建的设备（例如 "Pixel 7 API 34"）。
2.  点击绿色的 **Run (三角形)** 按钮。
3.  **耐心等待**: 第一次构建 (Build) 可能会比较慢（需要下载 Gradle 依赖）。
4.  模拟器会自动启动，您的麻将记账 App 就会出现在屏幕上！

## 第五步：日常开发流程

因为您使用的是 Capacitor，工作流是这样的：

1.  **在 Antigravity 中写代码**: 修改 React 组件、样式等。
2.  **编译 Web 资源**: 在 Antigravity 终端运行 `npm run build`。
3.  **同步到 Android**: 运行 `npx cap sync` (这步很重要！把最新的 HTML/JS/CSS 复制到 Android 项目里)。
4.  **在 Android Studio 中运行**: 点击绿色三角形看效果。

**(高级技巧)**: 您也可以使用 `npx cap run android -l --external` 来启用“实时重载”模式，这样修改代码后手机上会通过网络直接刷新，不用每次都重构建。

## 常见问题排查

*   **各种红色报错**: 首先尝试点击顶部菜单 **File -> Sync Project with Gradle Files**。
*   **模拟器无法上网**: 偶尔会发生，尝试重启模拟器（长按模拟器电源键重启）。
*   **SDK 路径错误**: 检查 `local.properties` 文件里的 `sdk.dir` 路径是否正确。

祝您开发愉快！
