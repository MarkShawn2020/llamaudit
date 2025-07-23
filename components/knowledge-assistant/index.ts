/**
 * 智能问答助手组件导出
 */

// 主要组件
export { 
  KnowledgeAssistant,
  SimpleKnowledgeAssistant,
  DebugKnowledgeAssistant,
  KnowledgeAssistantProvider,
  useKnowledgeAssistantContext,
  AssistantTrigger,
  AssistantStatusIndicator,
  default
} from './knowledge-assistant';

// 子组件
export { 
  FloatingAssistantButton,
  AssistantStatus,
  AssistantQuickActions,
  AssistantStartupAnimation,
  AssistantThinkingWave
} from './floating-button';

export { 
  AssistantSidebar,
  AssistantSettings
} from './assistant-sidebar';

export { 
  ChatMessage,
  MessageList
} from './chat-message';

export { 
  MessageInput,
  QuickQuestions,
  InputStatus,
  MessageSuggestions,
  FileUploadArea
} from './message-input';

// 类型定义
export type {
  ChatMessage as ChatMessageType,
  AssistantState,
  AssistantConfig,
  FloatingButtonProps,
  AssistantSidebarProps,
  ChatMessageProps,
  MessageInputProps,
  UseKnowledgeAssistantReturn,
  UseKnowledgeRetrievalReturn,
  UseAIChatReturn,
  DifyRetrievalRequest,
  DifyRetrievalResponse,
  OpenRouterMessage,
  OpenRouterRequest,
  OpenRouterResponse,
  ApiResponse,
  AssistantError
} from './types';

// Hooks
export { 
  useKnowledgeAssistant,
  useAssistantConfig,
  useAssistantPerformance
} from '@/hooks/use-knowledge-assistant';

export { 
  useKnowledgeRetrieval,
  useEnhancedKnowledgeRetrieval,
  useKnowledgeRetrievalStats
} from '@/hooks/use-knowledge-retrieval';

export { 
  useAIChat,
  useSmartChat,
  useAIResponseQuality
} from '@/hooks/use-ai-chat';

// API 类
export { 
  KnowledgeAPI,
  createKnowledgeAPI,
  getDefaultRetrievalConfig,
  getEnhancedRetrievalConfig,
  formatRetrievalContext,
  getRetrievalStats,
  filterAndSortResults
} from '@/lib/knowledge-api';

export { 
  OpenRouterAPI,
  createOpenRouterAPI,
  buildSystemPrompt,
  buildMessages,
  getModelConfig,
  estimateTokens,
  checkMessageLength
} from '@/lib/openrouter-api';