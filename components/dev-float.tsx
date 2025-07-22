'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, Code, Database, Server, Settings, Shield, Cloud, Key, HardDrive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDifyConfig } from '@/contexts/dify-config-context';

export function DevFloat() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { config } = useDifyConfig();

  // 只在开发模式下显示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // 检查环境变量是否配置(客户端只能访问NEXT_PUBLIC_开头的)
  const checkEnvVar = (name: string) => {
    return typeof window !== 'undefined' && name in process.env;
  };

  const configSections = [
    {
      title: 'AI & Dify 服务',
      icon: <Server className="h-4 w-4" />,
      items: [
        {
          label: 'Dify Environment',
          value: config.environment,
          icon: <Server className="h-3 w-3" />,
          status: config.environment === 'local' ? 'warning' : config.environment === 'cloud' ? 'success' : 'secondary'
        },
        {
          label: 'Dify URL',
          value: config.baseUrl.replace('https://', '').replace('http://', ''),
          icon: <Code className="h-3 w-3" />,
          status: 'secondary'
        },
        {
          label: 'API Key',
          value: config.apiKey.slice(0, 8) + '...',
          icon: <Key className="h-3 w-3" />,
          status: 'secondary'
        }
      ]
    },
    {
      title: '数据库',
      icon: <Database className="h-4 w-4" />,
      items: [
        {
          label: 'Database',
          value: 'PostgreSQL',
          icon: <Database className="h-3 w-3" />,
          status: 'success'
        },
        {
          label: 'DB Host',
          value: 'localhost:5432',
          icon: <Server className="h-3 w-3" />,
          status: 'success'
        },
        {
          label: 'DB Name',
          value: 'llamaudit',
          icon: <Database className="h-3 w-3" />,
          status: 'success'
        },
        {
          label: 'ORM',
          value: 'Drizzle',
          icon: <Code className="h-3 w-3" />,
          status: 'success'
        }
      ]
    },
    {
      title: '认证系统',
      icon: <Shield className="h-4 w-4" />,
      items: [
        {
          label: 'Auth System',
          value: 'JWT + bcrypt',
          icon: <Shield className="h-3 w-3" />,
          status: 'success'
        },
        {
          label: 'Session Duration',
          value: '24 hours',
          icon: <Settings className="h-3 w-3" />,
          status: 'secondary'
        },
        {
          label: 'Cookie Secure',
          value: 'HTTPOnly + Secure',
          icon: <Key className="h-3 w-3" />,
          status: 'success'
        }
      ]
    },
    {
      title: '文件存储',
      icon: <Cloud className="h-4 w-4" />,
      items: [
        {
          label: 'Storage Provider',
          value: 'Aliyun OSS',
          icon: <Cloud className="h-3 w-3" />,
          status: process.env.NEXT_PUBLIC_OSS_REGION ? 'success' : 'warning'
        },
        {
          label: 'OSS Region',
          value: process.env.NEXT_PUBLIC_OSS_REGION || 'Not Set',
          icon: <HardDrive className="h-3 w-3" />,
          status: process.env.NEXT_PUBLIC_OSS_REGION ? 'success' : 'error'
        },
        {
          label: 'Upload Method',
          value: 'Signed URL',
          icon: <Key className="h-3 w-3" />,
          status: 'secondary'
        }
      ]
    },
    {
      title: '运行环境',
      icon: <Code className="h-4 w-4" />,
      items: [
        {
          label: 'Environment',
          value: process.env.NODE_ENV || 'unknown',
          icon: <Code className="h-3 w-3" />,
          status: 'success'
        },
        {
          label: 'Next.js Mode',
          value: 'App Router',
          icon: <Settings className="h-3 w-3" />,
          status: 'success'
        }
      ]
    }
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success': return 'default';
      case 'warning': return 'secondary';  
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isExpanded ? (
        <Card className="w-96 max-h-[80vh] overflow-y-auto shadow-lg border-2 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                开发者信息面板
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="hover:bg-gray-100 p-1 rounded"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {configSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-1">
                  {section.icon}
                  {section.title}
                </div>
                <div className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-600">
                        {item.icon}
                        {item.label}:
                      </div>
                      <Badge 
                        variant={getStatusVariant(item.status)}
                        className="text-xs px-2 py-0.5 max-w-32 truncate"
                        title={item.value}
                      >
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="pt-2 border-t text-xs text-gray-500">
              <div className="flex justify-between items-center">
                <span>Current Time:</span>
                <span className="font-mono">{new Date().toLocaleTimeString('zh-CN')}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span>Process ID:</span>
                <span className="font-mono">{typeof window !== 'undefined' ? 'Client' : 'Server'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 group"
          title="开发者信息面板"
        >
          <ChevronUp className="h-4 w-4 group-hover:animate-bounce" />
        </button>
      )}
    </div>
  );
}