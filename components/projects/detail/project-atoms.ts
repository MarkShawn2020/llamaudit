import { atom } from "jotai";
import { UIFile } from "@/components/projects/utils/ui-file";
import { ProjectFile } from '@/lib/api/project-api';
import { JSONParser } from '@streamparser/json';
import { logger } from '@/lib/logger';

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

/**
 * Extracts JSON data from a potentially incomplete JSON string using stream parsing
 * @param jsonString Potentially incomplete JSON string from SSE stream
 * @returns Parsed JSON object or null if parsing failed
 */
function extractJsonWithStreamParser(jsonString: string): any {
  let result: any = null;
  let parseError: Error | null = null;
  
  try {
    // Initialize the JSONParser
    const parser = new JSONParser({
      stringBufferSize: 0, // Default buffer
      emitPartialValues: true, // Allow partial values during stream processing
    });
    
    // Set up callbacks
    parser.onValue = ({ value, partial }) => {
      // Only store the final root value (when stack depth is 0)
      // Ignore partial values to prevent incomplete data
      // if (!partial) {
        result = value;
      // }
    };
    
    parser.onError = (err) => {
      parseError = err;
      logger.debug('JSON stream parser error', { error: err.message });
    };
    
    // Write the JSON string to the parser
    parser.write(jsonString);
    parser.end();
    
    // If there was a parsing error, result will be the last successfully parsed object
    // If no object was parsed at all, result will be null
    return result;
  } catch (e) {
    logger.error('Failed to parse JSON with stream parser', { 
      error: e instanceof Error ? e.message : String(e),
      jsonPreview: jsonString.substring(0, 100) + (jsonString.length > 100 ? '...' : '')
    });
    return null;
  }
}

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
          // Use stream parser for robust handling of potentially incomplete JSON
          const jsonData = extractJsonWithStreamParser(jsonMatch[1]);
          
          if (jsonData?.tiobItems && jsonData.tiobItems.length > 0) {
            // Add source file information
            const itemsWithSource = jsonData.tiobItems.map((item: any) => ({
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
