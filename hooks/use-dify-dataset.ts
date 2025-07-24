'use client';

// 重定向到使用Server Actions的新实现，解决CORS问题
export {
  useDatasetDetails,
  useCreateDataset,
  useDatasetDocuments,
  useCreateDocumentByFile,
  useDeleteDocument,
  useDeleteDataset,
  useDocumentIndexingStatus,
  useProjectDataset,
  useDifyConnectionTest,
  useBatchDatasetDocuments,
} from './use-dify-dataset-server';

// 保持向后兼容的类型导出
export type {
  DifyDataset,
  DifyDocument,
  CreateDatasetPayload,
  CreateDocumentResponse,
} from '@/lib/api/dify-dataset-api';

// 为了兼容某些可能直接使用API实例的代码，保留这个导出
// 但现在推荐使用server actions
import { useDifyConfig } from '@/contexts/dify-config-context';
import { DifyDatasetAPI } from '@/lib/api/dify-dataset-api';

/**
 * @deprecated 直接使用DifyDatasetAPI会导致CORS问题，请使用相应的hooks
 * 此函数仅为向后兼容保留，新代码应使用server actions hooks
 */
export function useDifyDatasetAPI() {
  const { config } = useDifyConfig();
  return new DifyDatasetAPI(config);
}