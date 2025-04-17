'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

type StatusType = 'pending' | 'processing' | 'completed' | 'error';

interface StatusBadgeProps {
  status: StatusType;
  error?: string;
}

export function StatusBadge({ status, error }: StatusBadgeProps) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
          <span className="h-2 w-2 rounded-full bg-yellow-500 mr-1"></span>
          等待处理
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          解析中...
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          {/* 已完成 */}
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200" title={error}>
          <XCircle className="h-3 w-3 mr-1" />
          解析失败
        </Badge>
      );
    default:
      return null;
  }
} 