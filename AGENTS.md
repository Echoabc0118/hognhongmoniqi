# 恋爱哄哄模拟器 - 项目上下文

## 项目概述

恋爱哄哄模拟器是一款情感沟通练习游戏，帮助用户练习如何与生气的伴侣沟通、道歉并获得原谅。

### 核心功能
- 选择伴侣性别（男/女）
- 选择伴侣性格（温柔/傲娇/倔强/知性/腹黑）
- 选择吵架场景（10个真实场景）
- **选择题模式对话**：每轮从6个AI生成的回复选项中选择
- TTS 语音输出，带情感变化
- 分享游戏结果
- 排行榜系统

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **AI**: Coze LLM (对话生成 + 愤怒值判断)
- **TTS**: Coze TTS (语音合成 + SSML 情感控制)

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts       # 对话 API (LLM)
│   │   │   ├── tts/route.ts        # 语音合成 API
│   │   │   └── leaderboard/route.ts # 排行榜 API
│   │   ├── layout.tsx              # 根布局
│   │   ├── page.tsx                # 主页面
│   │   └── globals.css             # 全局样式
│   ├── components/
│   │   ├── game/                   # 游戏组件
│   │   │   ├── character-select.tsx  # 性别性格选择
│   │   │   ├── scenario-select.tsx   # 场景选择
│   │   │   ├── game-play.tsx         # 游戏对话界面
│   │   │   ├── game-result.tsx       # 游戏结果
│   │   │   └── leaderboard.tsx       # 排行榜
│   │   └── ui/                     # Shadcn UI 组件库
│   ├── context/
│   │   └── game-context.tsx        # 游戏状态管理
│   ├── hooks/                      # 自定义 Hooks
│   └── lib/
│       ├── game-config.ts          # 游戏配置（性格、场景、声音映射）
│       └── utils.ts                # 通用工具函数
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

## 核心配置文件

### src/lib/game-config.ts
包含所有游戏配置：
- `PERSONALITIES`: 5种性格配置（温柔/傲娇/倔强/知性/腹黑）
- `SCENARIOS`: 10个吵架场景
- `PLEASURE_STAGES`: 愉悦值阶段（影响语音情感）
- `generateSSML()`: 生成情感 SSML

### src/context/game-context.tsx
游戏状态管理：
- 游戏状态：idle/selecting/playing/won/lost/timeout
- 愉悦值管理
- 消息历史
- 排行榜数据

## API 接口

### POST /api/chat
对话生成接口
```typescript
// 请求
{
  message?: string;          // 玩家选择的回复（可选，开场白时不需要）
  gender: 'male' | 'female'; // 伴侣性别
  personalityId: string;     // 性格ID
  scenarioId: number;        // 场景ID
  currentPleasure: number;   // 当前愉悦值
  conversationHistory: Array<{role, content}>; // 对话历史
  isFirstMessage?: boolean;  // 是否是开场白
}

// 响应
{
  reply: string;           // AI回复
  pleasureChange: number;  // 愉悦值变化
  newPleasure: number;     // 新愉悦值
  ssml: string;            // SSML 语音标记
  pleasureStage: { label, emotion };
  options: ReplyOption[];  // 6个可选回复
}

// ReplyOption 类型
{
  id: number;
  content: string;
  type: 'angry' | 'happy' | 'funny' | 'sweet' | 'sincere' | 'neutral';
}
```

### 选项类型说明
| 类型 | 说明 | 愉悦值影响 |
|------|------|-----------|
| angry | 惹人生气的 | -8 ~ -15 |
| happy | 让人开心的 | +5 ~ +10 |
| funny | 搞笑的 | +3 ~ +8 |
| sweet | 撒娇卖萌的 | +3 ~ +8 |
| sincere | 诚恳道歉的 | +5 ~ +10 |
| neutral | 出其不意的 | 视内容而定 |

### POST /api/tts
语音合成接口
```typescript
// 请求
{
  text?: string;           // 文本内容
  ssml?: string;           // SSML 标记
  gender: 'male' | 'female';
  personalityId: string;
  currentPleasure: number;
}

// 响应
{
  audioUrl: string;        // 音频 URL
  audioSize: number;       // 文件大小
}
```

### GET/POST /api/leaderboard
排行榜接口
```typescript
// POST 请求
{
  nickname: string;
  rounds: number;
  duration: number;
  personality: string;
  scenario: string;
}

// GET 响应
{
  leaderboard: LeaderboardEntry[];
  total: number;
}
```

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

- **项目理解加速**：初始可以依赖项目下`package.json`文件理解项目类型，如果没有或无法理解退化成阅读其他文件。
- **Hydration 错误预防**：严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。

## UI 设计与组件规范

- 项目使用 shadcn/ui 组件库，位于 `src/components/ui/` 目录
- 游戏组件位于 `src/components/game/` 目录
- 使用 Tailwind CSS 进行样式设计
- 主题色：粉色系 (pink-500/600)

## 游戏逻辑

### 愉悦值机制
- 初始值：20
- 胜利：愉悦值达到 100
- 失败：对话次数用完且愉悦值未达到 100
- 对话次数：10~20 次（随机）
- 每轮变化：-10 ~ +15

### 愉悦值判定规则
| 回复类型 | 分数变化 |
|---------|---------|
| 敷衍道歉 | -5 ~ 0 |
| 找借口 | -10 ~ -5 |
| 普通回应 | +0 ~ +5 |
| 真诚道歉 | +5 ~ +10 |
| 深度共情 | +10 ~ +15 |

### 愉悦值阶段（影响语音情感）
| 愉悦值范围 | 语速 | 音量 |
|-----------|------|------|
| 0-29 | slow | soft |
| 30-59 | medium | medium |
| 60-89 | medium | medium |
| 90-100 | fast | loud |
