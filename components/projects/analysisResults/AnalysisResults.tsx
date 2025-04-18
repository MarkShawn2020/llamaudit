'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { exportAnalysisResults, ExportFormat } from '@/lib/export-utils';
import { AnalysisResult, GroupedResults } from '../types';
import { ResultsHeader } from './ResultsHeader';
import { CardView } from './CardView';
import { TableView } from './TableView';

interface ResultItem {
  category: string;
  result: AnalysisResult;
}

interface AnalysisResultsProps {
  groupedResults: GroupedResults;
  loading: boolean;
}

export function AnalysisResults({ groupedResults, loading }: AnalysisResultsProps) {
  const [activeView, setActiveView] = useState('card');

  const handleExport = (format: ExportFormat) => {
    if (!hasResults) {
      toast.warning('没有可导出的数据');
      return;
    }

    try {
      // 将结果转换为导出所需的格式
      const exportData = [
        // 创建一个文件分析组来满足导出函数需要的格式
        {
          fileId: 'combined-results',
          fileName: '三重一大分析结果汇总',
          status: 'completed' as const,
          results: [
            ...groupedResults.majorDecisions,
            ...groupedResults.personnelAppointments,
            ...groupedResults.majorProjects,
            ...groupedResults.largeAmounts
          ]
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
  const hasResults = (
    groupedResults.majorDecisions.length > 0 ||
    groupedResults.personnelAppointments.length > 0 ||
    groupedResults.majorProjects.length > 0 ||
    groupedResults.largeAmounts.length > 0
  );
  
  // 将分组结果转换为展示所需格式
  const adaptedResults: ResultItem[] = [
    ...groupedResults.majorDecisions.map(item => ({
      category: '重大决策',
      result: item
    })),
    ...groupedResults.personnelAppointments.map(item => ({
      category: '重要干部任免',
      result: item
    })),
    ...groupedResults.majorProjects.map(item => ({
      category: '重大项目',
      result: item
    })),
    ...groupedResults.largeAmounts.map(item => ({
      category: '大额资金',
      result: item
    }))
  ];

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