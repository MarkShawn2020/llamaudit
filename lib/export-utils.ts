import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { IMeeting, IKeyDecisionItem } from '@/types/analysis';


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
 * 将新版会议和决策项数据转换为表格数据
 * @param meetings 会议列表
 * @returns 表格数据
 */
function convertMeetingsToTableData(meetings: IMeeting[]): Record<string, any>[] {
  const rows: Record<string, any>[] = [];

  meetings.forEach(meeting => {
    if (!meeting.keyDecisionItems || meeting.keyDecisionItems.length === 0) {
      // 如果会议没有决策项，则至少添加一行会议基本信息
      rows.push({
        '会议日期': meeting.meetingDate || '-',
        '文号': meeting.documentNo || '-',
        '会议议题': meeting.meetingTopic || '-',
        '会议结论': meeting.conclusion || '-',
        '内容摘要': meeting.summary || '-',
        '文件名称': meeting.documentName || '-',
        '三重一大会议': meeting.isTiobMeeting ? '是' : '否',
        '事项类别': '-',
        '事项详情': '-',
        '涉及金额': '-',
        '相关部门': '-',
        '相关人员': '-',
        '决策依据': '-',
        '原文内容': '-'
      });
      return;
    }

    // 如果有决策项，为每个决策项创建一行
    meeting.keyDecisionItems.forEach((item, index) => {
      // 根据类型定义中文类别名称
      let categoryName = '其他';
      switch (item.categoryType) {
        case 'majorDecision': categoryName = '重大问题决策'; break;
        case 'personnelAppointment': categoryName = '重要干部任免'; break;
        case 'majorProject': categoryName = '重大项目投资安排'; break;
        case 'largeAmount': categoryName = '大额资金使用'; break;
      }

      rows.push({
        '会议日期': meeting.meetingDate || '-',
        '文号': meeting.documentNo || '-',
        '会议议题': meeting.meetingTopic || '-',
        '会议结论': meeting.conclusion || '-',
        '内容摘要': meeting.summary || '-',
        '文件名称': meeting.documentName || '-',
        '三重一大会议': meeting.isTiobMeeting ? '是' : '否',
        '事项类别': categoryName,
        '事项详情': item.details || '-',
        '涉及金额': item.amount || '-',
        '相关部门': item.departments ? item.departments.join(', ') : '-',
        '相关人员': item.personnel ? item.personnel.join(', ') : '-',
        '决策依据': item.decisionBasis || '-',
        '原文内容': item.originalText || '-'
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
 * 导出会议及决策项数据 (新版格式)
 * @param meetings 会议列表
 * @param format 导出格式
 */
export function exportMeetings(meetings: IMeeting[], format: ExportFormat): void {
  const tableData = convertMeetingsToTableData(meetings);
  
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
