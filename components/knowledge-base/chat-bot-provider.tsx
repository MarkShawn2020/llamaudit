'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { FloatingChatBot } from './floating-chat-bot';

interface ChatBotContextType {
  showChatBot: (knowledgeBaseId: string, knowledgeBaseName: string, projectName?: string) => void;
  hideChatBot: () => void;
  isVisible: boolean;
}

const ChatBotContext = createContext<ChatBotContextType | undefined>(undefined);

interface ChatBotState {
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  projectName?: string;
}

export function ChatBotProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [chatBotState, setChatBotState] = useState<ChatBotState | null>(null);

  const showChatBot = (knowledgeBaseId: string, knowledgeBaseName: string, projectName?: string) => {
    setChatBotState({ knowledgeBaseId, knowledgeBaseName, projectName });
    setIsVisible(true);
  };

  const hideChatBot = () => {
    setIsVisible(false);
    // 延迟清理状态，避免组件销毁时的闪烁
    setTimeout(() => setChatBotState(null), 300);
  };

  const contextValue: ChatBotContextType = {
    showChatBot,
    hideChatBot,
    isVisible
  };

  return (
    <ChatBotContext.Provider value={contextValue}>
      {children}
      {isVisible && chatBotState && (
        <FloatingChatBot
          knowledgeBaseId={chatBotState.knowledgeBaseId}
          knowledgeBaseName={chatBotState.knowledgeBaseName}
          projectName={chatBotState.projectName}
        />
      )}
    </ChatBotContext.Provider>
  );
}

export function useChatBot() {
  const context = useContext(ChatBotContext);
  if (context === undefined) {
    throw new Error('useChatBot must be used within a ChatBotProvider');
  }
  return context;
}