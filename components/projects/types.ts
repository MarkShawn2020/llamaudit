import { MeetingAnalysisResult } from '@/lib/api/document-api';

export interface FileAnalysisGroup {
  fileId: string;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  uploadDate?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  results: MeetingAnalysisResult[];
} 