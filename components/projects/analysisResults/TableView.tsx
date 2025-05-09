'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { AnalysisResult } from '../types';
import { getFileIcon } from '../utils/fileIcons';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '@/lib/utils';
import { IMeeting } from '@/types/analysis';

interface ResultItem {
  category: string;
  result: AnalysisResult;
}

interface TableViewProps {
  groupedResults: ResultItem[];
  // Note: We're keeping the same interface for backward compatibility
  // even though we're now working with the IMeeting structure under the hood
}

export function TableView({ groupedResults }: TableViewProps) {
  // 按文件ID对结果分组
  const groupedByFile: Record<string, ResultItem[]> = {};
  groupedResults.forEach((item) => {
    const fileId = item.result.fileId;
    if (!groupedByFile[fileId]) {
      groupedByFile[fileId] = [];
    }
    groupedByFile[fileId].push(item);
  });

  const getCategoryClass = (category: string) => {
    switch (category) {
      case '重大决策':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case '重要干部任免':
        return 'bg-purple-50 text-purple-600 border-purple-200';
      case '重大项目':
        return 'bg-green-50 text-green-600 border-green-200';
      case '大额资金':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="rounded-md border overflow-x-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px] sticky left-0 bg-white">文件/会议</TableHead>
            <TableHead>分类</TableHead>
            <TableHead className="min-w-[200px]">会议主题</TableHead>
            <TableHead>事项详情</TableHead>
            <TableHead>金额</TableHead>
            <TableHead>会议编号</TableHead>
            <TableHead>会议时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedByFile).flatMap(([fileId, items]) => 
            items.map((item, index) => {
              const result = item.result;
              return (
                <TableRow key={`${fileId}-${index}`}>
                  <TableCell className="font-medium sticky left-0 bg-white">
                    {index === 0 ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="truncate max-w-[140px]" title={`编号: ${fileId}`}>
                          {fileId.includes('meeting-') ? '会议: ' + fileId.replace('meeting-', '') : fileId.substring(0, 8)}
                        </span>
                      </div>
                    ) : (
                      <div className="pl-6 text-xs text-muted-foreground italic">
                        同上文件
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`${getCategoryClass(item.category)} whitespace-nowrap`}
                    >
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]" title={result.meetingTopic || ''}>
                      <span className="line-clamp-2">{result.meetingTopic || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <span className="line-clamp-2" title={result.eventDetails || ''}>
                        {result.eventDetails || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {result.amountInvolved ? `￥${result.amountInvolved.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell>{result.meetingNumber || '-'}</TableCell>
                  <TableCell>{result.meetingTime ? formatDate(String(result.meetingTime)) : '-'}</TableCell>
                </TableRow>
              );
            })
          )}
          {Object.keys(groupedByFile).length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                暂无分析结果
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 