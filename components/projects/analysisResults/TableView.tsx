'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar } from 'lucide-react';
import { getFileIcon } from '../utils/fileIcons';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '@/lib/utils';
import { IMeeting, IKeyDecisionItem } from '@/types/analysis';

interface TableViewProps {
  meetings: IMeeting[];
  getCategoryName: (type: string) => string;
}

export function TableView({ meetings, getCategoryName }: TableViewProps) {
  const getCategoryClass = (categoryType: string) => {
    switch (categoryType) {
      case 'majorDecision':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'personnelAppointment':
        return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'majorProject':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'largeAmount':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  // 没有会议数据
  if (!meetings || meetings.length === 0) {
    return (
      <div className="rounded-md border overflow-x-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px] sticky left-0 bg-white">会议信息</TableHead>
              <TableHead>分类</TableHead>
              <TableHead className="min-w-[200px]">会议主题</TableHead>
              <TableHead>事项详情</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>会议编号</TableHead>
              <TableHead>会议时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                暂无分析结果
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px] sticky left-0 bg-white">会议信息</TableHead>
            <TableHead>分类</TableHead>
            <TableHead className="min-w-[200px]">会议主题</TableHead>
            <TableHead>事项详情</TableHead>
            <TableHead>金额</TableHead>
            <TableHead>会议编号</TableHead>
            <TableHead>会议时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {meetings.flatMap((meeting, meetingIndex) => {
            // 如果没有决策项，显示一行会议基本信息
            if (!meeting.keyDecisionItems || meeting.keyDecisionItems.length === 0) {
              return [
                <TableRow key={`meeting-${meetingIndex}`}>
                  <TableCell className="font-medium sticky left-0 bg-white">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="truncate max-w-[140px]" title={meeting.documentName}>
                        {meeting.documentName || meeting.documentNo || `会议 ${meetingIndex + 1}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">未分类</Badge></TableCell>
                  <TableCell>
                    <div className="max-w-[200px]" title={meeting.meetingTopic}>
                      <span className="line-clamp-2">{meeting.meetingTopic || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-muted-foreground">无决策项</span></TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>{meeting.documentNo || '-'}</TableCell>
                  <TableCell>{meeting.meetingDate ? formatDate(meeting.meetingDate) : '-'}</TableCell>
                </TableRow>
              ];
            }
            
            // 有决策项，每个决策项显示一行
            return meeting.keyDecisionItems.map((item, itemIndex) => (
              <TableRow key={`meeting-${meetingIndex}-item-${itemIndex}`}>
                <TableCell className="font-medium sticky left-0 bg-white">
                  {itemIndex === 0 ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="truncate max-w-[140px]" title={meeting.documentName}>
                        {meeting.documentName || meeting.documentNo || `会议 ${meetingIndex + 1}`}
                      </span>
                    </div>
                  ) : (
                    <div className="pl-6 text-xs text-muted-foreground italic">
                      同上会议
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={`${getCategoryClass(item.categoryType)} whitespace-nowrap`}
                  >
                    {getCategoryName(item.categoryType)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px]" title={meeting.meetingTopic}>
                    <span className="line-clamp-2">{meeting.meetingTopic || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px]">
                    <span className="line-clamp-2" title={item.details}>
                      {item.details || '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{item.amount || '-'}</TableCell>
                <TableCell>{meeting.documentNo || '-'}</TableCell>
                <TableCell>{meeting.meetingDate ? formatDate(meeting.meetingDate) : '-'}</TableCell>
              </TableRow>
            ));
          })}
          {meetings.length === 0 && (
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