'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings, Cloud, Server } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DifyConfig, DEFAULT_DIFY_CONFIGS } from '@/types/dify-config';
import { useDifyConfig } from '@/contexts/dify-config-context';

export function DifyConfigComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const { config, setConfig } = useDifyConfig();
  const [workingConfig, setWorkingConfig] = useState<DifyConfig>(config);
  const [customConfig, setCustomConfig] = useState<DifyConfig>({
    baseUrl: '',
    apiKey: '',
    environment: 'custom' as any
  });
  const { toast } = useToast();

  const handlePresetChange = (environment: 'local' | 'cloud') => {
    const newConfig = DEFAULT_DIFY_CONFIGS[environment];
    setWorkingConfig(newConfig);
  };

  const handleCustomConfigChange = (field: keyof DifyConfig, value: string) => {
    setCustomConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // 打开对话框时，重置工作配置为当前配置
      setWorkingConfig(config);
      // 如果是自定义配置，初始化自定义配置表单
      if (!DEFAULT_DIFY_CONFIGS.local.baseUrl.includes(config.baseUrl) &&
          !DEFAULT_DIFY_CONFIGS.cloud.baseUrl.includes(config.baseUrl)) {
        setCustomConfig(config);
      }
    }
  };

  const handleSave = () => {
    let finalConfig: DifyConfig;

    if (workingConfig.environment === 'local' || workingConfig.environment === 'cloud') {
      // 使用预设配置
      finalConfig = DEFAULT_DIFY_CONFIGS[workingConfig.environment];
    } else {
      // 使用自定义配置
      finalConfig = customConfig;
    }

    // 验证配置
    if (!finalConfig.baseUrl || !finalConfig.apiKey) {
      toast({
        title: "配置错误",
        description: "请填写完整的 API URL 和 API Key",
        variant: "destructive",
      });
      return;
    }

    setConfig(finalConfig);
    
    toast({
      title: "配置已保存",
      description: `已切换到 ${finalConfig.environment === 'local' ? '本地' : finalConfig.environment === 'cloud' ? '云端' : '自定义'} Dify 服务`,
    });
    
    setIsOpen(false);
  };

  const getCurrentConfigDisplay = () => {
    if (config.environment === 'local') return '本地部署';
    if (config.environment === 'cloud') return '云端服务';
    return '自定义配置';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Dify配置 ({getCurrentConfigDisplay()})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dify 服务配置</DialogTitle>
          <DialogDescription>
            选择要使用的 Dify 服务器环境，配置将保存在本地浏览器中。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <RadioGroup
            value={workingConfig.environment}
            onValueChange={(value) => {
              if (value === 'local' || value === 'cloud') {
                handlePresetChange(value);
              } else {
                setWorkingConfig(prev => ({ ...prev, environment: value as any }));
              }
            }}
          >
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="cloud" id="cloud" />
              <Label htmlFor="cloud" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="font-medium">云端服务</div>
                    <div className="text-sm text-gray-500">使用 Dify 官方云端服务</div>
                    <div className="text-xs text-gray-400 mt-1">
                      URL: {DEFAULT_DIFY_CONFIGS.cloud.baseUrl}
                    </div>
                  </div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="local" id="local" />
              <Label htmlFor="local" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium">本地部署</div>
                    <div className="text-sm text-gray-500">使用本地部署的 Dify 服务</div>
                    <div className="text-xs text-gray-400 mt-1">
                      URL: {DEFAULT_DIFY_CONFIGS.local.baseUrl}
                    </div>
                  </div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-purple-500" />
                  <div>
                    <div className="font-medium">自定义配置</div>
                    <div className="text-sm text-gray-500">手动配置 Dify 服务器信息</div>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {workingConfig.environment === 'custom' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="custom-url">API URL</Label>
                <Input
                  id="custom-url"
                  placeholder="https://your-dify-instance.com/v1"
                  value={customConfig.baseUrl}
                  onChange={(e) => handleCustomConfigChange('baseUrl', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="custom-key">API Key</Label>
                <Input
                  id="custom-key"
                  placeholder="app-xxxxxxxxxx"
                  value={customConfig.apiKey}
                  onChange={(e) => handleCustomConfigChange('apiKey', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              保存配置
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}