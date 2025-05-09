import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';


/**
 * 文件分析结果分组接口
 */
export interface FileAnalysisGroup {
  fileId: string;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  uploadDate?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  results: MeetingAnalysisResult[];
}

/**
 * 导出格式类型
 */
export type ExportFormat = 'csv' | 'xlsx';

/**
 * 获取导出文件名
 * @param format 文件格式
 * @returns 文件名
 */
function getExportFileName(format: ExportFormat): string {
  const date = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  return `三重一大分析结果_${date}.${format}`;
}

/**
 * 将三重一大分析结果转换为表格数据
 * @param groups 按文件分组的分析结果
 * @returns 表格数据
 */
function convertToTableData(groups: FileAnalysisGroup[]): Record<string, any>[] {
  const rows: Record<string, any>[] = [];

  groups.forEach(group => {
    if (group.results.length === 0) return;

    group.results.forEach((result, index) => {
      rows.push({
        '文件名': group.fileName,
        '文件上传日期': group.uploadDate || '-',
        '会议时间': result.meetingTime || '-',
        '文号': result.meetingNumber || '-',
        '会议议题': result.meetingTopic || '-',
        '会议结论': result.meetingConclusion || '-',
        '内容摘要': result.contentSummary || '-',
        '事项类别': result.eventCategory || '-',
        '事项详情': result.eventDetails || '-',
        '涉及金额': result.amountInvolved || '-',
        '相关部门': result.relatedDepartments || '-',
        '相关人员': result.relatedPersonnel || '-',
        '决策依据': result.decisionBasis || '-'
      });
    });
  });

  return rows;
}

/**
 * 导出CSV文件
 * @param data 表格数据
 */
function exportCSV(data: Record<string, any>[]): void {
  // 使用xlsx库将数据转换为CSV格式
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  
  // 创建Blob对象
  const blob = new Blob(["\uFEFF" + csvOutput], { type: 'text/csv;charset=utf-8;' });
  
  // 保存文件
  saveAs(blob, getExportFileName('csv'));
}

/**
 * 导出XLSX文件
 * @param data 表格数据
 */
function exportXLSX(data: Record<string, any>[]): void {
  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  
  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, '三重一大分析结果');
  
  // 写入Excel文件并保存
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // 保存文件
  saveAs(blob, getExportFileName('xlsx'));
}

/**
 * 导出三重一大分析结果
 * @param groups 按文件分组的分析结果
 * @param format 导出格式
 */
export function exportAnalysisResults(groups: FileAnalysisGroup[], format: ExportFormat): void {
  const tableData = convertToTableData(groups);
  
  if (tableData.length === 0) {
    console.warn('没有可导出的数据');
    return;
  }
  
  switch (format) {
    case 'csv':
      exportCSV(tableData);
      break;
    case 'xlsx':
      exportXLSX(tableData);
      break;
    default:
      console.error(`不支持的导出格式: ${format}`);
  }
} 