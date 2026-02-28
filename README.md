# 🎬 AI 剧本房

> AI 驱动的互动剧本创作平台 —— 让 AI 成为你的演员，共同编织精彩故事

## ✨ 这是什么？

**AI 剧本房**是一个创新的互动式剧本创作工具。你可以：

- 🎭 **创建剧本世界** —— 设定世界观、风格基调、故事背景
- 👥 **设计角色** —— 定义角色性格、背景故事、台词风格
- 🎬 **编排场景** —— 规划故事走向，设定每轮的表演目标
- 🤖 **AI 扮演** —— AI 根据角色设定进行即兴表演
- 💬 **互动演绎** —— 你也可以扮演其中一个角色，与 AI 共同完成故事

无论你是想创作小说、剧本、还是体验一场沉浸式的角色扮演，AI 剧本房都能帮你实现。

## 🎮 如何使用

### 1️⃣ 配置 AI 模型

首次使用需要配置 AI Provider：

- 支持 **OpenAI**、**Gemini**、**DeepSeek** 或**自定义 API**
- 可配置多个 Provider，随时切换
- 支持导出/导入配置，方便备份

### 2️⃣ 创建剧本房间

填写基本信息：
- **房间名称**：给你的剧本起个名字
- **世界观设定**：故事发生的世界
- **风格基调**：轻松、严肃、悬疑...
- **剧情梗概**：故事主线

### 3️⃣ 添加角色

定义参与演出的角色：
- **角色名称**：名字
- **角色背景**：身世、经历
- **性格特点**：性格描述
- **台词风格**：说话方式
- **角色类型**：AI 扮演 或 玩家扮演

### 4️⃣ 创建场景

场景是故事的一个章节：
- **场景名称**：如"初遇"、"告别"
- **场景描述**：环境和情境
- **场景目标**：这场景要达成什么
- **最大轮次**：预设对话轮数

可以手动创建，也可以**让 AI 根据剧情自动生成场景和轮次计划**。

### 5️⃣ 开始演出

进入场景后：
- 按轮次顺序，AI 角色会根据设定进行表演
- 如果你是玩家角色，轮到你时输入台词和动作
- 每轮都有明确的表演目标
- 演出结束后生成场景摘要

## 🌟 核心功能

### 🎯 轮次计划系统

AI 可以自动为场景生成详细的轮次计划：
- 每轮指定表演角色和表演类型（对话、动作等）
- 确保剧情有条不紊地推进
- 避免演出混乱或跳过关键情节

### 💾 本地数据存储

- 使用 **sql.js** 在浏览器中运行 SQLite
- 数据完全存储在本地，保护隐私
- 支持导出/导入整个剧本房间

### 📱 PWA 支持

- 可安装到桌面或手机
- 支持离线使用（需提前加载数据）

### 🎨 聊天式演出界面

- 对话气泡风格展示
- 支持对话、动作、心理、表情四种内容类型
- 清晰区分不同角色

## 🔧 技术栈

| 技术 | 用途 |
|------|------|
| Preact | 轻量级 React 框架 |
| Vite | 构建工具 |
| TailwindCSS 4.0 | 样式框架 |
| sql.js | 浏览器端 SQLite |
| vite-plugin-pwa | PWA 支持 |

## 📦 安装与运行

### 环境要求

- Node.js 18+ 或 Bun
- 现代浏览器（支持 File System Access API 更佳）

### 本地开发

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 构建生产版本
bun run build
```

### 在线使用

访问 [GitHub Pages](https://y-ymeow.github.io/StoryWeaver/) 直接使用。

## 📁 项目结构

```
src/
├── components/          # UI 组件
│   ├── pages/           # 页面组件
│   │   ├── HomePage.tsx         # 首页
│   │   ├── RoomPage.tsx         # 房间入口
│   │   └── RoomDetailPage.tsx   # 房间详情
│   └── ui/              # 通用组件
│       ├── common/      # 基础组件
│       ├── home/        # 首页相关
│       ├── room/        # 房间相关
│       └── scene/       # 场景演出相关
├── db/                  # 数据库层
│   ├── core.ts          # 数据库核心
│   ├── file-system.ts   # 文件系统操作
│   ├── migrations.ts    # 数据迁移
│   ├── schema.ts        # 表结构
│   └── models/          # 数据模型
├── lib/                 # 工具库
│   ├── prompts/         # Prompt 模板
│   ├── parser/          # 内容解析
│   ├── memory/          # 记忆管理
│   └── rules/           # 演出规则
├── providers/           # AI Provider 实现
├── stores/              # 全局状态管理
└── types/               # TypeScript 类型定义
```

## 🔑 AI Provider 配置示例

### OpenAI

```json
{
  "name": "OpenAI",
  "type": "openai",
  "api_key": "sk-...",
  "base_url": "https://api.openai.com/v1",
  "model": "gpt-4o"
}
```

### DeepSeek

```json
{
  "name": "DeepSeek",
  "type": "openai",
  "api_key": "sk-...",
  "base_url": "https://api.deepseek.com/v1",
  "model": "deepseek-chat"
}
```

### 自定义 Provider

支持任何兼容 OpenAI API 格式的服务。

## 📝 数据库表结构

| 表名 | 说明 |
|------|------|
| rooms | 剧本房间 |
| scenes | 场景 |
| characters | 角色 |
| scene_characters | 场景-角色关联 |
| performances | 演出记录 |
| provider_configs | AI 配置 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT

---

<p align="center">
  Made with ❤️ by AI & Human collaboration
</p>