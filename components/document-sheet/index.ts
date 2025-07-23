/**
 * 文档详情Sheet组件导出
 */

// 主要组件
export { default as DocumentSheet, DocumentSheetTrigger } from './document-sheet';
export { default as DocumentMeta } from './document-meta';
export { default as DocumentSegments } from './document-segments';

// Context和Hooks
export { 
  DocumentSheetProvider, 
  useDocumentSheet,
  useDocumentSheetBatchActions,
  useDocumentSheetSearch 
} from '@/contexts/document-sheet-context';

export {
  useDocumentDetails,
  useDocumentSegments,
  useSearchDocumentSegments,
  useSegmentDetails,
  useUpdateSegmentsStatus,
  usePrefetchDocumentDetails,
  useRefreshDocumentData,
  useExtendedDifyDatasetAPI
} from '@/hooks/use-document-details';

// API和类型
export { 
  ExtendedDifyDatasetAPI,
  type ExtendedDocumentDetails,
  type DocumentSegment,
  type DocumentSegmentListResponse
} from '@/lib/api/dify-dataset-api-extended';

// 工具类型
export type DocumentSheetProps = {
  // 文档信息
  datasetId: string;
  documentId: string;
  documentName?: string;
  
  // 功能开关
  enableSearch?: boolean;
  enableBatchActions?: boolean;
  enablePreload?: boolean;
  
  // 样式定制
  width?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  
  // 事件回调
  onOpen?: (documentId: string) => void;
  onClose?: () => void;
  onTabChange?: (tab: 'overview' | 'segments') => void;
};

export type DocumentSheetTriggerProps = {
  children: React.ReactNode;
  datasetId: string;
  documentId: string;
  documentName?: string;
  onHover?: boolean;
  className?: string;
};