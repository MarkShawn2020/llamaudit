'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, FileUp, BarChart3, Building, Users, FileText } from 'lucide-react';
import { AnalysisResult } from '../types';
import { formatDate, formatFileSize } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { getFileIcon } from '../utils/fileIcons';
// 分析结果类型

interface ResultItem {
  category: string;
  result: AnalysisResult;
}

interface CardViewProps {
  groupedResults: ResultItem[];
}

export function CardView({ groupedResults }: CardViewProps) {
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
    <div className="space-y-6 max-h-[500px] overflow-auto pr-2">
      {Object.entries(groupedByFile).map(([fileId, items]) => {
        // 从第一个结果中获取文件ID
        const firstResult = items[0]?.result;
        if (!firstResult) return null;

        return (
          <Card key={fileId} className="overflow-hidden">
            <CardHeader className="bg-muted/30 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {/* 显示文件名 - 这里使用固定图标，因为我们没有文件名 */}
                  <FileText className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">文件 {fileId.substring(0, 8)}</CardTitle>
                  <StatusBadge status="completed" error={undefined} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{firstResult.createdAt ? formatDate(String(firstResult.createdAt)) : '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>{items.length} 项分析结果</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Accordion type="multiple" className="w-full">
                {items.map((item, index) => {
                  const result = item.result;
                  return (
                    <AccordionItem key={`${fileId}-${index}`} value={`item-${index}`}>
                      <AccordionTrigger className="px-6 py-3 hover:bg-muted/20 hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <Badge 
                            variant="outline" 
                            className={`${getCategoryClass(item.category)} px-2`}
                          >
                            {item.category}
                          </Badge>
                          <span className="font-medium">{result.meetingTopic || '无主题'}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pt-2 pb-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-1">类别</div>
                            <div>{item.category}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">会议编号</div>
                            <div>{result.meetingNumber || '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">金额</div>
                            <div>{result.amountInvolved ? `￥${result.amountInvolved.toLocaleString()}` : '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">创建时间</div>
                            <div>{result.createdAt ? formatDate(String(result.createdAt)) : '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm font-medium mb-1">会议主题</div>
                            <div>{result.meetingTopic || '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm font-medium mb-1">事项详情</div>
                            <div>{result.eventDetails || '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm font-medium mb-1">会议结论</div>
                            <div>{result.meetingConclusion || '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">相关部门</div>
                            <div>{result.relatedDepartments || '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">相关人员</div>
                            <div>{result.relatedPersonnel || '-'}</div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 