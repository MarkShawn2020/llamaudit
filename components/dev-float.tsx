'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, Code, Database, Server, Settings } from 'lucide-react';
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

  const configInfo = [
    {
      label: 'Dify Environment',
      value: config.environment,
      icon: <Server className="h-3 w-3" />,
      status: config.environment === 'local' ? 'warning' : config.environment === 'cloud' ? 'success' : 'secondary'
    },
    {
      label: 'Dify URL',
      value: config.baseUrl,
      icon: <Code className="h-3 w-3" />,
      status: 'secondary'
    },
    {
      label: 'API Key',
      value: config.apiKey.slice(0, 8) + '...',
      icon: <Settings className="h-3 w-3" />,
      status: 'secondary'
    },
    {
      label: 'Node Environment',
      value: process.env.NODE_ENV || 'unknown',
      icon: <Database className="h-3 w-3" />,
      status: 'success'
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
        <Card className="w-80 shadow-lg border-2 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                开发者信息
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="hover:bg-gray-100 p-1 rounded"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {configInfo.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-600">
                  {item.icon}
                  {item.label}:
                </div>
                <Badge 
                  variant={getStatusVariant(item.status)}
                  className="text-xs px-2 py-0.5"
                >
                  {item.value}
                </Badge>
              </div>
            ))}
            
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500 text-center">
                当前时间: {new Date().toLocaleTimeString('zh-CN')}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}