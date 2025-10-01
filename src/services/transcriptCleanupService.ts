interface TranslationOptions {
  targetLanguage: string;
  sourceText: string;
}

interface CleanupOptions {
  removeTimestamps: boolean;
  removeTags: boolean;
  removeDuplicateLines: boolean;
  normalizeSpacing: boolean;
}

export class TranscriptCleanupService {
  private static instance: TranscriptCleanupService;

  public static getInstance(): TranscriptCleanupService {
    if (!TranscriptCleanupService.instance) {
      TranscriptCleanupService.instance = new TranscriptCleanupService();
    }
    return TranscriptCleanupService.instance;
  }

  /**
   * Clean VTT transcript by removing timestamps, tags, and duplicate lines
   */
  public cleanTranscript(rawTranscript: string, options: Partial<CleanupOptions> = {}): string {
    const {
      removeTimestamps = true,
      removeTags = true,
      removeDuplicateLines = true,
      normalizeSpacing = true
    } = options;

    console.log('🧹 Starting transcript cleanup...');
    console.log('📝 Input length:', rawTranscript.length);
    console.log('📝 Input preview:', rawTranscript.substring(0, 200) + '...');

    let cleanedText = rawTranscript;

    // Remove WEBVTT header and Kind/Language lines
    cleanedText = cleanedText.replace(/^WEBVTT.*$/gm, '');
    // Handle "Kind: captions Language: en" pattern - use more aggressive approach
    cleanedText = cleanedText.replace(/^Kind:\s*captions\s+Language:\s*\w+\s*/g, '');
    cleanedText = cleanedText.replace(/^Kind:\s*captions.*$/gm, '');
    cleanedText = cleanedText.replace(/^Language:\s*\w+.*$/gm, '');
    // Also handle inline pattern
    cleanedText = cleanedText.replace(/Kind:\s*captions\s+Language:\s*\w+/g, '');

    // Remove embedded timestamps in angle brackets (e.g., <00:00:01.040>)
    if (removeTimestamps) {
      cleanedText = cleanedText.replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '');
      // Also remove traditional VTT timestamps (e.g., "00:00:00.240 --> 00:00:02.389")
      cleanedText = cleanedText.replace(/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}.*$/gm, '');
      // Remove any remaining timestamp patterns
      cleanedText = cleanedText.replace(/\d{2}:\d{2}:\d{2}\.\d{3}/g, '');
    }

    // Remove align and position attributes
    cleanedText = cleanedText.replace(/\s*align:\w+\s*position:\d+%/g, '');

    // Remove <c> tags and their content
    if (removeTags) {
      cleanedText = cleanedText.replace(/<c>([^<]*)<\/c>/g, '$1');
      cleanedText = cleanedText.replace(/<c[^>]*>([^<]*)<\/c>/g, '$1');
      // Only remove specific VTT tags, not all HTML-like tags
      cleanedText = cleanedText.replace(/<[^>]*align:[^>]*>/g, '');
      cleanedText = cleanedText.replace(/<[^>]*position:[^>]*>/g, '');
    }

    // Remove duplicate lines (but be more conservative)
    if (removeDuplicateLines) {
      const lines = cleanedText.split('\n');
      const uniqueLines = [];
      const seenLines = new Set();
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !seenLines.has(trimmedLine)) {
          uniqueLines.push(line);
          seenLines.add(trimmedLine);
        }
      }
      cleanedText = uniqueLines.join('\n');
      
      // Remove obvious duplicate phrases within the same line (more conservative approach)
      cleanedText = cleanedText.replace(/([^.!?]+)\1+/g, '$1');
    }

    // Normalize spacing
    if (normalizeSpacing) {
      // Replace multiple spaces with single space
      cleanedText = cleanedText.replace(/\s+/g, ' ');
      // Remove leading/trailing whitespace from each line
      cleanedText = cleanedText.split('\n').map(line => line.trim()).join('\n');
      // Remove empty lines
      cleanedText = cleanedText.replace(/^\s*$/gm, '');
      // Remove multiple consecutive newlines
      cleanedText = cleanedText.replace(/\n\s*\n/g, '\n');
      // Fix spacing around punctuation
      cleanedText = cleanedText.replace(/\s+([.!?,:;])/g, '$1');
      cleanedText = cleanedText.replace(/([.!?])\s*([.!?])/g, '$1');
    }

    const result = cleanedText.trim();
    
    console.log('✅ Cleanup completed');
    console.log('📝 Output length:', result.length);
    console.log('📝 Output preview:', result.substring(0, 200) + '...');
    
    // Safety check: if result is empty or too short, return original with basic cleanup
    if (result.length < 10) {
      console.warn('⚠️ Cleanup resulted in very short text, returning original with basic cleanup');
      const basicCleanup = rawTranscript
        .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
        .replace(/<c>([^<]*)<\/c>/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      return basicCleanup;
    }
    
    return result;
  }

  /**
   * Translate text using the specified prompt template
   */
  public async translateText(options: TranslationOptions): Promise<string> {
    const { targetLanguage, sourceText } = options;
    
    try {
      // For now, we'll use a simple approach - in a real implementation,
      // you would call an AI translation service like OpenAI, Google Translate API, etc.
      // This is a placeholder that returns the cleaned text with a note
      console.log('Translation requested:', { targetLanguage, textLength: sourceText.length });
      
      // TODO: Integrate with actual translation service
      // The prompt template for future implementation:
      // `Can you translate this script to ${targetLanguage} respecting the length, words, etc adapting so it sounds good with ${targetLanguage} words. Only give me the text not any ai comment or anything just the text.`
      
      // For now, return the cleaned text with a note about translation
      return `[TRANSLATED TO ${targetLanguage.toUpperCase()}]\n\n${sourceText}`;
    } catch (error) {
      console.error('Translation failed:', error);
      throw new Error(`Failed to translate text to ${targetLanguage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean and translate text in one operation
   */
  public async cleanAndTranslate(rawTranscript: string, targetLanguage: string, cleanupOptions: Partial<CleanupOptions> = {}): Promise<string> {
    console.log('🧹 Starting transcript cleanup and translation...');
    
    // First clean the transcript
    const cleanedText = this.cleanTranscript(rawTranscript, cleanupOptions);
    console.log('✅ Transcript cleaned, length:', cleanedText.length);
    
    // Then translate if target language is specified
    if (targetLanguage && targetLanguage.toLowerCase() !== 'english') {
      console.log('🌍 Translating to:', targetLanguage);
      const translatedText = await this.translateText({
        targetLanguage,
        sourceText: cleanedText
      });
      console.log('✅ Translation completed');
      return translatedText;
    }
    
    return cleanedText;
  }

  /**
   * Check if text looks like a VTT transcript
   */
  public isVTTTranscript(text: string): boolean {
    return text.includes('WEBVTT') || 
           text.includes('-->') || 
           /\d{2}:\d{2}:\d{2}\.\d{3}/.test(text) ||
           /<c>/.test(text) ||
           /<\d{2}:\d{2}:\d{2}\.\d{3}>/.test(text) ||
           text.includes('Kind: captions') ||
           text.includes('Language:');
  }

  /**
   * Get language name from language code
   */
  public getLanguageName(languageCode: string): string {
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'de': 'German',
      'fr': 'French',
      'es': 'Spanish',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'pl': 'Polish',
      'da': 'Danish',
      'no': 'Norwegian'
    };

    // Handle full language names
    const fullName = Object.values(languageMap).find(name => 
      name.toLowerCase() === languageCode.toLowerCase()
    );
    
    if (fullName) return fullName;
    
    // Handle language codes
    return languageMap[languageCode.toLowerCase()] || languageCode;
  }
}

export const transcriptCleanupService = TranscriptCleanupService.getInstance();
