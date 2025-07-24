'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DifyConfig, DEFAULT_DIFY_CONFIGS, DIFY_CONFIG_STORAGE_KEY } from '@/types/dify-config';

// 主题配置类型
export type Theme = 'light' | 'dark' | 'system';

// 语言配置类型
export type Language = 'zh' | 'en';

// 全局设置接口
export interface GlobalSettings {
  // Dify配置
  dify: DifyConfig;
  
  // 应用主题
  theme: Theme;
  
  // 语言设置
  language: Language;
  
  // 通知设置
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  
  // 默认项目设置
  defaultProject: {
    indexingTechnique: 'high_quality' | 'economy';
    permission: 'only_me' | 'all_team_members';
  };
  
  // 高级设置
  advanced: {
    debugMode: boolean;
    autoSave: boolean;
    autoSaveInterval: number; // 秒
  };
}

// 默认全局设置
const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  dify: DEFAULT_DIFY_CONFIGS.cloud,
  theme: 'system',
  language: 'zh',
  notifications: {
    enabled: true,
    sound: true,
    desktop: false,
  },
  defaultProject: {
    indexingTechnique: 'high_quality',
    permission: 'only_me',
  },
  advanced: {
    debugMode: false,
    autoSave: true,
    autoSaveInterval: 30,
  },
};

// 存储键名
const GLOBAL_SETTINGS_STORAGE_KEY = 'llamaudit_global_settings';

// 上下文类型定义
interface GlobalSettingsContextType {
  settings: GlobalSettings;
  updateSettings: (updates: Partial<GlobalSettings>) => void;
  updateDifyConfig: (config: DifyConfig) => void;
  updateTheme: (theme: Theme) => void;
  updateLanguage: (language: Language) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextType | undefined>(undefined);

// 全局设置提供者组件
export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);

  // 从本地存储加载设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // 尝试加载全局设置
        const savedSettings = localStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY);
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings) as GlobalSettings;
          setSettings(parsedSettings);
        } else {
          // 如果没有全局设置，尝试迁移旧的Dify配置
          const savedDifyConfig = localStorage.getItem(DIFY_CONFIG_STORAGE_KEY);
          if (savedDifyConfig) {
            const parsedDifyConfig = JSON.parse(savedDifyConfig) as DifyConfig;
            setSettings(prev => ({
              ...prev,
              dify: parsedDifyConfig
            }));
            console.log('🔄 已迁移旧版Dify配置到全局设置');
          }
        }
      } catch (error) {
        console.error('Failed to parse saved global settings:', error);
      }
    }
  }, []);

  // 保存设置到本地存储
  const saveSettings = (newSettings: GlobalSettings) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      
      // 保持旧的Dify配置存储同步（向后兼容）
      localStorage.setItem(DIFY_CONFIG_STORAGE_KEY, JSON.stringify(newSettings.dify));
    }
  };

  // 更新设置
  const updateSettings = (updates: Partial<GlobalSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      saveSettings(newSettings);
      return newSettings;
    });
  };

  // 更新Dify配置
  const updateDifyConfig = (config: DifyConfig) => {
    updateSettings({ dify: config });
  };

  // 更新主题
  const updateTheme = (theme: Theme) => {
    updateSettings({ theme });
    
    // 应用主题到文档
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    }
  };

  // 更新语言
  const updateLanguage = (language: Language) => {
    updateSettings({ language });
    
    // 应用语言到文档（如果需要）
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    }
  };

  // 重置设置
  const resetSettings = () => {
    setSettings(DEFAULT_GLOBAL_SETTINGS);
    saveSettings(DEFAULT_GLOBAL_SETTINGS);
  };

  // 导出设置
  const exportSettings = (): string => {
    return JSON.stringify(settings, null, 2);
  };

  // 导入设置
  const importSettings = (settingsJson: string): boolean => {
    try {
      const importedSettings = JSON.parse(settingsJson) as GlobalSettings;
      
      // 基础验证
      if (!importedSettings.dify || !importedSettings.theme || !importedSettings.language) {
        throw new Error('Invalid settings format');
      }
      
      setSettings(importedSettings);
      saveSettings(importedSettings);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  };

  const contextValue: GlobalSettingsContextType = {
    settings,
    updateSettings,
    updateDifyConfig,
    updateTheme,
    updateLanguage,
    resetSettings,
    exportSettings,
    importSettings,
  };

  return (
    <GlobalSettingsContext.Provider value={contextValue}>
      {children}
    </GlobalSettingsContext.Provider>
  );
}

// Hook to use global settings
export function useGlobalSettings() {
  const context = useContext(GlobalSettingsContext);
  if (context === undefined) {
    throw new Error('useGlobalSettings must be used within a GlobalSettingsProvider');
  }
  return context;
}

// Hook to use Dify config (for backward compatibility)
export function useDifyConfig() {
  const { settings, updateDifyConfig } = useGlobalSettings();
  return {
    config: settings.dify,
    setConfig: updateDifyConfig,
    updateConfig: (updates: Partial<DifyConfig>) => {
      updateDifyConfig({ ...settings.dify, ...updates });
    },
  };
}