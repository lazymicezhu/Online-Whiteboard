# 多人在线像素涂鸦白板

<<<<<<< HEAD
演示站：https://lazymicezhu.github.io/Online-Whiteboard/
=======
>>>>>>> a2d4ede01b76fe1fff479bfa36bc67b41f581d94
一个基于 Firebase 的多人实时像素涂鸦白板应用。

## 功能特点

- 实时多人协作绘制
- 用户注册和登录系统
- 离线模式支持
- VIP 和管理员权限
- 操作次数限制
- 自定义画笔粗细（1-5 像素）
- 半透明浮动工具面板
- 在线用户滚动显示
- 管理员可调整画布大小及管理用户
- 实时聊天功能，支持悬浮球模式

## 聊天功能

应用内置了多人实时聊天系统，主要特点：

- 悬浮球设计，不干扰主画布操作
- 支持未读消息提醒
- 区分用户类型（普通用户/VIP/管理员）
- 支持系统消息（用户加入/离开）
- 最大消息长度限制为 100 个字符
- 自动保存聊天历史记录

## Firebase 配置说明

项目已配置为使用 Firebase 的以下服务：

- Realtime Database：存储像素数据、用户信息和聊天消息
- Authentication：用户认证
- Analytics：使用情况分析

### Firebase 数据库规则

项目包含一个`firebase.rules.json`文件，您需要将其规则部署到 Firebase Realtime Database。可以通过以下步骤完成：

1. 登录 Firebase 控制台：https://console.firebase.google.com/
2. 打开您的项目"lazymice-web-game"
3. 进入"Realtime Database"
4. 点击"规则"选项卡
5. 将`firebase.rules.json`中的规则复制粘贴到编辑器中
6. 点击"发布"按钮保存规则

### Firebase 存储结构

数据库使用以下结构：

- `/users/{userId}` - 用户信息
- `/online_users/{userId}` - 在线用户
- `/pixels/{x,y}` - 像素数据
- `/draw_limits/{userId}` - 绘制限制
- `/chats/{messageId}` - 聊天消息

## 本地开发和调试

1. 确保安装了现代浏览器
2. 使用本地 HTTP 服务器运行项目（如使用 VS Code 的 Live Server 插件）
3. 支持离线模式，在没有网络连接时仍可使用基本功能

## 部署

可以将项目部署到任何静态网站托管服务，如：

- GitHub Pages
- Firebase Hosting
- Netlify

### GitHub Pages 部署说明

GitHub Pages 是最简单的部署方式，只需以下步骤：

1. 创建一个新的 GitHub 仓库
2. 将您的代码上传至该仓库：
   ```bash
   git init
   git add .
   git commit -m "初始提交"
   git branch -M main
   git remote add origin https://github.com/你的用户名/仓库名.git
   git push -u origin main
   ```
3. 在 GitHub 仓库设置中启用 GitHub Pages：

   - 进入仓库页面，点击"Settings"
   - 滚动到"GitHub Pages"部分
   - 在"Source"中选择"main"分支，点击"Save"
   - GitHub 会为您提供部署的 URL（通常形如 https://你的用户名.github.io/仓库名/）

4. 访问生成的 URL 即可查看您的应用

无需任何额外的构建步骤，GitHub Pages 会直接提供您上传的文件。

注意：确保您的项目中包含一个`index.html`文件在根目录下，这将作为入口页面。

### Firebase Hosting 部署（可选）

对于 Firebase Hosting，可以执行以下步骤：

1. 安装 Firebase CLI：`npm install -g firebase-tools`
2. 登录 Firebase：`firebase login`
3. 初始化项目：`firebase init hosting`
4. 部署项目：`firebase deploy --only hosting`

## 数据库清理功能

为了优化 Firebase Realtime Database 的使用和性能，项目现在包含了自动数据清理功能。这些功能通过 Firebase Cloud Functions 实现，定期清理旧数据以减少数据库大小和下载流量。

### 清理任务

项目设置了以下几个清理任务：

1. **旧像素清理**：每天凌晨 2 点运行，清理 30 天前的像素数据
2. **聊天消息清理**：每周一凌晨 3 点运行，清理 7 天前的聊天消息
3. **离线用户清理**：每小时运行一次，清理 2 小时前的离线用户记录

### 部署清理功能

要部署清理功能，请按照以下步骤操作：

1. 确保已安装 Firebase CLI：`npm install -g firebase-tools`
2. 登录 Firebase：`firebase login`
3. 进入 functions 目录：`cd functions`
4. 安装依赖：`npm install`
5. 部署函数：`npm run deploy`

### 监控清理功能

部署后，您可以在 Firebase 控制台的 Functions 页面监控清理任务的执行情况和日志。

### 临时数据清理

除了自动清理功能，项目还提供了临时数据清理脚本，可以手动执行数据清理操作：

1. 在项目中找到 `delete-data.js` 文件
2. 在 `index.html` 中临时添加脚本引用：`<script src="delete-data.js"></script>`
3. 打开应用，通过浏览器控制台执行以下函数：
   - `clearPixels()` - 删除所有像素数据
   - `clearChats()` - 删除所有聊天记录
   - `clearOnlineUsers()` - 删除所有在线用户记录
   - `clearDrawLimits()` - 删除所有绘制限制记录
   - `clearOldPixels(days)` - 删除指定天数前的像素数据，默认 30 天
   - `clearOldChats(days)` - 删除指定天数前的聊天记录，默认 7 天
4. 完成清理后，记得从 `index.html` 中移除脚本引用

**警告**：手动清理操作无法撤销，请谨慎使用！
