interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface ScriptModification {
  type: string;
  description: string;
  examples: string[];
  impact: 'low' | 'medium' | 'high';
}

interface ScriptAnalysis {
  mainCharacter: string;
  genre: string;
  setting: string;
  tone: string;
  modifications: ScriptModification[];
}

export class GeminiService {
  private static instance: GeminiService;
  private apiKey: string = 'AIzaSyBobrL923Yn-gli8SvDj_ijxB5J7BSuaVE';
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  // Translate title using Gemini
  async translateTitle(title: string, targetLanguage: string): Promise<string> {
    if (targetLanguage.toLowerCase() === 'english' || targetLanguage.toLowerCase() === 'en') {
      return title; // No translation needed for English
    }

    console.log('🌍 Translating title to', targetLanguage);
    
    const prompt = `Translate the following YouTube video title to ${targetLanguage}. Keep it natural and engaging, suitable for a video title. Only return the translated title, nothing else.

Title: "${title}"`;

    try {
      const response = await this.callGeminiAPI(prompt);
      return response.trim();
    } catch (error) {
      console.error('❌ Failed to translate title:', error);
      return title; // Return original title if translation fails
    }
  }

  // Translate transcript using Gemini
  async translateTranscript(transcript: string, targetLanguage: string): Promise<string> {
    if (targetLanguage.toLowerCase() === 'english' || targetLanguage.toLowerCase() === 'en') {
      return transcript; // No translation needed for English
    }

    console.log('🌍 Translating transcript to', targetLanguage);
    
    const prompt = `Translate the following YouTube video transcript to ${targetLanguage}. Keep the natural flow and conversational tone. Maintain the speaker's personality and style. Only return the translated text, nothing else.

Transcript: "${transcript}"`;

    try {
      const response = await this.callGeminiAPI(prompt);
      return response.trim();
    } catch (error) {
      console.error('❌ Failed to translate transcript:', error);
      return transcript; // Return original transcript if translation fails
    }
  }

  // Analyze script for modification suggestions
  async analyzeScriptForModifications(transcript: string): Promise<ScriptAnalysis> {
    console.log('🔍 Analyzing script for modification opportunities');
    
    const prompt = `Analyze the following video transcript and provide suggestions for creative modifications. Focus on character details, setting changes, and narrative elements that could be altered while maintaining the core story.

Transcript: "${transcript}"

Please provide a JSON response with this structure:
{
  "mainCharacter": "Description of main character",
  "genre": "Video genre/category",
  "setting": "Main setting/location",
  "tone": "Overall tone/mood",
  "modifications": [
    {
      "type": "Character",
      "description": "What can be changed about characters",
      "examples": ["Example 1", "Example 2"],
      "impact": "low|medium|high"
    },
    {
      "type": "Setting",
      "description": "What can be changed about the setting",
      "examples": ["Example 1", "Example 2"],
      "impact": "low|medium|high"
    },
    {
      "type": "Plot",
      "description": "What can be changed about the plot",
      "examples": ["Example 1", "Example 2"],
      "impact": "low|medium|high"
    }
  ]
}

Only return the JSON, no additional text.`;

    try {
      const response = await this.callGeminiAPI(prompt);
      const analysis = JSON.parse(response);
      
      // Validate the response structure
      if (!analysis.modifications || !Array.isArray(analysis.modifications)) {
        throw new Error('Invalid analysis response structure');
      }

      return analysis;
    } catch (error) {
      console.error('❌ Failed to analyze script:', error);
      
      // Return fallback analysis
      return {
        mainCharacter: "Unknown character",
        genre: "General content",
        setting: "Various locations",
        tone: "Conversational",
        modifications: [
          {
            type: "Character",
            description: "Character details and background",
            examples: ["Change ethnicity", "Modify age", "Alter profession"],
            impact: "medium" as const
          },
          {
            type: "Setting",
            description: "Location and environment",
            examples: ["Change city", "Modify time period", "Alter climate"],
            impact: "low" as const
          }
        ]
      };
    }
  }

  // Apply specific modifications to the script
  async applyModifications(transcript: string, modifications: string[]): Promise<string> {
    if (modifications.length === 0) {
      return transcript;
    }

    console.log('✨ Applying modifications to script:', modifications);
    
    const modificationsText = modifications.join(', ');
    const prompt = `Apply the following modifications to this video transcript: ${modificationsText}

Keep the natural flow and conversational tone. Make the changes seamlessly integrated into the narrative. Only return the modified transcript, nothing else.

Original transcript: "${transcript}"`;

    try {
      const response = await this.callGeminiAPI(prompt);
      return response.trim();
    } catch (error) {
      console.error('❌ Failed to apply modifications:', error);
      return transcript; // Return original transcript if modification fails
    }
  }

  // Call Gemini API with optimized request handling
  private async callGeminiAPI(prompt: string): Promise<string> {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini API');
      }

      const content = data.candidates[0].content.parts[0].text;
      console.log('✅ Gemini API response received');
      return content;
    } catch (error) {
      console.error('❌ Gemini API call failed:', error);
      throw error;
    }
  }

  // Get supported languages
  getSupportedLanguages(): Array<{ code: string; name: string; voice: string }> {
    return [
      { code: 'en', name: 'English', voice: 'Andrew (US)' },
      { code: 'de', name: 'German', voice: 'Florian' },
      { code: 'es', name: 'Spanish', voice: 'Diego' },
      { code: 'fr', name: 'French', voice: 'Denise' },
      { code: 'it', name: 'Italian', voice: 'Isabella' },
      { code: 'pt', name: 'Portuguese', voice: 'Cristiano' },
      { code: 'nl', name: 'Dutch', voice: 'Maarten' },
      { code: 'pl', name: 'Polish', voice: 'Jan' },
      { code: 'ru', name: 'Russian', voice: 'Dmitri' },
      { code: 'ja', name: 'Japanese', voice: 'Keita' },
      { code: 'ko', name: 'Korean', voice: 'SangHyun' },
      { code: 'zh', name: 'Chinese', voice: 'Xiaoxiao' }
    ];
  }
}

export const geminiService = GeminiService.getInstance();
