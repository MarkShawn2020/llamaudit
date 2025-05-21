import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import { UIFile } from "@/components/projects/utils/ui-file";
import { ProjectFile } from '@/lib/api/project-api';
import { jsonrepair } from 'jsonrepair';
import { TIOBInterface } from "./tiob-comp";

// Create an atom family to store files by project ID
export const projectFilesAtomFamily = atomFamily(
  (projectId: string) => atom<UIFile[]>([]),
  (a, b) => a === b
);

// For backward compatibility, create a default atom
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
    if (file.analysisResult) {
      try {
        // Extract JSON from markdown code blocks (handles both complete and streaming SSE results)
        const jsonMatch = file.analysisResult.match(/```json\n([\s\S]*?)(?:\n```|$)/);
        
        if (jsonMatch && jsonMatch[1]) {
          const jsonToRepair = jsonMatch[1];
          // Use jsonrepair to handle incomplete or malformed JSON from streaming SSE
          const repairedJson = jsonrepair(jsonToRepair);
          const metadata = JSON.parse(repairedJson);
          
          if (metadata.tiobItems && metadata.tiobItems.length > 0) {
            // 获取会议日期
            const meetingDate = metadata.basicInfo?.meetingDate || '';
            
            // Add source file information and meeting date
            const itemsWithSource = metadata.tiobItems.map((item: any) => ({
              ...item,
              sourceFile: file.originalName,
              meetingDate: meetingDate
            }));

            tiobItems.push(...itemsWithSource);
          }
        }
      } catch (e) {
        console.error('Failed to parse file metadata:', file.originalName, e);
      }
    }
  }

  return tiobItems;
});

// Create a project-specific TIOB items atom
export const projectTiobItemsAtomFamily = atomFamily((projectId: string) => 
  atom((get) => {
    const files = get(projectFilesAtomFamily(projectId));
    const tiobItems = [];
  
    for (const file of files) {
      if (file.analysisResult) {
        try {
          const jsonMatch = file.analysisResult.match(/```json\n([\s\S]*?)(?:\n```|$)/);
          
          if (jsonMatch && jsonMatch[1]) {
            const jsonToRepair = jsonMatch[1];
            const repairedJson = jsonrepair(jsonToRepair);
            const metadata = JSON.parse(repairedJson);
            
            if (metadata.tiobItems && metadata.tiobItems.length > 0) {
              const meetingDate = metadata.basicInfo?.meetingDate || '';
              
              const itemsWithSource = metadata.tiobItems.map((item: any) => ({
                ...item,
                sourceFile: file.originalName,
                meetingDate: meetingDate
              }));
  
              tiobItems.push(...itemsWithSource);
            }
          }
        } catch (e) {
          console.error('Failed to parse file metadata:', file.originalName, e);
        }
      }
    }
  
    return tiobItems;
  })
);
