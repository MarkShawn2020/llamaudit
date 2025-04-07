import React from 'react';
import { MeetingAnalysisResult } from '@/lib/api/document-api';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FileAnalysisTableProps {
  results: MeetingAnalysisResult[];
}

export default function FileAnalysisTable({ results }: FileAnalysisTableProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-gray-50">
        <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">暂无文件解析结果</p>
        <p className="text-gray-400 text-sm">请上传文件并点击"一键解析"按钮</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption>会议纪要文件解析结果</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">文件名</TableHead>
            <TableHead>会议时间</TableHead>
            <TableHead>文号</TableHead>
            <TableHead>会议议题</TableHead>
            <TableHead>事项类别</TableHead>
            <TableHead>涉及金额</TableHead>
            <TableHead>状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="truncate max-w-[120px]" title={result.fileName}>
                    {result.fileName}
                  </span>
                </div>
              </TableCell>
              <TableCell>{result.meetingTime || '-'}</TableCell>
              <TableCell>{result.meetingNumber || '-'}</TableCell>
              <TableCell>
                <span className="truncate max-w-[200px] block" title={result.meetingTopic}>
                  {result.meetingTopic || '-'}
                </span>
              </TableCell>
              <TableCell>
                {result.eventCategory ? (
                  <Badge variant="outline">{result.eventCategory}</Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>{result.amountInvolved || '-'}</TableCell>
              <TableCell>
                {renderStatus(result.status, result.error)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function renderStatus(status: MeetingAnalysisResult['status'], error?: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="text-yellow-600 bg-yellow-50">
          等待处理
        </Badge>
      );
    case 'processing':
      return (
        <div className="flex items-center gap-1 text-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">解析中...</span>
        </div>
      );
    case 'completed':
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span className="text-xs">已完成</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-1 text-red-600" title={error}>
          <AlertCircle className="h-3 w-3" />
          <span className="text-xs">解析失败</span>
        </div>
      );
    default:
      return null;
  }
} 