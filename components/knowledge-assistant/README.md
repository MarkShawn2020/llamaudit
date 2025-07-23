# 智能问答助手

基于知识库的智能对话系统，集成了 Dify 知识库检索和 OpenRouter AI 模型。

## 功能特性

- 🧠 **智能检索**：基于 Dify 知识库进行语义检索
- 🤖 **AI 对话**：使用 OpenRouter 支持多种 AI 模型
- 💬 **实时对话**：流畅的聊天界面体验
- 📚 **知识来源**：显示回答的知识来源和相关度
- 🎨 **响应式设计**：适配各种设备屏幕
- ⚙️ **可配置**：支持自定义配置和主题

## 快速开始

### 1. 环境配置

在 `.env.local` 文件中添加必要的环境变量：

```env
# Dify 配置
NEXT_PUBLIC_DIFY_DATASET_ID=your_dataset_id
NEXT_PUBLIC_DIFY_API_KEY=your_dify_api_key
NEXT_PUBLIC_DIFY_BASE_URL=https://api.dify.ai

# OpenRouter 配置
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key
```

### 2. 基础使用

最简单的集成方式：

```tsx
import { SimpleKnowledgeAssistant } from '@/components/knowledge-assistant';

export default function App() {
  return (
    <div>
      {/* 你的应用内容 */}
      <main>Hello World</main>
      
      {/* 智能助手 */}
      <SimpleKnowledgeAssistant />
    </div>
  );
}
```

### 3. 自定义配置

```tsx
import { KnowledgeAssistant } from '@/components/knowledge-assistant';

const config = {
  datasetId: 'your_dataset_id',
  difyApiKey: 'your_api_key',
  difyBaseUrl: 'https://api.dify.ai',
  openRouterApiKey: 'your_openrouter_key',
  aiModel: 'claude-3-haiku',
  maxContextLength: 4000,
  retrievalTopK: 5,
  scoreThreshold: 0.3,
};

export default function App() {
  return (
    <div>
      <KnowledgeAssistant config={config} />
    </div>
  );
}
```

## 高级用法

### 使用 Context Provider

```tsx
import { 
  KnowledgeAssistantProvider, 
  AssistantTrigger,
  AssistantStatusIndicator 
} from '@/components/knowledge-assistant';

export default function App() {
  return (
    <KnowledgeAssistantProvider config={config}>
      <div>
        {/* 状态指示器 */}
        <AssistantStatusIndicator />
        
        {/* 触发器按钮 */}
        <AssistantTrigger message="这个系统有什么功能？">
          <button>快速提问</button>
        </AssistantTrigger>
        
        {/* 你的应用内容 */}
        <main>...</main>
      </div>
    </KnowledgeAssistantProvider>
  );
}
```

### 调试模式

```tsx
import { DebugKnowledgeAssistant } from '@/components/knowledge-assistant';

export default function App() {
  return (
    <DebugKnowledgeAssistant 
      config={config}
      showDebugInfo={true}
    />
  );
}
```

## API 参考

### AssistantConfig

```typescript
interface AssistantConfig {
  datasetId: string;           // Dify 数据集 ID
  difyApiKey: string;         // Dify API 密钥
  difyBaseUrl: string;        // Dify API 地址
  openRouterApiKey: string;   // OpenRouter API 密钥
  aiModel: string;            // AI 模型名称
  maxContextLength?: number;  // 最大上下文长度
  retrievalTopK?: number;     // 检索结果数量
  scoreThreshold?: number;    // 相关性阈值
}
```

### 支持的 AI 模型

- `claude-3-haiku` - Anthropic Claude 3 Haiku
- `claude-3-sonnet` - Anthropic Claude 3 Sonnet
- `claude-3-opus` - Anthropic Claude 3 Opus
- `gpt-4` - OpenAI GPT-4
- `gpt-3.5-turbo` - OpenAI GPT-3.5 Turbo

## 组件说明

### 核心组件

- **KnowledgeAssistant** - 主要组件，包含完整功能
- **SimpleKnowledgeAssistant** - 简化版本，使用环境变量配置
- **DebugKnowledgeAssistant** - 调试版本，显示调试信息

### UI 组件

- **FloatingAssistantButton** - 悬浮按钮
- **AssistantSidebar** - 对话侧边栏
- **ChatMessage** - 聊天消息
- **MessageInput** - 消息输入框

### Hooks

- **useKnowledgeAssistant** - 主要业务逻辑
- **useKnowledgeRetrieval** - 知识库检索
- **useAIChat** - AI 对话
- **useAssistantConfig** - 配置管理

## 自定义样式

系统使用 Tailwind CSS，你可以通过 CSS 变量自定义主题：

```css
:root {
  --assistant-primary: #3b82f6;
  --assistant-secondary: #8b5cf6;
  --assistant-background: #ffffff;
  --assistant-foreground: #1f2937;
}
```

## 开发指南

### 项目结构

```
components/knowledge-assistant/
├── types.ts                    # 类型定义
├── knowledge-assistant.tsx     # 主组件
├── floating-button.tsx         # 悬浮按钮
├── assistant-sidebar.tsx       # 侧边栏
├── chat-message.tsx            # 消息组件
├── message-input.tsx           # 输入组件
├── demo.tsx                    # 演示组件
├── index.ts                    # 导出文件
└── README.md                   # 文档

hooks/
├── use-knowledge-assistant.ts  # 主要 Hook
├── use-knowledge-retrieval.ts  # 检索 Hook
└── use-ai-chat.ts             # AI 对话 Hook

lib/
├── knowledge-api.ts           # Dify API 封装
└── openrouter-api.ts         # OpenRouter API 封装
```

### 添加新功能

1. **扩展 API 封装**：在 `lib/` 目录下修改相应的 API 类
2. **创建新 Hook**：在 `hooks/` 目录下添加新的业务逻辑
3. **添加 UI 组件**：在 `components/knowledge-assistant/` 下创建新组件
4. **更新类型定义**：在 `types.ts` 中添加新的类型

### 测试

```bash
# 运行开发服务器
npm run dev

# 访问演示页面
http://localhost:3000/knowledge-assistant-demo
```

## 常见问题

### Q: 助手没有响应？
A: 检查以下配置：
- Dify API 密钥和数据集 ID 是否正确
- OpenRouter API 密钥是否有效
- 网络连接是否正常

### Q: 如何更换 AI 模型？
A: 在配置中修改 `aiModel` 字段：
```typescript
const config = {
  ...otherConfig,
  aiModel: 'claude-3-sonnet', // 更换为其他模型
};
```

### Q: 如何调整检索精度？
A: 修改检索相关配置：
```typescript
const config = {
  ...otherConfig,
  retrievalTopK: 8,      // 增加检索数量
  scoreThreshold: 0.2,   // 降低相关性阈值
};
```

### Q: 如何自定义助手提示词？
A: 当前版本使用内置提示词，未来版本将支持自定义。

## 更新日志

### v1.0.0
- 初始版本发布
- 基础对话功能
- 知识库集成
- AI 模型支持

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License