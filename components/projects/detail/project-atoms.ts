import { atom } from "jotai";
import { UIFile } from "@/components/projects/utils/ui-file";
import { ProjectFile } from '@/lib/api/project-api';

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

// No need for external JSON parsing library - using a more robust approach

// Derived atom that provides tiobItems extracted from files
export const tiobItemsAtom = atom((get) => {
  const files = get(projectFilesAtom);
  const tiobItems = [];

  for (const file of files) {
    if (file.isAnalyzed && file.analysisResult) {
      try {
        // Extract JSON from markdown code blocks (handles both complete and streaming SSE results)
        const jsonMatch = file.analysisResult.match(/```json\n([\s\S]*?)(?:\n```|$)/);
        
        if (jsonMatch && jsonMatch[1]) {
          const jsonContent = jsonMatch[1].trim();
          
          // Use StreamParser for robust JSON parsing that can handle incomplete streams
          let metadata: any = null;
          try {
            // First try standard JSON.parse for complete content
            metadata = JSON.parse(jsonContent);
          } catch (parseError) {
            // If standard parsing fails, try to recover from partial JSON
            try {
              // Try to fix incomplete JSON by finding the last complete object
              // Look for pairs of braces to find the most complete object
              const logger = console;
              logger.debug('Attempting to recover from incomplete JSON');
              
              // Add closing braces if needed to make it valid JSON
              let fixedJson = jsonContent;
              let openBraces = (jsonContent.match(/\{/g) || []).length;
              let closeBraces = (jsonContent.match(/\}/g) || []).length;
              
              // Add missing closing braces if needed
              if (openBraces > closeBraces) {
                fixedJson += '}'.repeat(openBraces - closeBraces);
                logger.debug(`Added ${openBraces - closeBraces} closing braces`);
              }
              
              // Try parsing the fixed JSON
              try {
                metadata = JSON.parse(fixedJson);
                logger.debug('Successfully recovered JSON by adding missing braces');
              } catch (recoverError) {
                // Fallback: find the last complete object
                const objectRegex = /\{[^\{\}]*((\{[^\{\}]*\})[^\{\}]*)*\}/g;
                const matches = fixedJson.match(objectRegex);
                
                if (matches && matches.length > 0) {
                  try {
                    // Try to parse the largest (likely most complete) object
                    const lastMatch = matches.reduce((a, b) => (a.length > b.length ? a : b));
                    metadata = JSON.parse(lastMatch);
                    logger.debug('Recovered partial JSON using regex matching');
                  } catch (e) {
                    logger.error('Failed to parse matched object:', e);
                  }
                }
              }
            } catch (recoveryError) {
              console.error('Failed to recover JSON:', recoveryError);
            }
          }
          
          if (metadata?.tiobItems && Array.isArray(metadata.tiobItems) && metadata.tiobItems.length > 0) {
            // Add source file information
            const itemsWithSource = metadata.tiobItems.map((item: any) => ({
              ...item,
              sourceFile: file.originalName
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
