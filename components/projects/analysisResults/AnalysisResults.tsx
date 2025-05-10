'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { exportMeetings, ExportFormat } from '@/lib/export-utils';
import { IMeeting, IKeyDecisionItem } from '@/types/analysis';
import { ResultsHeader } from './ResultsHeader';
import { CardView } from './CardView';
import { TableView } from './TableView';

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
      // 直接导出会议数据
      exportMeetings(meetings, format);
      toast.success(`已成功导出${format.toUpperCase()}格式文件`);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    }
  };

  // 检查是否有任何结果
  const hasResults = !!meetings && meetings.length > 0 &&
    meetings.some(meeting => meeting.keyDecisionItems && meeting.keyDecisionItems.length > 0);

  // 获取三重一大类型的中文名称
  function getCategoryName(type: string): string {
    switch (type) {
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

        <TableView meetings={meetings} getCategoryName={getCategoryName} />

      </CardContent>
    </Card>
  );
} 