'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
import { Settings, Cloud, Server, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DifyConfig, DEFAULT_DIFY_CONFIGS } from '@/types/dify-config';
import { useDifyConfig } from '@/contexts/dify-config-context';

export function DifyConfigComponent() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const [isOpen, setIsOpen] = useState(false);
  const { config, setConfig } = useDifyConfig();
  const [workingConfig, setWorkingConfig] = useState<DifyConfig>(config);
  const [customConfig, setCustomConfig] = useState<DifyConfig>({
    baseUrl: '',
    apiKey: '', // 保留以兼容类型，但项目级配置不使用
    datasetApiKey: '',
    environment: 'custom' as any
  });
  const [testingDatasetKey, setTestingDatasetKey] = useState(false);
  const [datasetKeyTestResult, setDatasetKeyTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [projectDifyConfig, setProjectDifyConfig] = useState<any>(null);
  const { toast } = useToast();

  // 加载项目的Dify配置
  const loadProjectDifyConfig = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/dify-config`);
      if (response.ok) {
        const data = await response.json();
        setProjectDifyConfig(data);
        
        // 如果项目有自定义配置，设置为自定义模式
        if (data.hasApiKey && data.difyBaseUrl !== 'https://api.dify.ai/v1') {
          setCustomConfig({
            baseUrl: data.difyBaseUrl,
            apiKey: '', // 由于安全原因，不显示完整的API密钥
            datasetApiKey: '', // 显示masked版本，但实际使用时从服务器获取
            environment: 'custom' as any
          });
          setWorkingConfig({ ...config, environment: 'custom' as any });
        }
      }
    } catch (error) {
      console.error('加载项目Dify配置失败:', error);
    }
  }, [projectId, config]);

  // 组件挂载时加载项目配置
  useEffect(() => {
    loadProjectDifyConfig();
  }, [projectId, loadProjectDifyConfig]);

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

  const handleSave = async () => {
    setSavingConfig(true);
    
    try {
      let finalConfig: DifyConfig;

      if (workingConfig.environment === 'local' || workingConfig.environment === 'cloud') {
        // 使用预设配置 - 保存到localStorage
        finalConfig = DEFAULT_DIFY_CONFIGS[workingConfig.environment];
        setConfig(finalConfig);
        
        toast({
          title: "配置已保存",
          description: `已切换到 ${finalConfig.environment === 'local' ? '本地' : '云端'} Dify 服务`,
        });
      } else {
        // 使用自定义配置 - 保存到数据库
        finalConfig = customConfig;

        // 验证自定义配置
        if (!finalConfig.baseUrl || !finalConfig.datasetApiKey) {
          toast({
            title: "配置错误",
            description: "请填写完整的 API URL 和 Dataset API Key",
            variant: "destructive",
          });
          return;
        }

        if (!projectId) {
          toast({
            title: "配置错误",
            description: "无法获取项目ID，请刷新页面重试",
            variant: "destructive",
          });
          return;
        }

        // 调用后端API保存配置
        const response = await fetch(`/api/projects/${projectId}/dify-config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            difyBaseUrl: finalConfig.baseUrl,
            difyDatasetApiKey: finalConfig.datasetApiKey,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '保存配置失败');
        }

        const result = await response.json();
        console.log('✅ 项目Dify配置已保存到数据库:', result);

        // 同时更新localStorage以保持一致性
        setConfig(finalConfig);
        
        toast({
          title: "配置已保存",
          description: "自定义Dify配置已保存到项目中",
        });
      }
      
      setDatasetKeyTestResult(null);
      setIsOpen(false);
      
    } catch (error) {
      console.error('保存Dify配置失败:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : '保存配置时发生错误',
        variant: "destructive",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const getCurrentConfigDisplay = () => {
    if (config.environment === 'local') return '本地部署';
    if (config.environment === 'cloud') return '云端服务';
    return '自定义配置';
  };

  const testDatasetConnection = async () => {
    const configToTest = workingConfig.environment === 'custom' ? customConfig : workingConfig;
    
    if (!configToTest.baseUrl) {
      toast({
        title: "测试失败",
        description: "请先填写 API URL",
        variant: "destructive",
      });
      return;
    }

    if (!configToTest.datasetApiKey) {
      toast({
        title: "测试失败",
        description: "请先填写 Dataset API Key",
        variant: "destructive",
      });
      return;
    }

    if (!projectId) {
      toast({
        title: "测试失败",
        description: "无法获取项目ID，请刷新页面重试",
        variant: "destructive",
      });
      return;
    }

    setTestingDatasetKey(true);
    setDatasetKeyTestResult(null);

    try {
      // 使用项目级别的测试API
      const response = await fetch(`/api/projects/${projectId}/dify-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          difyBaseUrl: configToTest.baseUrl,
          difyDatasetApiKey: configToTest.datasetApiKey,
          datasetId: projectDifyConfig?.datasetId || 'test-dataset-id'
        }),
      });

      const result = await response.json();
      setDatasetKeyTestResult(result);

      if (result.success) {
        toast({
          title: "测试成功",
          description: result.message,
        });
      } else {
        toast({
          title: "测试失败",
          description: result.message || result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorResult = {
        success: false,
        message: '网络错误，请检查网络连接'
      };
      
      setDatasetKeyTestResult(errorResult);

      toast({
        title: "测试失败",
        description: errorResult.message,
        variant: "destructive",
      });
    } finally {
      setTestingDatasetKey(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Dify配置 ({getCurrentConfigDisplay()})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dify 服务配置</DialogTitle>
          <DialogDescription>
            选择要使用的 Dify 服务器环境。自定义配置将保存到项目数据库中，预设配置保存在本地浏览器中。
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
                <Label htmlFor="custom-dataset-key">Dataset API Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="custom-dataset-key"
                    placeholder="dataset-xxxxxxxxxx"
                    value={customConfig.datasetApiKey}
                    onChange={(e) => {
                      handleCustomConfigChange('datasetApiKey', e.target.value);
                      setDatasetKeyTestResult(null);
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={testDatasetConnection}
                    disabled={testingDatasetKey || !customConfig.baseUrl || !customConfig.datasetApiKey}
                    className="shrink-0"
                  >
                    {testingDatasetKey ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : datasetKeyTestResult ? (
                      datasetKeyTestResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )
                    ) : (
                      "测试"
                    )}
                  </Button>
                </div>
                {datasetKeyTestResult && (
                  <p className={`text-xs mt-1 ${
                    datasetKeyTestResult.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {datasetKeyTestResult.message}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={savingConfig}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={savingConfig}>
              {savingConfig ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  保存中...
                </>
              ) : (
                '保存配置'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}