/**
 * 文档详情相关的React Query Hooks - 重定向到Server Actions版本
 */

'use client';

// 重定向到使用Server Actions的新实现，解决CORS问题
export {
  useDocumentDetails,
  useDocumentSegments,
  useSearchDocumentSegments,
  useSegmentDetails,
  useUpdateSegmentsStatus,
  usePrefetchDocumentDetails,
  useRefreshDocumentData,
  useDocumentUploadFile,
} from './use-document-details-server';

// 保持向后兼容的类型导出
export type {
  ExtendedDocumentDetails,
  DocumentSegment,
  DocumentSegmentListResponse,
  DocumentUploadFile,
} from '@/lib/api/dify-dataset-api-extended';

// 为了兼容某些可能直接使用API实例的代码，保留这个导出
// 但现在推荐使用server actions
import { useDifyConfig } from '@/contexts/dify-config-context';
import { ExtendedDifyDatasetAPI } from '@/lib/api/dify-dataset-api-extended';

/**
 * @deprecated 直接使用ExtendedDifyDatasetAPI会导致CORS问题，请使用相应的hooks
 * 此函数仅为向后兼容保留，新代码应使用server actions hooks
 */
export function useExtendedDifyDatasetAPI() {
  const { config } = useDifyConfig();
  return new ExtendedDifyDatasetAPI(config);
}

