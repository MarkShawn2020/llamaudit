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
import { Loader2, CheckCircle, AlertCircle, FileText, Link } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
    <div className="overflow-x-auto w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">文件名</TableHead>
            <TableHead className="w-[120px]">会议时间</TableHead>
            <TableHead className="w-[100px]">文号</TableHead>
            <TableHead className="w-[200px]">会议议题</TableHead>
            <TableHead className="w-[100px]">事项类别</TableHead>
            <TableHead className="w-[100px]">涉及金额</TableHead>
            <TableHead className="w-[100px]">状态</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate max-w-[160px]" title={result.fileName}>
                    {result.fileName}
                  </span>
                </div>
              </TableCell>
              <TableCell>{result.meetingTime || '-'}</TableCell>
              <TableCell>{result.meetingNumber || '-'}</TableCell>
              <TableCell>
                <span className="truncate max-w-[160px] block" title={result.meetingTopic}>
                  {result.meetingTopic || '-'}
                </span>
              </TableCell>
              <TableCell>
                {result.eventCategory ? (
                  <Badge variant="outline" className="whitespace-nowrap">
                    {result.eventCategory}
                  </Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>{result.amountInvolved || '-'}</TableCell>
              <TableCell>
                {renderStatus(result.status, result.error)}
              </TableCell>
              <TableCell>
                {result.status === 'completed' && (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Link className="h-4 w-4" />
                    <span className="sr-only">查看详情</span>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableCaption>共 {results.length} 个文件分析结果</TableCaption>
      </Table>
    </div>
  );
}

function renderStatus(status: MeetingAnalysisResult['status'], error?: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="text-yellow-600 bg-yellow-50 whitespace-nowrap">
          等待处理
        </Badge>
      );
    case 'processing':
      return (
        <div className="flex items-center gap-1 text-blue-600 whitespace-nowrap">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">解析中...</span>
        </div>
      );
    case 'completed':
      return (
        <div className="flex items-center gap-1 text-green-600 whitespace-nowrap">
          <CheckCircle className="h-3 w-3" />
          <span className="text-xs">已完成</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-1 text-red-600 whitespace-nowrap" title={error}>
          <AlertCircle className="h-3 w-3" />
          <span className="text-xs">解析失败</span>
        </div>
      );
    default:
      return null;
  }
} 