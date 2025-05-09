'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { exportAnalysisResults, ExportFormat } from '@/lib/export-utils';
import { AnalysisResult } from '../types';
import { IMeeting, IKeyDecisionItem } from '@/types/analysis';
import { ResultsHeader } from './ResultsHeader';
import { CardView } from './CardView';
import { TableView } from './TableView';

// 旧版数据项，用于兼容现有组件
interface ResultItem {
  category: string;
  result: AnalysisResult;
}

// 新版接口定义
interface AnalysisResultsProps {
  meetings: IMeeting[];
  loading: boolean;
}

export function AnalysisResults({ meetings, loading }: AnalysisResultsProps) {
  const [activeView, setActiveView] = useState('card');

  const handleExport = (format: ExportFormat) => {
    if (!hasResults) {
      toast.warning('没有可导出的数据');
      return;
    }

    try {
      // 将会议结果转换为导出所需的格式
      // 由于exportAnalysisResults函数预期的是旧格式，这里需要进行转换
      const allKeyDecisions: AnalysisResult[] = [];
      
      // 从每个会议中提取三重一大事项
      meetings.forEach(meeting => {
        if (meeting.keyDecisionItems && meeting.keyDecisionItems.length > 0) {
          // 将每个决策项转换为旧的AnalysisResult格式
          meeting.keyDecisionItems.forEach(item => {
            // 构建一个临时的AnalysisResult对象以满足导出函数需求
            const tempResult: Partial<AnalysisResult> = {
              fileId: 'meeting-' + meeting.documentNo,
              meetingTime: meeting.meetingDate ? new Date(meeting.meetingDate) : undefined,
              meetingNumber: meeting.documentNo,
              meetingTopic: meeting.meetingTopic,
              meetingConclusion: meeting.conclusion,
              contentSummary: meeting.summary,
              eventCategory: item.categoryType,
              eventDetails: item.details,
              amountInvolved: item.amount ? parseFloat(item.amount.replace('￥', '')).toString() : undefined,
              relatedDepartments: item.departments?.join(','),
              relatedPersonnel: item.personnel?.join(','),
              decisionBasis: item.decisionBasis,
              originalText: item.originalText,
              status: 'completed'
            };
            
            allKeyDecisions.push(tempResult as AnalysisResult);
          });
        }
      });
      
      const exportData = [
        // 创建一个文件分析组来满足导出函数需要的格式
        {
          fileId: 'combined-results',
          fileName: '三重一大分析结果汇总',
          status: 'completed' as const,
          results: allKeyDecisions
        }
      ];
      
      exportAnalysisResults(exportData, format);
      toast.success(`已成功导出${format.toUpperCase()}格式文件`);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    }
  };

  // 检查是否有任何结果
  const hasResults = !!meetings && meetings.length > 0 && 
    meetings.some(meeting => meeting.keyDecisionItems && meeting.keyDecisionItems.length > 0);
  
  // 将新的会议结构转换为旧的展示格式以兼容现有组件
  const adaptedResults: ResultItem[] = !meetings ? [] : 
    meetings.flatMap(meeting => {
      if (!meeting.keyDecisionItems || meeting.keyDecisionItems.length === 0) {
        return [];
      }
      
      return meeting.keyDecisionItems.map(item => {
        // 为每个决策项创建一个虚拟的AnalysisResult
        const virtualResult: Partial<AnalysisResult> = {
          id: `${meeting.documentNo}-${item.categoryType}`,
          fileId: `meeting-${meeting.documentNo}`,
          meetingTime: meeting.meetingDate ? new Date(meeting.meetingDate) : undefined,
          meetingNumber: meeting.documentNo,
          meetingTopic: meeting.meetingTopic, 
          meetingConclusion: meeting.conclusion,
          contentSummary: meeting.summary,
          // 将决策项类型映射到三重一大分类
          eventCategory: getCategoryFromType(item.categoryType),
          eventDetails: item.details,
          amountInvolved: item.amount,
          relatedDepartments: item.departments?.join(','), 
          relatedPersonnel: item.personnel?.join(','),
          decisionBasis: item.decisionBasis,
          originalText: item.originalText,
          status: 'completed'
        };
        
        return {
          category: getCategoryFromType(item.categoryType),
          result: virtualResult as AnalysisResult
        };
      });
    });
  
  // 将决策项类型映射为中文类别名称
  function getCategoryFromType(type: string): string {
    switch(type) {
      case 'majorDecision': return '重大决策';
      case 'personnelAppointment': return '重要干部任免';
      case 'majorProject': return '重大项目';
      case 'largeAmount': return '大额资金';
      default: return '其他';
    }
  }

  return (
    <Card>
      <CardHeader>
        <ResultsHeader 
          hasResults={hasResults} 
          onExport={handleExport} 
        />
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 text-center flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
            <p>加载分析结果中...</p>
          </div>
        ) : hasResults ? (
          <Tabs 
            defaultValue="card" 
            value={activeView}
            onValueChange={setActiveView}
            className="w-full p-6 pt-0"
          >
            <div className="flex justify-between items-center border-b pb-4">
              <TabsList>
                <TabsTrigger value="card">卡片视图</TabsTrigger>
                <TabsTrigger value="table">表格视图</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="card" className="mt-4">
              <CardView groupedResults={adaptedResults} />
            </TabsContent>

            <TabsContent value="table" className="mt-4">
              <TableView groupedResults={adaptedResults} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="p-6 text-center text-muted-foreground flex flex-col items-center">
            <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg mb-2">暂无分析结果</p>
            <p className="text-sm">请选择文件并点击"开始分析"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 