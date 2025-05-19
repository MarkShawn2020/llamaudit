'use client';

import {FileStatus} from "@/components/projects/utils/file-status";
import {analyzeDifyFiles, loadMeetings} from '@/lib/actions/dify-chat-actions';
import {logger} from '@/lib/logger';
import {IMeeting} from '@/types/analysis';
import {useCallback, useState} from 'react';
import {AnalysisResult} from '../types';

// 空会议结果数组
const emptyMeetings: IMeeting[] = [];

/**
 * 分析结果管理 Hook
 * @param fileIds 文件ID列表
 * @param updateFilesStatus 更新文件分析状态的回调
 */
export function useAnalysisResults(fileIds: string[], updateFilesStatus: (fileIds: string[], status: FileStatus) => void) {
    const [meetings, setMeetings] = useState<IMeeting[]>(emptyMeetings);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingResults, setLoadingResults] = useState(false);

    // 处理分析请求
    const handleAnalyze = useCallback(async (selectedFileIds: string[]) => {
        if (selectedFileIds.length === 0) return;

        try {
            setIsAnalyzing(true);
            // 更新所选文件状态为分析中
            updateFilesStatus(selectedFileIds, 'analyzing');

            logger.info(`开始分析文件`, {fileCount: selectedFileIds.length});

            // 调用Dify API进行文件分析
            // 注意: 目前还使用旧的API，实际实现时应创建新的API直接返回会议和决策项
            const oldResults = await analyzeDifyFiles(selectedFileIds);

            // 从旧数据结构中构建会议和决策项
            const newMeetings: IMeeting[] = [];

            // 需要创建一个新的函数 analyzeMeetingsFromFiles 来直接生成符合 IMeeting 的数据
            // 这里仅作为迁移期的转换处理

            if (oldResults) {
                // 为每个分类创建对应的会议记录
                const categoryTypeMappings: { [key: string]: string } = {
                    'majorDecisions': 'majorDecision',
                    'personnelAppointments': 'personnelAppointment',
                    'majorProjects': 'majorProject',
                    'largeAmounts': 'largeAmount'
                };

                const categoryNameMappings: { [key: string]: string } = {
                    'majorDecisions': '重大决策会议',
                    'personnelAppointments': '重要干部任免会议',
                    'majorProjects': '重大项目会议',
                    'largeAmounts': '大额资金会议'
                };

                // 遍历每个三重一大类型
                for (const [category, items] of Object.entries(oldResults)) {
                    if (items.length > 0) {
                        const meetingDate = new Date().toISOString();
                        const documentNo = `${category.substring(0, 2).toUpperCase()}-${new Date().getFullYear()}`;

                        newMeetings.push({
                            meetingDate: meetingDate,
                            documentNo: documentNo,
                            meetingTopic: categoryNameMappings[category] || `${category} 会议`,
                            conclusion: `通过${categoryNameMappings[category]}事项`,
                            summary: `讨论并批准${categoryNameMappings[category]}事项`,
                            documentName: `${categoryNameMappings[category]}纪要`,
                            isTripleOneMeeting: true,
                            keyDecisionItems: items.map((item: AnalysisResult) => ({
                                categoryType: categoryTypeMappings[category] || 'other',
                                details: item.eventDetails || '',
                                amount: item.amountInvolved ? `￥${item.amountInvolved}` : '',
                                departments: item.relatedDepartments ? item.relatedDepartments.split(',') : [],
                                personnel: item.relatedPersonnel ? item.relatedPersonnel.split(',') : [],
                                decisionBasis: item.decisionBasis || '',
                                originalText: item.originalText || ''
                            }))
                        });
                    }
                }
            }

            // 设置会议数据
            setMeetings(newMeetings);

            // 更新文件状态为已分析
            updateFilesStatus(selectedFileIds, 'analyzed');
            logger.info('分析完成，找到会议数量', {
                meetingsCount: newMeetings.length,
                keyDecisionsCount: newMeetings.reduce((total: number, meeting: IMeeting) => total + (meeting.keyDecisionItems?.length || 0), 0)
            });
        } catch (error) {
            logger.error('分析过程中发生错误:', {error});
            // 更新文件状态为错误
            updateFilesStatus(selectedFileIds, 'analysis_failed');
        } finally {
            setIsAnalyzing(false);
        }
    }, [updateFilesStatus]);

    // 加载分析结果
    const loadResults = useCallback(async () => {
        if (fileIds.length === 0) return;

        try {
            setLoadingResults(true);
            logger.info('加载会议和决策项数据', {fileCount: fileIds.length});

            // 从数据库直接加载会议和决策项数据
            const meetings = await loadMeetings(fileIds);

            // 设置会议数据
            setMeetings(meetings);
            logger.info('已加载会议数据', {
                meetingsCount: meetings.length,
                keyDecisionsCount: meetings.reduce((total: number, meeting: IMeeting) => total + (meeting.keyDecisionItems?.length || 0), 0)
            });
        } catch (error) {
            logger.error('加载会议数据时发生错误:', {error});
        } finally {
            setLoadingResults(false);
        }
    }, [fileIds]);

    // 初始加载结果
    // useEffect(() => {
    //   loadResults();
    // }, [loadResults]);

    return {
        meetings, isAnalyzing, loadingResults, handleAnalyze
    };
}
