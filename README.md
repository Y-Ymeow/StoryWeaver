# AI 剧本房

AI 驱动的互动剧本创作平台

## 技术栈

- **前端框架**: Preact + Vite
- **样式**: TailwindCSS 4.0
- **数据库**: sql.js (SQLite)
- **PWA**: vite-plugin-pwa
- **AI Provider**: OpenAI / Gemini / DeepSeek / 自定义

## 功能特性

- 🎭 创建和管理剧本房间
- 🎬 多场景演出系统
- 👥 角色设定与记忆
- 🤖 AI 驱动的剧情生成
- 💾 本地数据库存储
- 📱 PWA 离线支持

## 开发指南

### 环境要求

- Node.js 18+
- npm / yarn / pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
src/
├── assets/          # 静态资源
│   └── app.css      # 全局样式
├── components/      # UI 组件
│   ├── pages/       # 页面组件
│   └── ui/          # 通用 UI 组件
├── db/              # 数据库相关
│   ├── models/      # 数据表操作
│   ├── index.ts     # 数据库初始化
│   ├── migrations.ts # 迁移文件
│   └── schema.ts    # 表结构定义
├── lib/             # 工具库
│   ├── memory/      # 记忆库处理
│   ├── directive/   # 指令处理
│   ├── prompts/     # Prompt 模板
│   └── openai/      # AI 客户端
├── providers/       # AI Provider
│   ├── base.ts      # 抽象基类
│   ├── openai.ts    # OpenAI 实现
│   ├── gemini.ts    # Gemini 实现
│   ├── deepseek.ts  # DeepSeek 实现
│   └── custom-providers.ts # 自定义支持
├── stores/          # 全局状态
│   ├── index.ts     # 状态导出
│   ├── types.ts     # 类型定义
│   └── actions.ts   # Action 函数
├── app.tsx          # 应用入口
└── main.tsx         # 渲染入口
```

## 数据库设计

### 表结构

1. **rooms** - 房间（剧本）
2. **scenes** - 场景
3. **characters** - 角色
4. **scene_characters** - 场景角色关联
5. **performances** - 演出记录
6. **system_settings** - 系统设置
7. **provider_configs** - AI Provider 配置

## 指令系统

在输入框中可以使用以下指令：

- `/help` - 显示帮助
- `/summary` - 查看场景总结
- `/skip` - 跳过轮次
- `/retry` - 重新生成
- `/memory` - 查看记忆
- `/character` - 查看角色信息
- `/scene` - 查看场景信息
- `/exit` - 退出场景
- `/save` - 保存进度
- `/settings` - 打开设置

## AI 输出格式

AI 支持多类型输出：

```
[message: 对话内容]
[action: 动作描述]
[thought: 心理活动]
[emotion: 情绪状态]
```

## License

MIT
