'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, FileUp, BarChart3, Building, Users, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { IMeeting, IKeyDecisionItem } from '@/types/analysis';

interface CardViewProps {
  meetings: IMeeting[];
  getCategoryName: (type: string) => string;
}

export function CardView({ meetings, getCategoryName }: CardViewProps) {
  // 根据决策项类型获取样式类
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

  return (
    <div className="space-y-6 max-h-[500px] overflow-auto pr-2">
      {meetings.map((meeting, meetingIndex) => {
        const hasDecisions = meeting.keyDecisionItems && meeting.keyDecisionItems.length > 0;
        
        return (
          <Card key={`meeting-${meetingIndex}`} className="overflow-hidden">
            <CardHeader className="bg-muted/30 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">{meeting.documentName || meeting.documentNo || `会议 ${meetingIndex + 1}`}</CardTitle>
                  {meeting.isTripleOneMeeting && (
                    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                      三重一大
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{meeting.meetingDate ? formatDate(meeting.meetingDate) : '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>{hasDecisions ? `${meeting.keyDecisionItems.length} 项决策` : '无决策项'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{meeting.documentNo || '-'}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {hasDecisions ? (
                <Accordion type="multiple" className="w-full">
                  {meeting.keyDecisionItems.map((item, index) => (
                    <AccordionItem key={`meeting-${meetingIndex}-item-${index}`} value={`item-${index}`}>
                      <AccordionTrigger className="px-6 py-3 hover:bg-muted/20 hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <Badge 
                            variant="outline" 
                            className={`${getCategoryClass(item.categoryType)} px-2`}
                          >
                            {getCategoryName(item.categoryType)}
                          </Badge>
                          <span className="font-medium">{item.details.substring(0, 30)}{item.details.length > 30 ? '...' : ''}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pt-2 pb-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-1">类别</div>
                            <div>{getCategoryName(item.categoryType)}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">会议编号</div>
                            <div>{meeting.documentNo || '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">金额</div>
                            <div>{item.amount || '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">会议日期</div>
                            <div>{meeting.meetingDate ? formatDate(meeting.meetingDate) : '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm font-medium mb-1">会议主题</div>
                            <div>{meeting.meetingTopic || '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm font-medium mb-1">事项详情</div>
                            <div>{item.details || '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm font-medium mb-1">会议结论</div>
                            <div>{meeting.conclusion || '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">相关部门</div>
                            <div>{item.departments && item.departments.length > 0 ? item.departments.join(', ') : '-'}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">相关人员</div>
                            <div>{item.personnel && item.personnel.length > 0 ? item.personnel.join(', ') : '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm font-medium mb-1">决策依据</div>
                            <div>{item.decisionBasis || '-'}</div>
                          </div>
                          {item.originalText && (
                            <div className="col-span-2">
                              <div className="text-sm font-medium mb-1">原文内容</div>
                              <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md whitespace-pre-wrap">
                                {item.originalText}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <p>本会议暂无三重一大决策项</p>
                  {meeting.summary && (
                    <div className="mt-4 text-left">
                      <div className="text-sm font-medium mb-1">会议摘要</div>
                      <div className="text-sm p-3 bg-muted/20 rounded-md">{meeting.summary}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      
      {(!meetings || meetings.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg">暂无会议记录</p>
          <p className="text-sm mt-2">请选择文件并点击"开始分析"</p>
        </div>
      )}
    </div>
  );
} 