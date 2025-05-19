// 分析事件类型
export type AnalysisEvent = {
    event: string;
    task_id?: string;
    message?: string;
    error?: string;
    data?: any;
    answer?: string;
};