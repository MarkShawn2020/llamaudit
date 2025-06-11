'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DifyConfig, DEFAULT_DIFY_CONFIGS, DIFY_CONFIG_STORAGE_KEY } from '@/types/dify-config';

interface DifyConfigContextType {
  config: DifyConfig;
  setConfig: (config: DifyConfig) => void;
  updateConfig: (updates: Partial<DifyConfig>) => void;
}

const DifyConfigContext = createContext<DifyConfigContextType | undefined>(undefined);

export function DifyConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<DifyConfig>(DEFAULT_DIFY_CONFIGS.cloud);

  // 从本地存储加载配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(DIFY_CONFIG_STORAGE_KEY);
      if (saved) {
        try {
          const parsedConfig = JSON.parse(saved) as DifyConfig;
          setConfigState(parsedConfig);
        } catch (error) {
          console.error('Failed to parse saved Dify config:', error);
        }
      }
    }
  }, []);

  const setConfig = (newConfig: DifyConfig) => {
    setConfigState(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DIFY_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    }
  };

  const updateConfig = (updates: Partial<DifyConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
  };

  return (
    <DifyConfigContext.Provider value={{ config, setConfig, updateConfig }}>
      {children}
    </DifyConfigContext.Provider>
  );
}

export function useDifyConfig() {
  const context = useContext(DifyConfigContext);
  if (context === undefined) {
    throw new Error('useDifyConfig must be used within a DifyConfigProvider');
  }
  return context;
}