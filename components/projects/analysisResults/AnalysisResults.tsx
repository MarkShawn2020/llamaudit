'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { exportAnalysisResults, ExportFormat } from '@/lib/export-utils';
import { FileAnalysisGroup } from '../types';
import { ResultsHeader } from './ResultsHeader';
import { CardView } from './CardView';
import { TableView } from './TableView';

interface AnalysisResultsProps {
  groupedResults: FileAnalysisGroup[];
  loading: boolean;
}

export function AnalysisResults({ groupedResults, loading }: AnalysisResultsProps) {
  const [activeView, setActiveView] = useState('card');

  const handleExport = (format: ExportFormat) => {
    if (groupedResults.length === 0) {
      toast.warning('没有可导出的数据');
      return;
    }

    try {
      exportAnalysisResults(groupedResults, format);
      toast.success(`已成功导出${format.toUpperCase()}格式文件`);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    }
  };

  return (
    <Card>
      <CardHeader>
        <ResultsHeader 
          hasResults={groupedResults.length > 0} 
          onExport={handleExport} 
        />
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 text-center flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
            <p>加载分析结果中...</p>
          </div>
        ) : groupedResults.length > 0 ? (
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
              <CardView groupedResults={groupedResults} />
            </TabsContent>

            <TabsContent value="table" className="mt-4">
              <TableView groupedResults={groupedResults} />
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