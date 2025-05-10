'use client';

import { useState } from 'react';
import { useAnalysisResults, useProjectFiles, useStreamingAnalysis } from './hooks';
import { FileList } from './fileManagement';
import { AnalysisResults } from './analysisResults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Markdown } from '@/components/ui/markdown';
import { Loader2, XCircle } from 'lucide-react';
import { IMeeting, IKeyDecisionItem } from '@/types/analysis';

export default function ProjectAnalysis({ projectId }: { projectId: string }) {
  // 当前活动的分析模式："standard"（标准模式）或 "streaming"（流式模式）
  const [analysisMode, setAnalysisMode] = useState<'standard' | 'streaming'>('streaming');

  // 文件管理相关逻辑
  const {
    files,
    selectedFiles,
    loading: loadingFiles,
    deleting,
    handleSelectAll,
    handleSelectFile,
    handleViewFile,
    handleDownloadFile,
    handleDeleteFile,
    handleBatchDeleteFiles,
    updateFilesAnalysisStatus,
    handleFilesUploaded,
    clearSelection
  } = useProjectFiles(projectId);

  // 标准分析结果相关逻辑
  const {
    /**
     * 分析结果，key为文件ID，value为该文件下的分析结果
     * 使用新的数据结构 IMeeting 和 IKeyDecisionItem
     */
    meetings,
    isAnalyzing: isStandardAnalyzing,
    loadingResults,
    handleAnalyze: handleStandardAnalyze
  } = useAnalysisResults(files.map(f => f.id), updateFilesAnalysisStatus);

  // 流式分析相关逻辑
  const {
    isAnalyzing: isStreamAnalyzing,
    streamingResult,
    isComplete,
    error,
    startStreamingAnalysis,
    cancelAnalysis,
    extractMeetingsFromStreamingResult
  } = useStreamingAnalysis(updateFilesAnalysisStatus);

  // 处理开始分析按钮点击
  const onAnalyzeStart = async () => {
    if (analysisMode === 'standard') {
      await handleStandardAnalyze(selectedFiles);
    } else {
      await startStreamingAnalysis(selectedFiles);
    }
    // 清空选择
    clearSelection();
  };

  // 分析进行中（任意模式）
  const isAnalyzing = isStandardAnalyzing || isStreamAnalyzing;

  // console.log({files, meetings});
  

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-1 gap-6">
        {/* 文件管理卡片 */}
        <FileList
          projectId={projectId}
          files={files}
          selectedFiles={selectedFiles}
          loading={loadingFiles}
          isAnalyzing={isAnalyzing}
          deletingFileId={deleting}
          onSelectFile={handleSelectFile}
          onSelectAllFiles={handleSelectAll}
          onAnalyze={onAnalyzeStart}
          onDeleteFile={handleDeleteFile}
          onBatchDeleteFiles={handleBatchDeleteFiles}
          onViewFile={handleViewFile}
          onDownloadFile={handleDownloadFile}
          onUploadComplete={handleFilesUploaded}
        />

        {/* 分析模式选择 */}
        {/*{selectedFiles.length > 0 && (*/}
        {/*  <Card>*/}
        {/*    <CardHeader className="pb-3">*/}
        {/*      <CardTitle>分析模式</CardTitle>*/}
        {/*    </CardHeader>*/}
        {/*    <CardContent>*/}
        {/*      <Tabs */}
        {/*        value={analysisMode} */}
        {/*        onValueChange={(v) => setAnalysisMode(v as 'standard' | 'streaming')}*/}
        {/*        className="w-full"*/}
        {/*      >*/}
        {/*        <TabsList className="grid w-full grid-cols-2">*/}
        {/*          <TabsTrigger value="standard">标准模式</TabsTrigger>*/}
        {/*          <TabsTrigger value="streaming">流式模式 (实时输出)</TabsTrigger>*/}
        {/*        </TabsList>*/}
        {/*        <TabsContent value="standard" className="mt-4">*/}
        {/*          <p className="text-sm text-muted-foreground">*/}
        {/*            标准模式将在分析完成后一次性展示所有结果，适合快速查看格式化的分析总结。*/}
        {/*          </p>*/}
        {/*        </TabsContent>*/}
        {/*        <TabsContent value="streaming" className="mt-4">*/}
        {/*          <p className="text-sm text-muted-foreground">*/}
        {/*            流式模式支持实时查看分析过程，以打字机效果显示分析结果，适合跟踪分析进度和理解分析思路。*/}
        {/*          </p>*/}
        {/*        </TabsContent>*/}
        {/*      </Tabs>*/}
        {/*    </CardContent>*/}
        {/*  </Card>*/}
        {/*)}*/}
        
        {/* 流式分析结果显示区域 */}
        {analysisMode === 'streaming' && (streamingResult || isStreamAnalyzing) && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle>分析进度</CardTitle>
              {isStreamAnalyzing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelAnalysis}
                  className="text-red-500"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  取消分析
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="relative rounded-md border p-4 mt-2">
                {isStreamAnalyzing && (
                  <div className="absolute top-2 right-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {streamingResult ? (
                    <Markdown>{streamingResult}</Markdown>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {isStreamAnalyzing ? '正在启动分析...' : '等待开始分析...'}
                    </p>
                  )}
                  {error && (
                    <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
                      <p className="font-medium">分析错误</p>
                      <p>{error}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分析结果卡片（标准模式或流式分析完成后） */}

          <AnalysisResults
            meetings={ extractMeetingsFromStreamingResult()!}
            loading={loadingResults}
          />
      </div>
    </div>
  );
} 
