/**
 * Streaming JSON Parser
 * 
 * This utility provides functions to progressively extract and parse JSON from
 * streaming data, particularly useful for SSE (Server-Sent Events) responses
 * that contain JSON embedded in markdown code blocks.
 */

import { logger } from "@/lib/logger";

interface StreamingParserOptions {
  /** Optional callback when a valid JSON object is found */
  onJsonParsed?: (jsonObject: any) => void;
  /** Optional callback for partial matches that are not yet complete */
  onPartialMatch?: (partialContent: string) => void;
  /** Optional tag for logging */
  logTag?: string;
}

interface StreamingParserState {
  /** The accumulated text buffer */
  buffer: string;
  /** Whether we're currently inside a JSON code block */
  inJsonBlock: boolean;
  /** The start position of the current JSON block */
  blockStartPos: number;
  /** The last complete JSON object parsed */
  lastParsedJson: any | null;
  /** Whether the block has a valid JSON start but hasn't been closed yet */
  hasPartialBlock: boolean;
}

/**
 * Creates a streaming JSON parser for handling incremental data
 * 
 * @returns An object with methods to process streaming data and retrieve results
 */
export function createStreamingJsonParser(options: StreamingParserOptions = {}) {
  const state: StreamingParserState = {
    buffer: "",
    inJsonBlock: false,
    blockStartPos: -1,
    lastParsedJson: null,
    hasPartialBlock: false
  };

  const { onJsonParsed, onPartialMatch, logTag = "StreamingJsonParser" } = options;

  /**
   * Process a chunk of streaming data that may contain partial JSON in markdown blocks
   * 
   * @param chunk The new text chunk to process
   * @returns The latest complete parsed JSON object, if available
   */
  const processChunk = (chunk: string): any | null => {
    if (!chunk) return state.lastParsedJson;
    
    // Append the new chunk to our buffer
    state.buffer += chunk;
    
    // Look for JSON code block markers
    let startIndex = state.buffer.indexOf("```json");
    let endIndex = state.buffer.indexOf("```", startIndex + 6);
    
    // Check if we found a complete code block
    if (startIndex !== -1 && endIndex !== -1) {
      // Extract the content between the markers
      const jsonContent = state.buffer.substring(startIndex + 7, endIndex).trim();
      
      try {
        // Parse the JSON
        const parsedJson = JSON.parse(jsonContent);
        state.lastParsedJson = parsedJson;
        
        // Call the callback if provided
        if (onJsonParsed) {
          onJsonParsed(parsedJson);
        }
        
        // Remove the processed part from the buffer
        state.buffer = state.buffer.substring(endIndex + 3);
        
        // Reset block state
        state.inJsonBlock = false;
        state.blockStartPos = -1;
        state.hasPartialBlock = false;
        
        logger.debug(`${logTag}: Successfully parsed complete JSON block`, { 
          bufferLength: state.buffer.length,
          jsonSize: jsonContent.length
        });
        
        // Recursively process any remaining content (there might be more blocks)
        return processChunk("");
      } catch (e) {
        logger.warn(`${logTag}: Failed to parse potentially complete JSON block`, { 
          error: (e as Error).message,
          jsonContentPreview: jsonContent.substring(0, 100) + '...'
        });
      }
    } 
    // Check if we have the start of a JSON block but not the end
    else if (startIndex !== -1 && endIndex === -1) {
      state.inJsonBlock = true;
      state.blockStartPos = startIndex + 7;
      state.hasPartialBlock = true;
      
      // If we have a callback for partial matches, call it with the current incomplete content
      if (onPartialMatch) {
        const partialContent = state.buffer.substring(state.blockStartPos);
        onPartialMatch(partialContent);
      }
      
      logger.debug(`${logTag}: Found start of JSON block, waiting for end marker`, {
        bufferLength: state.buffer.length
      });
    }
    
    return state.lastParsedJson;
  };

  /**
   * Try to extract JSON even from incomplete blocks by adding closing markers
   * This is useful when you believe the stream has ended but the closing markers never arrived
   * 
   * @returns The best-effort parsed JSON or null if unparseable
   */
  const attemptFinalExtraction = (): any | null => {
    if (!state.hasPartialBlock) return state.lastParsedJson;
    
    try {
      // Extract everything after the start marker
      const partialContent = state.buffer.substring(state.blockStartPos);
      
      // Try to parse it as JSON
      const parsedJson = JSON.parse(partialContent);
      state.lastParsedJson = parsedJson;
      
      logger.info(`${logTag}: Successfully extracted JSON from partial block`, {
        method: 'finalExtraction'
      });
      
      return parsedJson;
    } catch (e) {
      logger.warn(`${logTag}: Failed to parse JSON from partial block in final extraction`, {
        error: (e as Error).message
      });
      
      return null;
    }
  };

  /**
   * Get the current state of the parser
   */
  const getState = () => ({
    hasCompleteJson: state.lastParsedJson !== null,
    hasPartialBlock: state.hasPartialBlock,
    bufferLength: state.buffer.length
  });

  /**
   * Reset the parser state
   */
  const reset = () => {
    state.buffer = "";
    state.inJsonBlock = false;
    state.blockStartPos = -1;
    state.lastParsedJson = null;
    state.hasPartialBlock = false;
  };

  return {
    processChunk,
    attemptFinalExtraction,
    getState,
    reset,
    getLastParsedJson: () => state.lastParsedJson
  };
}

/**
 * Utility function to extract JSON from a markdown code block
 * This leverages the streaming parser to handle both complete and incomplete JSON
 * 
 * @param content The markdown content containing JSON code blocks
 * @returns Parsed JSON object or null if not found or invalid
 */
export function extractJsonFromMarkdown(content: string): any | null {
  if (!content) return null;
  
  try {
    // Create a streaming parser instance to handle the content
    const parser = createStreamingJsonParser({
      logTag: "ExtractJsonFromMarkdown"
    });
    
    // First, try to find a complete JSON code block with closing markers
    const completeJsonMatch = content.match(/```json\n([\s\S]*)\n```/);
    
    if (completeJsonMatch && completeJsonMatch[1]) {
      // For complete blocks, we can still try regular parsing first as it's more direct
      try {
        return JSON.parse(completeJsonMatch[1]);
      } catch (e) {
        // If standard parsing fails, fall back to our streaming parser
        // This handles malformed but recoverable JSON
        parser.processChunk(content);
        return parser.getLastParsedJson() || parser.attemptFinalExtraction();
      }
    }
    
    // If no complete block found, look for just the opening marker
    // This handles streaming cases where the closing marker hasn't arrived yet
    const incompleteJsonMatch = content.match(/```json\n([\s\S]*)$/);
    
    if (incompleteJsonMatch && incompleteJsonMatch[1]) {
      const jsonText = incompleteJsonMatch[1].trim();
      
      // Only attempt to parse if we have some content
      if (jsonText) {
        try {
          // First try standard parsing which is faster
          return JSON.parse(jsonText);
        } catch (e) {
          // If the JSON is incomplete/invalid, use the streaming parser
          // which is more tolerant of partial data
          logger.debug("Standard parsing failed, attempting streaming parser", { 
            length: jsonText.length
          });
          
          // Feed the content to our streaming parser
          parser.processChunk(content);
          
          // Get the result or attempt final extraction if needed
          const result = parser.getLastParsedJson() || parser.attemptFinalExtraction();
          return result;
        }
      }
    }
  } catch (e) {
    logger.error("Failed to extract JSON from markdown", { error: e });
  }
  
  return null;
}
