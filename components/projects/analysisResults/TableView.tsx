'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MeetingAnalysisResult } from '@/lib/api/document-api';
import { FileAnalysisGroup } from '../types';
import { getFileIcon } from '../utils/fileIcons';
import { StatusBadge } from './StatusBadge';

interface TableViewProps {
  groupedResults: FileAnalysisGroup[];
}

export function TableView({ groupedResults }: TableViewProps) {
  return (
    <div className="rounded-md border overflow-x-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px] sticky left-0 bg-white">文件名</TableHead>
            <TableHead>事项类别</TableHead>
            <TableHead className="min-w-[200px]">会议议题</TableHead>
            <TableHead>涉及金额</TableHead>
            <TableHead>相关部门</TableHead>
            <TableHead>相关人员</TableHead>
            <TableHead>会议时间</TableHead>
            <TableHead>文号</TableHead>
            <TableHead className="w-[100px]">状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedResults.flatMap((group) =>
            group.results.length > 0 ?
              group.results.map((result: MeetingAnalysisResult, index: number) => (
                <TableRow key={`${group.fileId}-${index}`}>
                  <TableCell className="font-medium sticky left-0 bg-white">
                    {index === 0 ? (
                      <div className="flex items-center gap-2">
                        {getFileIcon(group.fileName)}
                        <span className="truncate max-w-[140px]" title={group.fileName}>
                          {group.fileName}
                        </span>
                      </div>
                    ) : (
                      <div className="pl-6 text-xs text-muted-foreground italic">
                        同上文件
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 whitespace-nowrap">
                      {result.eventCategory || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]" title={result.meetingTopic}>
                      <span className="line-clamp-2">{result.meetingTopic || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{result.amountInvolved || '-'}</TableCell>
                  <TableCell>
                    <div className="max-w-[120px]">
                      <span className="line-clamp-2" title={result.relatedDepartments}>
                        {result.relatedDepartments || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[120px]">
                      <span className="line-clamp-2" title={result.relatedPersonnel}>
                        {result.relatedPersonnel || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{result.meetingTime || '-'}</TableCell>
                  <TableCell>{result.meetingNumber || '-'}</TableCell>
                  <TableCell>
                    {index === 0 ? (
                      <StatusBadge status={group.status} error={group.error} />
                    ) : (
                      <div className="text-xs text-muted-foreground italic">同上</div>
                    )}
                  </TableCell>
                </TableRow>
              ))
              : (
                <TableRow key={group.fileId}>
                  <TableCell className="font-medium sticky left-0 bg-white">
                    <div className="flex items-center gap-2">
                      {getFileIcon(group.fileName)}
                      <span className="truncate max-w-[140px]" title={group.fileName}>
                        {group.fileName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {group.status === 'completed' ? '未检测到三重一大相关内容' : ''}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={group.status} error={group.error} />
                  </TableCell>
                </TableRow>
              )
          )}
        </TableBody>
      </Table>
    </div>
  );
} 