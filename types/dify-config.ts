export interface DifyConfig {
  baseUrl: string;
  apiKey: string;
  environment: 'local' | 'cloud' | 'custom';
}

export const DEFAULT_DIFY_CONFIGS: Record<'local' | 'cloud', DifyConfig> = {
  local: {
    baseUrl: 'http://localhost/v1',
    apiKey: 'app-A3TJJe9ZCWfDyMUoudlDD2R5',
    environment: 'local'
  },
  cloud: {
    baseUrl: 'https://api.dify.ai/v1',
    apiKey: 'app-08huXt0LN32Rrc9ePQuhOzxR',
    environment: 'cloud'
  }
};

export const DIFY_CONFIG_STORAGE_KEY = 'dify-config';