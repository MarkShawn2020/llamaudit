/**
 * 智能问答系统类型定义
 */

// Dify API 相关类型
export interface DifyRetrievalRequest {
  query: string;
  retrieval_model?: {
    search_method: 'semantic_search' | 'hybrid_search' | 'full_text_search' | 'keyword_search';
    top_k?: number;
    score_threshold_enabled?: boolean;
    score_threshold?: number;
    reranking_enable?: boolean;
    reranking_model?: {
      reranking_provider_name: string;
      reranking_model_name: string;
    };
    reranking_mode?: {
      reranking_provider_name: string;
      reranking_model_name: string;
    };
    weights?: number;
    metadata_filtering_conditions?: any;
  };
}

export interface DifySegment {
  id: string;
  position: number;
  document_id: string;
  content: string;
  answer?: string;
  word_count: number;
  tokens: number;
  keywords: string[];
  index_node_id: string;
  index_node_hash: string;
  hit_count: number;
  enabled: boolean;
  status: string;
  created_by: string;
  created_at: number;
  indexing_at: number;
  completed_at: number;
  error?: string;
  document: {
    id: string;
    data_source_type: string;
    name: string;
  };
}

export interface DifyRetrievalRecord {
  segment: DifySegment;
  score: number;
  tsne_position?: any;
}

export interface DifyRetrievalResponse {
  query: {
    content: string;
  };
  records: DifyRetrievalRecord[];
}

// OpenRouter AI 相关类型
export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 聊天消息类型
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: DifyRetrievalRecord[];
  error?: string;
  isLoading?: boolean;
  isStreaming?: boolean;
  metadata?: {
    intentResult?: {
      isKnowledgeBaseRelated: boolean;
      confidence: number;
      reasoning: string;
    };
    retrievalTime?: number;
    streamingChunks?: number;
    [key: string]: any;
  };
}

// 助手状态类型
export interface AssistantState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentContext: DifyRetrievalRecord[];
}

// 配置类型
export interface AssistantConfig {
  datasetId: string;
  difyApiKey: string;
  difyBaseUrl: string;
  openRouterApiKey: string;
  aiModel: string;
  maxContextLength?: number;
  retrievalTopK?: number;
  scoreThreshold?: number;
}

// API 响应包装类型
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// 错误类型
export interface AssistantError {
  type: 'retrieval' | 'ai' | 'network' | 'unknown';
  message: string;
  details?: any;
}

// 组件Props类型
export interface FloatingButtonProps {
  onClick: () => void;
  hasNotification?: boolean;
  disabled?: boolean;
}

export interface AssistantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onClearMessages: () => void;
  isLoading: boolean;
  error?: string | null;
}

export interface ChatMessageProps {
  message: ChatMessage;
  showContext?: boolean;
  onContextToggle?: (messageId: string) => void;
}

export interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Hook 返回类型
export interface UseKnowledgeAssistantReturn {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  openAssistant: () => void;
  closeAssistant: () => void;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  getAssistantStats?: () => any;
  exportConversation?: (format?: 'txt' | 'json') => string;
}

export interface UseKnowledgeRetrievalReturn {
  retrieveKnowledge: (query: string) => Promise<DifyRetrievalResponse>;
  isLoading: boolean;
  error: string | null;
  clearError?: () => void;
  cancelRequest?: () => void;
}

export interface UseAIChatReturn {
  sendToAI: (messages: OpenRouterMessage[], options?: any) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  clearError?: () => void;
  cancelRequest?: () => void;
}