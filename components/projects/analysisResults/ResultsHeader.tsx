'use client';

import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Download, ChevronDown } from 'lucide-react';
import { ExportFormat } from '@/lib/export-utils';

interface ResultsHeaderProps {
  hasResults: boolean;
  onExport: (format: ExportFormat) => void;
}

export function ResultsHeader({ hasResults, onExport }: ResultsHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <CardTitle>三重一大分析结果</CardTitle>
        <CardDescription>
          提取的三重一大信息
        </CardDescription>
      </div>
      {hasResults && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              导出结果
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport('csv')}>
              导出为CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('xlsx')}>
              导出为Excel (XLSX)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
} 