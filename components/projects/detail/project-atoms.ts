import { atom } from "jotai";
import { UIFile } from "@/components/projects/utils/ui-file";
import { ProjectFile } from '@/lib/api/project-api';
import { extractJsonFromMarkdown } from '@/lib/utils/streaming-json-parser';

// Atom to store the project files
export const projectFilesAtom = atom<UIFile[]>([]);

// Helper function to convert ProjectFile to UIFile
export function projectFileToUIFile(file: ProjectFile): UIFile {
  return {
    id: file.id,
    originalName: file.filename,
    fileSize: file.size,
    fileType: file.type,
    filePath: file.url,
    uploadDate: file.createdAt,
    status: file.isAnalyzed ? 'analyzed' : 'uploaded',
    userId: '',
    isAnalyzed: file.isAnalyzed || false,
    analysisResult: file.metadata || '',
  };
}

// Derived atom that provides tiobItems extracted from files
export const tiobItemsAtom = atom((get) => {
  const files = get(projectFilesAtom);
  const tiobItems = [];

  for (const file of files) {
    if (file.isAnalyzed && file.analysisResult) {
      try {
        // Use our streaming JSON parser utility
        // It works for both complete and streaming data
        
        // Extract metadata from the analysis result
        const metadata = extractJsonFromMarkdown(file.analysisResult);
        
        if (metadata && metadata.tiobItems && metadata.tiobItems.length > 0) {
          // Add source file information to each tiob item
          const itemsWithSource = metadata.tiobItems.map((item: any) => ({
            ...item,
            sourceFile: file.originalName
          }));

          tiobItems.push(...itemsWithSource);
        }
      } catch (e) {
        console.error('Failed to parse file metadata:', file.originalName, e);
      }
    }
  }

  return tiobItems;
});
