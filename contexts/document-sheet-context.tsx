/**
 * 文档详情Sheet的状态管理Context
 */

'use client';

import React, {createContext, ReactNode, useCallback, useContext, useState} from 'react';
import {usePrefetchDocumentDetails} from '@/hooks/use-document-details-server';

// Context状态接口
interface DocumentSheetState {
    // Sheet开关状态
    isOpen: boolean;

    // 当前选中的文档信息
    datasetId: string | null;
    documentId: string | null;
    documentName: string | null;

    // UI状态
    activeTab: 'overview' | 'segments';
    segmentsSearchKeyword: string;
    selectedSegmentIds: string[];

    // 批量操作状态
    isBatchMode: boolean;
}

// Context操作接口
interface DocumentSheetActions {
    // 打开/关闭Sheet
    openDocumentSheet: (datasetId: string, documentId: string, documentName?: string) => void;
    closeDocumentSheet: () => void;

    // Tab切换
    setActiveTab: (tab: 'overview' | 'segments') => void;

    // 搜索功能
    setSegmentsSearchKeyword: (keyword: string) => void;
    clearSearch: () => void;

    // 分段选择
    selectSegment: (segmentId: string) => void;
    deselectSegment: (segmentId: string) => void;
    selectAllSegments: (segmentIds: string[]) => void;
    clearSelectedSegments: () => void;

    // 批量模式
    enterBatchMode: () => void;
    exitBatchMode: () => void;

    // 预加载功能
    prefetchDocument: (datasetId: string, documentId: string) => void;
}

// Context类型
interface DocumentSheetContextType extends DocumentSheetState, DocumentSheetActions {
}

// 默认状态
const defaultState: DocumentSheetState = {
    isOpen: false,
    datasetId: null,
    documentId: null,
    documentName: null,
    activeTab: 'overview',
    segmentsSearchKeyword: '',
    selectedSegmentIds: [],
    isBatchMode: false,
};

// 创建Context
const DocumentSheetContext = createContext<DocumentSheetContextType | undefined>(undefined);

// Provider Props
interface DocumentSheetProviderProps {
    children: ReactNode;
}

/**
 * 文档详情Sheet状态管理Provider
 */
export function DocumentSheetProvider({children}: DocumentSheetProviderProps) {
    const [state, setState] = useState<DocumentSheetState>(defaultState);
    const prefetchDocumentDetails = usePrefetchDocumentDetails();

    // 打开文档详情Sheet
    const openDocumentSheet = useCallback((
        datasetId: string,
        documentId: string,
        documentName?: string
    ) => {
        setState(prev => ({
            ...prev,
            isOpen: true,
            datasetId,
            documentId,
            documentName: documentName || null,
            // 重置状态
            activeTab: 'overview',
            segmentsSearchKeyword: '',
            selectedSegmentIds: [],
            isBatchMode: false,
        }));
    }, []);

    // 关闭文档详情Sheet
    const closeDocumentSheet = useCallback(() => {
        setState(prev => ({
            ...prev,
            isOpen: false,
            // 延迟清理数据，避免关闭动画时的闪烁
        }));

        // 500ms后清理数据（与Sheet关闭动画同步）
        setTimeout(() => {
            setState(defaultState);
        }, 500);
    }, []);

    // 切换Tab
    const setActiveTab = useCallback((tab: 'overview' | 'segments') => {
        setState(prev => ({
            ...prev,
            activeTab: tab,
            // 切换到分段Tab时，如果之前在批量模式，退出批量模式
            isBatchMode: tab === 'segments' ? prev.isBatchMode : false,
        }));
    }, []);

    // 设置搜索关键词
    const setSegmentsSearchKeyword = useCallback((keyword: string) => {
        setState(prev => ({
            ...prev,
            segmentsSearchKeyword: keyword,
            // 搜索时清空选中状态
            selectedSegmentIds: [],
            isBatchMode: false,
        }));
    }, []);

    // 清除搜索
    const clearSearch = useCallback(() => {
        setState(prev => ({
            ...prev,
            segmentsSearchKeyword: '',
        }));
    }, []);

    // 选中分段
    const selectSegment = useCallback((segmentId: string) => {
        setState(prev => ({
            ...prev,
            selectedSegmentIds: prev.selectedSegmentIds.includes(segmentId)
                ? prev.selectedSegmentIds
                : [...prev.selectedSegmentIds, segmentId],
        }));
    }, []);

    // 取消选中分段
    const deselectSegment = useCallback((segmentId: string) => {
        setState(prev => ({
            ...prev,
            selectedSegmentIds: prev.selectedSegmentIds.filter(id => id !== segmentId),
        }));
    }, []);

    // 全选分段
    const selectAllSegments = useCallback((segmentIds: string[]) => {
        setState(prev => ({
            ...prev,
            selectedSegmentIds: segmentIds,
            isBatchMode: segmentIds.length > 0,
        }));
    }, []);

    // 清空选中的分段
    const clearSelectedSegments = useCallback(() => {
        setState(prev => ({
            ...prev,
            selectedSegmentIds: [],
            isBatchMode: false,
        }));
    }, []);

    // 进入批量模式
    const enterBatchMode = useCallback(() => {
        setState(prev => ({
            ...prev,
            isBatchMode: true,
            activeTab: 'segments', // 自动切换到分段Tab
        }));
    }, []);

    // 退出批量模式
    const exitBatchMode = useCallback(() => {
        setState(prev => ({
            ...prev,
            isBatchMode: false,
            selectedSegmentIds: [],
        }));
    }, []);

    // 预加载文档
    const prefetchDocument = useCallback((datasetId: string, documentId: string) => {
        prefetchDocumentDetails(datasetId, documentId);
    }, [prefetchDocumentDetails]);

    // Context value
    const contextValue: DocumentSheetContextType = {
        // State
        ...state,

        // Actions
        openDocumentSheet,
        closeDocumentSheet,
        setActiveTab,
        setSegmentsSearchKeyword,
        clearSearch,
        selectSegment,
        deselectSegment,
        selectAllSegments,
        clearSelectedSegments,
        enterBatchMode,
        exitBatchMode,
        prefetchDocument,
    };

    return (
        <DocumentSheetContext.Provider value={contextValue}>
            {children}
        </DocumentSheetContext.Provider>
    );
}

/**
 * 使用文档详情Sheet状态的Hook
 */
export function useDocumentSheet() {
    const context = useContext(DocumentSheetContext);

    if (context === undefined) {
        throw new Error('useDocumentSheet must be used within a DocumentSheetProvider');
    }

    return context;
}

/**
 * 便捷的批量操作Hook
 */
export function useDocumentSheetBatchActions() {
    const {
        selectedSegmentIds,
        isBatchMode,
        selectSegment,
        deselectSegment,
        selectAllSegments,
        clearSelectedSegments,
        enterBatchMode,
        exitBatchMode,
    } = useDocumentSheet();

    const selectedCount = selectedSegmentIds.length;
    const hasSelection = selectedCount > 0;

    return {
        selectedSegmentIds,
        selectedCount,
        hasSelection,
        isBatchMode,
        selectSegment,
        deselectSegment,
        selectAllSegments,
        clearSelectedSegments,
        enterBatchMode,
        exitBatchMode,
    };
}

/**
 * 便捷的搜索功能Hook
 */
export function useDocumentSheetSearch() {
    const {
        segmentsSearchKeyword,
        setSegmentsSearchKeyword,
        clearSearch,
    } = useDocumentSheet();

    const hasSearchKeyword = segmentsSearchKeyword.trim().length > 0;

    return {
        searchKeyword: segmentsSearchKeyword,
        hasSearchKeyword,
        setSearchKeyword: setSegmentsSearchKeyword,
        clearSearch,
    };
}