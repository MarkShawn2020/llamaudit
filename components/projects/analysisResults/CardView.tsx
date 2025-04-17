'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, FileUp, BarChart3, Building, Users } from 'lucide-react';
import { FileAnalysisGroup } from '../types';
import { formatDate, formatFileSize } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { getFileIcon } from '../utils/fileIcons';
import { MeetingAnalysisResult } from '@/lib/api/document-api';

interface CardViewProps {
  groupedResults: FileAnalysisGroup[];
}

export function CardView({ groupedResults }: CardViewProps) {
  return (
    <div className="space-y-6 max-h-[500px] overflow-auto pr-2">
      {groupedResults.map((group) => (
        <Card key={group.fileId} className="overflow-hidden">
          <CardHeader className="bg-muted/30 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {getFileIcon(group.fileName)}
                <CardTitle className="text-lg">{group.fileName}</CardTitle>
                <StatusBadge status={group.status} error={group.error} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{group.uploadDate ? formatDate(group.uploadDate) : '-'}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileUp className="h-4 w-4" />
                <span>{group.fileSize ? formatFileSize(group.fileSize) : '-'}</span>
              </div>
              <div className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span>{group.results.length} 项三重一大事项</span>
              </div>
            </div>
          </CardHeader>
          {group.status === 'completed' ? (
            <CardContent className="p-0">
              {group.results.length > 0 ? (
                <Accordion type="multiple" className="w-full">
                  {group.results.map((result: MeetingAnalysisResult, index: number) => (
                    <AccordionItem key={`${group.fileId}-${index}`} value={`item-${index}`}>
                      <AccordionTrigger className="px-6 py-3 hover:bg-muted/20 hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 px-2">
                            {result.eventCategory || '未分类'}
                          </Badge>
                          <span className="font-medium">{result.meetingTopic || '未知议题'}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pt-2 pb-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-1">会议时间</div>
                            <div>{result.meetingTime || '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">文号</div>
                            <div>{result.meetingNumber || '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">事项类别</div>
                            <div>{result.eventCategory || '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">涉及金额</div>
                            <div>{result.amountInvolved || '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm font-medium mb-1">会议议题</div>
                            <div>{result.meetingTopic || '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm font-medium mb-1">事项详情</div>
                            <div>{result.eventDetails || '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">相关部门</div>
                            <div className="flex items-center gap-1">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <span>{result.relatedDepartments || '-'}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">相关人员</div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{result.relatedPersonnel || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>未检测到三重一大相关内容</p>
                </div>
              )}
            </CardContent>
          ) : group.status === 'error' ? (
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>分析失败：{group.error || '未知错误'}</p>
            </CardContent>
          ) : (
            <CardContent className="py-8 text-center">
              <div className="flex justify-center items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <p>正在分析中...</p>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
} 