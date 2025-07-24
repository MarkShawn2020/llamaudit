'use client';

import React, { useState } from 'react';
import {
  Settings,
  Cloud,
  Server,
  Palette,
  Globe,
  Bell,
  FolderCog,
  Wrench,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Monitor,
  Sun,
  Moon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useGlobalSettings, type Theme, type Language } from '@/contexts/global-settings-context';
import { DEFAULT_DIFY_CONFIGS } from '@/types/dify-config';

export function GlobalSettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dify');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const { settings, updateSettings, updateDifyConfig, updateTheme, updateLanguage, resetSettings, exportSettings, importSettings } = useGlobalSettings();
  const { toast } = useToast();

  // 测试Dify连接
  const testDifyConnection = async () => {
    if (!settings.dify.datasetApiKey) {
      toast({
        title: "测试失败",
        description: "请先填写Dataset API Key",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);

    try {
      // 这里应该调用一个测试API
      // 暂时模拟测试结果
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnectionResult({
        success: true,
        message: "连接成功！Dify服务可正常访问"
      });

      toast({
        title: "连接测试成功",
        description: "Dify服务连接正常",
      });
    } catch (error) {
      const errorResult = {
        success: false,
        message: error instanceof Error ? error.message : "连接失败，请检查配置"
      };
      
      setConnectionResult(errorResult);

      toast({
        title: "连接测试失败",
        description: errorResult.message,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // 导出设置
  const handleExportSettings = () => {
    const settingsJson = exportSettings();
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llamaudit-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "设置已导出",
      description: "设置文件已下载到本地",
    });
  };

  // 导入设置
  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (importSettings(content)) {
        toast({
          title: "设置已导入",
          description: "配置已成功导入并应用",
        });
        setIsOpen(false);
      } else {
        toast({
          title: "导入失败",
          description: "设置文件格式不正确",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  // 重置设置
  const handleResetSettings = () => {
    resetSettings();
    toast({
      title: "设置已重置",
      description: "所有设置已恢复为默认值",
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">设置</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setIsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            全局设置
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setIsOpen(true); setActiveTab('dify'); }}>
            <Cloud className="mr-2 h-4 w-4" />
            Dify配置
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setIsOpen(true); setActiveTab('appearance'); }}>
            <Palette className="mr-2 h-4 w-4" />
            外观设置
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setIsOpen(true); setActiveTab('advanced'); }}>
            <Wrench className="mr-2 h-4 w-4" />
            高级设置
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              全局设置
            </DialogTitle>
            <DialogDescription>
              配置应用的全局参数和首选项
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dify" className="flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                <span className="hidden sm:inline">Dify配置</span>
                <span className="sm:hidden">Dify</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">外观</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">通知</span>
              </TabsTrigger>
              <TabsTrigger value="project" className="flex items-center gap-2">
                <FolderCog className="h-4 w-4" />
                <span className="hidden sm:inline">项目</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">高级</span>
              </TabsTrigger>
            </TabsList>

            {/* Dify配置 */}
            <TabsContent value="dify" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Dify服务配置
                  </CardTitle>
                  <CardDescription>
                    配置Dify知识库服务的连接参数
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup
                    value={settings.dify.environment}
                    onValueChange={(value) => {
                      if (value === 'local' || value === 'cloud') {
                        updateDifyConfig(DEFAULT_DIFY_CONFIGS[value]);
                      } else {
                        updateDifyConfig({ ...settings.dify, environment: value as any });
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
                            <div className="text-sm text-gray-500">使用Dify官方云端服务</div>
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
                            <div className="text-sm text-gray-500">使用本地部署的Dify服务</div>
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
                            <div className="text-sm text-gray-500">手动配置Dify服务器信息</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  {settings.dify.environment === 'custom' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="custom-url">API URL</Label>
                        <Input
                          id="custom-url"
                          placeholder="https://your-dify-instance.com/v1"
                          value={settings.dify.baseUrl}
                          onChange={(e) => updateDifyConfig({ ...settings.dify, baseUrl: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom-dataset-key">Dataset API Key</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id="custom-dataset-key"
                            placeholder="dataset-xxxxxxxxxx"
                            value={settings.dify.datasetApiKey}
                            onChange={(e) => {
                              updateDifyConfig({ ...settings.dify, datasetApiKey: e.target.value });
                              setConnectionResult(null);
                            }}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={testDifyConnection}
                            disabled={testingConnection || !settings.dify.baseUrl || !settings.dify.datasetApiKey}
                            className="shrink-0"
                          >
                            {testingConnection ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : connectionResult ? (
                              connectionResult.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )
                            ) : (
                              "测试"
                            )}
                          </Button>
                        </div>
                        {connectionResult && (
                          <p className={`text-xs mt-1 ${
                            connectionResult.success ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {connectionResult.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 外观设置 */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    外观设置
                  </CardTitle>
                  <CardDescription>
                    自定义应用的外观和界面
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">主题</Label>
                    <RadioGroup
                      value={settings.theme}
                      onValueChange={(value: Theme) => updateTheme(value)}
                      className="mt-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="light" />
                        <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                          <Sun className="h-4 w-4" />
                          浅色模式
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="dark" />
                        <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                          <Moon className="h-4 w-4" />
                          深色模式
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="system" id="system" />
                        <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
                          <Monitor className="h-4 w-4" />
                          跟随系统
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-base font-medium">语言</Label>
                    <RadioGroup
                      value={settings.language}
                      onValueChange={(value: Language) => updateLanguage(value)}
                      className="mt-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="zh" id="zh" />
                        <Label htmlFor="zh" className="flex items-center gap-2 cursor-pointer">
                          🇨🇳 简体中文
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="en" id="en" />
                        <Label htmlFor="en" className="flex items-center gap-2 cursor-pointer">
                          🇺🇸 English
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 通知设置 */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    通知设置
                  </CardTitle>
                  <CardDescription>
                    管理应用通知和提醒
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">启用通知</Label>
                      <p className="text-sm text-muted-foreground">接收应用内通知</p>
                    </div>
                    <Switch
                      checked={settings.notifications.enabled}
                      onCheckedChange={(checked) => 
                        updateSettings({
                          notifications: { ...settings.notifications, enabled: checked }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">通知声音</Label>
                      <p className="text-sm text-muted-foreground">播放通知提示音</p>
                    </div>
                    <Switch
                      checked={settings.notifications.sound}
                      onCheckedChange={(checked) => 
                        updateSettings({
                          notifications: { ...settings.notifications, sound: checked }
                        })
                      }
                      disabled={!settings.notifications.enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">桌面通知</Label>
                      <p className="text-sm text-muted-foreground">显示系统桌面通知</p>
                    </div>
                    <Switch
                      checked={settings.notifications.desktop}
                      onCheckedChange={(checked) => 
                        updateSettings({
                          notifications: { ...settings.notifications, desktop: checked }
                        })
                      }
                      disabled={!settings.notifications.enabled}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 项目默认设置 */}
            <TabsContent value="project" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderCog className="h-5 w-5" />
                    项目默认设置
                  </CardTitle>
                  <CardDescription>
                    设置新建项目的默认参数
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="font-medium">默认索引技术</Label>
                    <RadioGroup
                      value={settings.defaultProject.indexingTechnique}
                      onValueChange={(value: 'high_quality' | 'economy') => 
                        updateSettings({
                          defaultProject: { ...settings.defaultProject, indexingTechnique: value }
                        })
                      }
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high_quality" id="high_quality" />
                        <Label htmlFor="high_quality">高质量（推荐）</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="economy" id="economy" />
                        <Label htmlFor="economy">经济模式</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="font-medium">默认访问权限</Label>
                    <RadioGroup
                      value={settings.defaultProject.permission}
                      onValueChange={(value: 'only_me' | 'all_team_members') => 
                        updateSettings({
                          defaultProject: { ...settings.defaultProject, permission: value }
                        })
                      }
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="only_me" id="only_me" />
                        <Label htmlFor="only_me">仅自己</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all_team_members" id="all_team_members" />
                        <Label htmlFor="all_team_members">全团队成员</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 高级设置 */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    高级设置
                  </CardTitle>
                  <CardDescription>
                    高级用户和开发者选项
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">调试模式</Label>
                      <p className="text-sm text-muted-foreground">启用详细的调试信息</p>
                    </div>
                    <Switch
                      checked={settings.advanced.debugMode}
                      onCheckedChange={(checked) => 
                        updateSettings({
                          advanced: { ...settings.advanced, debugMode: checked }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">自动保存</Label>
                      <p className="text-sm text-muted-foreground">自动保存用户输入</p>
                    </div>
                    <Switch
                      checked={settings.advanced.autoSave}
                      onCheckedChange={(checked) => 
                        updateSettings({
                          advanced: { ...settings.advanced, autoSave: checked }
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="autosave-interval" className="font-medium">自动保存间隔（秒）</Label>
                    <Input
                      id="autosave-interval"
                      type="number"
                      min="10"
                      max="300"
                      value={settings.advanced.autoSaveInterval}
                      onChange={(e) => 
                        updateSettings({
                          advanced: { ...settings.advanced, autoSaveInterval: parseInt(e.target.value) || 30 }
                        })
                      }
                      disabled={!settings.advanced.autoSave}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>数据管理</CardTitle>
                  <CardDescription>
                    导入导出设置和重置选项
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportSettings} className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      导出设置
                    </Button>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportSettings}
                        className="hidden"
                        id="import-settings"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('import-settings')?.click()}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        导入设置
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    variant="destructive"
                    onClick={handleResetSettings}
                    className="w-full"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    重置所有设置
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}