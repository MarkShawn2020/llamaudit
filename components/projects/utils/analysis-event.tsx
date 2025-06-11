import { DifyConfig } from '@/types/dify-config';

// 分析事件类型
export type AnalysisEvent = {
    event: string;
    task_id?: string;
    message?: string;
    error?: string;
    data?: any;
    answer?: string;
};

// 分析事件源类
export class AnalysisEventSource {
    private eventSource: EventSource | null = null;
    private fileIds: string[];
    private difyConfig?: DifyConfig;

    constructor(fileIds: string[], difyConfig?: DifyConfig) {
        this.fileIds = fileIds;
        this.difyConfig = difyConfig;
        this.connect();
    }

    private connect() {
        // 构建查询参数
        const params = new URLSearchParams({
            fileIds: JSON.stringify(this.fileIds)
        });

        // 如果提供了 Dify 配置，添加到查询参数
        if (this.difyConfig) {
            params.append('difyConfig', JSON.stringify(this.difyConfig));
        }

        const url = `/api/dify/stream-analysis?${params.toString()}`;
        this.eventSource = new EventSource(url);
    }

    onEvent(callback: (data: AnalysisEvent) => void) {
        if (!this.eventSource) return;

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as AnalysisEvent;
                callback(data);
            } catch (error) {
                console.error('Failed to parse event data:', error);
            }
        };
    }

    onError(callback: (error: Event) => void) {
        if (!this.eventSource) return;
        this.eventSource.onerror = callback;
    }

    close() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }
}