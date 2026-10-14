import type { TextGenerationTask } from '../contracts/text-generation-provider';

/**
 * Classifies only the computational shape of a request. This is a routing hint,
 * never an authorization decision and never permission to invoke a tool.
 */
export function classifyTextGenerationTask(content: string): TextGenerationTask {
  const text = content.normalize('NFKC').toLocaleLowerCase();

  if (
    /\b(extract (?:the )?(?:fields|details|data)|parse (?:this|the) (?:document|receipt|text)|structure (?:this|the) information|convert (?:this|the) (?:text|document) (?:into|to) (?:a )?form|fill (?:the )?form from)\b/i.test(text)
  ) {
    return 'STRUCTURED_EXTRACTION';
  }

  if (
    /\b(compare|analy[sz]e|why|plan|recommend|forecast|diagnos\w*|optimi[sz]e|strategy|evaluate|trade[\s-]?offs?|root cause|what if)\b/i.test(text) ||
    /విశ్లేషించ|ఎందుకు|సూచించ|తులన|योजना|तुलना|विश्लेषण|क्यों|सिफारिश|திட்டமிட|ஒப்பிட|ವಿಶ್ಲೇಷ|ಹೋಲಿಕೆ|পরিকল্পনা|তুলনা/.test(text)
  ) {
    return 'ADVANCED_REASONING';
  }

  return 'CONVERSATION';
}
