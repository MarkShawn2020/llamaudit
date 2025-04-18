'use client';

import { useState, useCallback } from 'react';
import { AnalysisResult, AnalysisStatus, FileStatus, GroupedResults, MajorEventCategory } from '../types';

// 初始空结果分组

// 空结果分组
const emptyGroupedResults: GroupedResults = {
  majorDecisions: [],
  personnelAppointments: [],
  majorProjects: [],
  largeAmounts: []
};

/**
 * 分析结果管理 Hook
 * @param fileIds 文件ID列表
 * @param updateFilesStatus 更新文件分析状态的回调
 */
export function useAnalysisResults(
  fileIds: string[], 
  updateFilesStatus: (fileIds: string[], status: FileStatus) => void
) {
  const [groupedResults, setGroupedResults] = useState<GroupedResults>(emptyGroupedResults);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  // 处理分析请求
  const handleAnalyze = useCallback(async (selectedFileIds: string[]) => {
    if (selectedFileIds.length === 0) return;
    
    try {
      setIsAnalyzing(true);
      // 更新所选文件状态为分析中
      updateFilesStatus(selectedFileIds, 'analyzing');
      
      console.log(`开始分析 ${selectedFileIds.length} 个文件`);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 模拟分析结果数据 - 基于README中的三重一大分类
      const mockResults: AnalysisResult[] = selectedFileIds.flatMap(fileId => [
        {
          id: `decision-${fileId}-${Math.random().toString(36).substring(7)}`,
          fileId,
          itemIndex: 0,
          meetingTime: new Date().toISOString(),
          meetingNumber: `JY${Math.floor(Math.random() * 1000)}`,
          meetingTopic: '关于年度项目预算审批的决议',
          meetingConclusion: '经过全体议定，通过了年度项目预算方案',
          contentSummary: '讨论了各部门年度预算分配和重大项目的资金投入',
          eventCategory: '重大决策',
          eventDetails: '年度预算审批涉及各部门运营及重要项目启动',
          amountInvolved: 1500000.00,
          relatedDepartments: '财务部、行政部、各业务部门',
          relatedPersonnel: '张总经理、王副总、各部门负责人',
          decisionBasis: '年度财务规划及公司发展策略',
          originalText: '会议决定通过年度预算共计150万元，其中新项目研发投入不低于60万元',
          confidence: 0.95,
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `personnel-${fileId}-${Math.random().toString(36).substring(7)}`,
          fileId,
          itemIndex: 1,
          meetingTime: new Date(Date.now() - 86400000).toISOString(), // 前一天
          meetingNumber: `RS${Math.floor(Math.random() * 1000)}`,
          meetingTopic: '关于任命新任市场部副总的决定',
          meetingConclusion: '通过对李某的任命，即日起担任市场部副总',
          contentSummary: '讨论了市场部管理层更替及新任副总的个人背景和工作能力',
          eventCategory: '重要干部任免',
          eventDetails: '根据公司发展需要，任命新的管理层人员负责市场拓展',
          relatedDepartments: '人力资源部、市场部',
          relatedPersonnel: '李某、张总经理、人事委员会成员',
          decisionBasis: '市场部干部考核结果及公司监事会建议',
          originalText: '加强营销团队建设，任命李某为市场部副总，负责市场拓展及市场营销',
          confidence: 0.92,
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `project-${fileId}-${Math.random().toString(36).substring(7)}`,
          fileId,
          itemIndex: 2,
          meetingTime: new Date(Date.now() - 172800000).toISOString(), // 两天前
          meetingNumber: `XM${Math.floor(Math.random() * 1000)}`,
          meetingTopic: '关于新产品研发项目的审批',
          meetingConclusion: '通过新产品研发项目，担定开发资源及时间表',
          contentSummary: '引进先进技术，打造具有市场竞争力的类型AI产品，预计研发期为六个月',
          eventCategory: '重大项目',
          eventDetails: '通过对市场需求分析，决定开展新产品研发，预计市场空间达5亿元',
          amountInvolved: 3500000.00,
          relatedDepartments: '研发部、市场部、财务部',
          relatedPersonnel: '技术副总、研发总监、项目经理',
          decisionBasis: '市场调研报告及技术可行性分析',
          originalText: '经过讨论，决定投入350万元启动新产品研发项目，由王研发负责技术实施',
          confidence: 0.90,
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `fund-${fileId}-${Math.random().toString(36).substring(7)}`,
          fileId,
          itemIndex: 3,
          meetingTime: new Date(Date.now() - 259200000).toISOString(), // 三天前
          meetingNumber: `JF${Math.floor(Math.random() * 1000)}`,
          meetingTopic: '关于公司办公楼装修工程采购的审批',
          meetingConclusion: '通过了办公楼装修工程的预算及供应商选择',
          contentSummary: '讨论了多家装修公司的报价及设计方案，投票决定最终方案',
          eventCategory: '大额资金',
          eventDetails: '为改善工作环境，决定对办公楼进行全面装修升级',
          amountInvolved: 2800000.00,
          relatedDepartments: '行政部、财务部、采购部',
          relatedPersonnel: '行政总监、张总经理、各部门负责人',
          decisionBasis: '设施发展规划及年度资金预算',
          originalText: '同意投入280万元对办公楼进行装修，采购明细见附件，由A公司负责工程实施',
          confidence: 0.88,
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);

      // 按三重一大分类分组结果
      const newGroupedResults: GroupedResults = {
        majorDecisions: mockResults.filter(r => r.eventCategory === '重大决策'),
        personnelAppointments: mockResults.filter(r => r.eventCategory === '重要干部任免'),
        majorProjects: mockResults.filter(r => r.eventCategory === '重大项目'),
        largeAmounts: mockResults.filter(r => r.eventCategory === '大额资金')
      };
      
      setGroupedResults(newGroupedResults);
      
      // 更新文件状态为已分析
      updateFilesStatus(selectedFileIds, 'analyzed');
      console.log('分析完成，结果已分组', newGroupedResults);
    } catch (error) {
      console.error('分析过程中发生错误:', error);
      // 更新文件状态为错误
      updateFilesStatus(selectedFileIds, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [updateFilesStatus]);

  // 加载分析结果
  const loadResults = useCallback(async () => {
    if (fileIds.length === 0) return;
    
    try {
      setLoadingResults(true);
      console.log('加载已存在的分析结果');
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 这里应该是实际从API获取结果的逻辑
      // 目前使用空结果
      setGroupedResults(emptyGroupedResults);
    } catch (error) {
      console.error('加载分析结果时发生错误:', error);
    } finally {
      setLoadingResults(false);
    }
  }, [fileIds]);

  // 初始加载结果
  // useEffect(() => {
  //   loadResults();
  // }, [loadResults]);

  return {
    groupedResults,
    isAnalyzing,
    loadingResults,
    handleAnalyze
  };
}
