'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { DifyConfig } from '@/types/dify-config';
import { useGlobalSettings } from '@/contexts/global-settings-context';

interface DifyConfigContextType {
  config: DifyConfig;
  setConfig: (config: DifyConfig) => void;
  updateConfig: (updates: Partial<DifyConfig>) => void;
}

const DifyConfigContext = createContext<DifyConfigContextType | undefined>(undefined);

// DifyConfigProvider现在作为GlobalSettings的适配器层
export function DifyConfigProvider({ children }: { children: ReactNode }) {
  const { settings, updateDifyConfig } = useGlobalSettings();

  const updateConfig = (updates: Partial<DifyConfig>) => {
    const newConfig = { ...settings.dify, ...updates };
    updateDifyConfig(newConfig);
  };

  const contextValue: DifyConfigContextType = {
    config: settings.dify,
    setConfig: updateDifyConfig,
    updateConfig,
  };

  return (
    <DifyConfigContext.Provider value={contextValue}>
      {children}
    </DifyConfigContext.Provider>
  );
}

// 保持向后兼容的useDifyConfig hook
export function useDifyConfig() {
  const context = useContext(DifyConfigContext);
  if (context === undefined) {
    throw new Error('useDifyConfig must be used within a DifyConfigProvider');
  }
  return context;
}