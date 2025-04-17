'use client';

import { useState } from 'react';
import { useProjectFiles } from './hooks';
import { FileList } from './fileManagement';
import { AnalysisResults } from './analysisResults';

export default function ProjectAnalysis({ projectId }: { projectId: string }) {

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
    updateFilesAnalysisStatus,
    handleFilesUploaded,
    clearSelection
  } = useProjectFiles(projectId);

  // 分析结果相关逻辑
  const {
    groupedResults,
    isAnalyzing,
    loadingResults,
    handleAnalyze
  } = useAnalysisResults(files.map(f => f.id), updateFilesAnalysisStatus);

  // 处理开始分析按钮点击
  const onAnalyzeStart = async () => {
    await handleAnalyze(selectedFiles);
      // 清空选择
    clearSelection();
  };

  console.log({files, groupedResults});
  

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
          onViewFile={handleViewFile}
          onDownloadFile={handleDownloadFile}
          onUploadComplete={handleFilesUploaded}
        />

        {/* 分析结果卡片 */}
        <AnalysisResults
          groupedResults={groupedResults}
          loading={loadingResults}
        />
      </div>
    </div>
  );
} 