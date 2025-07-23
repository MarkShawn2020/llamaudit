/**
 * 乐观文件上传管理器
 * 处理文件上传的乐观更新逻辑，包括状态管理、错误处理和回滚机制
 */

export type FileUploadStatus = 
  | 'pending'     // 等待上传
  | 'uploading'   // 上传中
  | 'processing'  // 服务器处理中
  | 'completed'   // 完成
  | 'failed'      // 失败
  | 'duplicate'   // 重复文件
  | 'cancelled';  // 已取消

export interface OptimisticFile {
  // 标识信息
  localId: string;           // 本地临时ID（用于乐观更新）
  serverId?: string;         // 服务器返回的实际ID
  
  // 文件基本信息
  file: File;
  name: string;
  size: number;
  type: string;
  
  // 状态管理
  status: FileUploadStatus;
  progress: number;          // 上传进度 0-100
  error?: string;            // 错误信息
  retryCount: number;        // 重试次数
  
  // 时间戳
  createdAt: Date;           // 创建时间
  updatedAt: Date;           // 最后更新时间
  startedAt?: Date;          // 开始上传时间
  completedAt?: Date;        // 完成时间
  
  // 去重相关
  isDuplicate?: boolean;     // 是否为重复文件
  duplicateOf?: string;      // 重复的原文件ID
  duplicateReason?: string;  // 重复原因
  
  // 元数据
  wordCount?: number;        // 字数（完成后）
  indexingStatus?: string;   // Dify索引状态
}

export interface UploadProgress {
  total: number;
  completed: number;
  failed: number;
  duplicates: number;
  inProgress: number;
}

type FileUpdateListener = (files: OptimisticFile[]) => void;
type ProgressListener = (progress: UploadProgress) => void;

export class OptimisticFileUploadManager {
  private files = new Map<string, OptimisticFile>();
  private fileListeners = new Set<FileUpdateListener>();
  private progressListeners = new Set<ProgressListener>();
  private uploadQueue: string[] = [];
  private isProcessingQueue = false;
  private maxConcurrentUploads = 3;
  private activeUploads = new Set<string>();
  private difyConfig: any | null = null;

  /**
   * 设置Dify配置
   */
  setDifyConfig(config: any) {
    this.difyConfig = config;
  }

  /**
   * 添加文件到乐观更新队列
   */
  addFiles(fileList: FileList, datasetId: string): string[] {
    const localIds: string[] = [];
    
    Array.from(fileList).forEach(file => {
      const localId = this.generateLocalId();
      const optimisticFile: OptimisticFile = {
        localId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        progress: 0,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.files.set(localId, optimisticFile);
      this.uploadQueue.push(localId);
      localIds.push(localId);
    });
    
    this.notifyFileListeners();
    this.notifyProgressListeners();
    
    // 开始处理队列
    this.processUploadQueue(datasetId);
    
    return localIds;
  }

  /**
   * 处理上传队列
   */
  private async processUploadQueue(datasetId: string) {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    while (this.uploadQueue.length > 0 && this.activeUploads.size < this.maxConcurrentUploads) {
      const localId = this.uploadQueue.shift();
      if (localId && this.files.has(localId)) {
        this.activeUploads.add(localId);
        this.uploadFile(localId, datasetId).finally(() => {
          this.activeUploads.delete(localId);
        });
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * 上传单个文件
   */
  private async uploadFile(localId: string, datasetId: string) {
    const fileData = this.files.get(localId);
    if (!fileData) return;

    try {
      // 更新状态为上传中
      this.updateFile(localId, { 
        status: 'uploading',
        startedAt: new Date() 
      });

      // 模拟上传进度（实际应该从API获取）
      const progressInterval = setInterval(() => {
        const currentFile = this.files.get(localId);
        if (currentFile && currentFile.status === 'uploading' && currentFile.progress < 90) {
          this.updateFile(localId, { 
            progress: Math.min(currentFile.progress + Math.random() * 20, 90) 
          });
        }
      }, 200);

      // 调用实际的上传API
      const result = await this.callUploadAPI(fileData.file, datasetId);
      
      clearInterval(progressInterval);
      
      // 根据返回结果更新状态
      if (result.isDuplicate) {
        this.updateFile(localId, {
          status: 'duplicate',
          progress: 100,
          isDuplicate: true,
          duplicateOf: result.existingDocumentId,
          duplicateReason: '检测到相同内容的文档已存在',
          completedAt: new Date()
        });
      } else {
        this.updateFile(localId, {
          status: 'processing',
          progress: 100,
          serverId: result.document.id,
          indexingStatus: result.document.indexing_status,
          completedAt: new Date()
        });
        
        // 监控处理状态
        this.monitorProcessingStatus(localId, datasetId);
      }

    } catch (error) {
      this.updateFile(localId, {
        status: 'failed',
        error: error instanceof Error ? error.message : '上传失败',
        updatedAt: new Date()
      });
    }
  }

  /**
   * 监控文档处理状态
   */
  private async monitorProcessingStatus(localId: string, datasetId: string) {
    const fileData = this.files.get(localId);
    if (!fileData || !fileData.serverId) return;

    const checkStatus = async () => {
      try {
        // 这里应该调用检查文档状态的API
        const status = await this.checkDocumentStatus(datasetId, fileData.serverId!);
        
        if (status.indexing_status === 'completed') {
          this.updateFile(localId, {
            status: 'completed',
            indexingStatus: status.indexing_status,
            wordCount: status.word_count,
            updatedAt: new Date()
          });
        } else if (['error', 'failed'].includes(status.indexing_status)) {
          this.updateFile(localId, {
            status: 'failed',
            error: '文档处理失败',
            indexingStatus: status.indexing_status,
            updatedAt: new Date()
          });
        } else {
          // 继续监控
          setTimeout(checkStatus, 2000);
        }
      } catch (error) {
        // 静默处理监控错误，避免影响用户体验
        console.warn('监控文档状态失败:', error);
      }
    };

    setTimeout(checkStatus, 1000);
  }

  /**
   * 重试上传
   */
  retryUpload(localId: string, datasetId: string) {
    const fileData = this.files.get(localId);
    if (!fileData || fileData.retryCount >= 3) return;

    this.updateFile(localId, {
      status: 'pending',
      progress: 0,
      error: undefined,
      retryCount: fileData.retryCount + 1,
      updatedAt: new Date()
    });

    this.uploadQueue.unshift(localId); // 优先重试
    this.processUploadQueue(datasetId);
  }

  /**
   * 取消上传
   */
  cancelUpload(localId: string) {
    const fileData = this.files.get(localId);
    if (!fileData) return;

    if (['pending', 'uploading'].includes(fileData.status)) {
      this.updateFile(localId, {
        status: 'cancelled',
        updatedAt: new Date()
      });

      // 从队列中移除
      const queueIndex = this.uploadQueue.indexOf(localId);
      if (queueIndex > -1) {
        this.uploadQueue.splice(queueIndex, 1);
      }
    }
  }

  /**
   * 移除文件
   */
  removeFile(localId: string) {
    this.files.delete(localId);
    this.notifyFileListeners();
    this.notifyProgressListeners();
  }

  /**
   * 获取所有文件
   */
  getFiles(): OptimisticFile[] {
    return Array.from(this.files.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * 获取上传进度统计
   */
  getProgress(): UploadProgress {
    const files = this.getFiles();
    return {
      total: files.length,
      completed: files.filter(f => f.status === 'completed').length,
      failed: files.filter(f => f.status === 'failed').length,
      duplicates: files.filter(f => f.status === 'duplicate').length,
      inProgress: files.filter(f => ['pending', 'uploading', 'processing'].includes(f.status)).length,
    };
  }

  /**
   * 订阅文件列表变化
   */
  onFilesChange(listener: FileUpdateListener): () => void {
    this.fileListeners.add(listener);
    return () => this.fileListeners.delete(listener);
  }

  /**
   * 订阅进度变化
   */
  onProgressChange(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  /**
   * 清理已完成的文件
   */
  clearCompleted() {
    Array.from(this.files.entries()).forEach(([localId, file]) => {
      if (['completed', 'duplicate', 'cancelled'].includes(file.status)) {
        this.files.delete(localId);
      }
    });
    this.notifyFileListeners();
    this.notifyProgressListeners();
  }

  // 私有方法
  private updateFile(localId: string, updates: Partial<OptimisticFile>) {
    const file = this.files.get(localId);
    if (file) {
      Object.assign(file, updates, { updatedAt: new Date() });
      this.notifyFileListeners();
      this.notifyProgressListeners();
    }
  }

  private notifyFileListeners() {
    const files = this.getFiles();
    this.fileListeners.forEach(listener => listener(files));
  }

  private notifyProgressListeners() {
    const progress = this.getProgress();
    this.progressListeners.forEach(listener => listener(progress));
  }

  private generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // API调用方法（与Dify API集成）
  private async callUploadAPI(file: File, datasetId: string): Promise<{
    document: any;
    batch: string;
    isDuplicate: boolean;
    existingDocumentId?: string;
  }> {
    // 使用动态导入避免循环依赖
    const { DifyDatasetAPI } = await import('@/lib/api/dify-dataset-api');
    const { useDifyConfig } = await import('@/contexts/dify-config-context');
    
    // 获取Dify配置（这里需要在组件外部调用，实际实现可能需要调整）
    // 暂时使用全局配置或通过参数传递
    const config = this.getDifyConfig();
    const api = new DifyDatasetAPI(config);

    try {
      const result = await api.createDocumentByFile(datasetId, file, {
        indexing_technique: 'high_quality',
        process_mode: 'automatic'
      });

      // 分析响应以检测是否为重复文档
      const isDuplicate = this.detectDuplicateFromResponse(result, file);
      
      return {
        document: result.document,
        batch: result.batch,
        isDuplicate,
        existingDocumentId: isDuplicate ? result.document?.id : undefined,
      };
    } catch (error) {
      console.error('Dify API调用失败:', error);
      throw error;
    }
  }

  private async checkDocumentStatus(datasetId: string, documentId: string): Promise<{
    indexing_status: string;
    word_count?: number;
  }> {
    // 从文档列表中查找文档状态
    const { DifyDatasetAPI } = await import('@/lib/api/dify-dataset-api');
    const config = this.getDifyConfig();
    const api = new DifyDatasetAPI(config);

    try {
      // 获取文档列表并查找特定文档
      const documentsResponse = await api.getDatasetDocuments(datasetId, 1, 50);
      const document = documentsResponse.data.find(doc => doc.id === documentId);
      
      if (document) {
        return {
          indexing_status: document.indexing_status,
          word_count: document.word_count,
        };
      } else {
        throw new Error(`未找到文档 ${documentId}`);
      }
    } catch (error) {
      console.error('检查文档状态失败:', error);
      throw error;
    }
  }

  // 检测重复文档的核心逻辑
  private detectDuplicateFromResponse(response: any, uploadedFile: File): boolean {
    // 方法1: 检查响应中的重复标识
    if (response.duplicated === true || response.is_duplicate === true) {
      return true;
    }
    
    // 方法2: 检查文档创建时间（如果文档创建时间早于上传时间，可能是重复）
    if (response.document?.created_at) {
      const docCreatedTime = new Date(response.document.created_at * 1000);
      const uploadTime = new Date();
      const timeDiff = uploadTime.getTime() - docCreatedTime.getTime();
      
      // 如果文档创建时间早于5分钟前，可能是重复文档
      if (timeDiff > 5 * 60 * 1000) {
        console.log('🔍 检测到可能的重复文档（基于时间）:', {
          fileName: uploadedFile.name,
          docCreatedTime: docCreatedTime.toISOString(),
          timeDiff: timeDiff / 1000 + '秒',
        });
        return true;
      }
    }
    
    // 方法3: 检查batch字段（可能为空或特殊值表示重复）
    if (!response.batch || response.batch === 'duplicate' || response.batch === '') {
      console.log('🔍 检测到可能的重复文档（基于batch）:', {
        fileName: uploadedFile.name,
        batch: response.batch,
      });
      return true;
    }
    
    // 方法4: 检查文档状态（立即完成的文档可能表示是重复的）
    if (response.document?.indexing_status === 'completed') {
      console.log('🔍 检测到可能的重复文档（基于状态）:', {
        fileName: uploadedFile.name,
        status: response.document.indexing_status,
      });
      return true;
    }
    
    // 方法5: 文档名称完全匹配且大小相同（额外的客户端检查）
    if (response.document?.name === uploadedFile.name) {
      console.log('🔍 检测到可能的重复文档（基于名称）:', {
        fileName: uploadedFile.name,
        documentName: response.document.name,
      });
      // 这里可以进一步检查文件大小等
      return true;
    }
    
    return false;
  }

  // 获取Dify配置的辅助方法
  private getDifyConfig(): any {
    // 优先使用设置的配置
    if (this.difyConfig) {
      return this.difyConfig;
    }
    
    // 从localStorage获取配置
    if (typeof window !== 'undefined') {
      const config = localStorage.getItem('dify-config');
      if (config) {
        try {
          return JSON.parse(config);
        } catch (error) {
          console.warn('解析dify-config失败:', error);
        }
      }
    }
    
    // 默认配置
    return {
      baseUrl: process.env.NEXT_PUBLIC_DIFY_BASE_URL || 'https://api.dify.ai/v1',
      apiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY || '',
      datasetApiKey: process.env.NEXT_PUBLIC_DIFY_DATASET_API_KEY || '',
    };
  }
}

// 全局实例
export const optimisticUploadManager = new OptimisticFileUploadManager();