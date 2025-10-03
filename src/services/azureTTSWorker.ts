import { AzureVoice } from '../types';

export class AzureTTSWorkerService {
  private workerUrl: string;
  private retryCallback?: (attempt: number, maxAttempts: number) => void;

  constructor(workerUrl: string = 'https://gauner-backend.your-subdomain.workers.dev') {
    this.workerUrl = workerUrl;
  }

  setRetryCallback(callback: (attempt: number, maxAttempts: number) => void) {
    this.retryCallback = callback;
  }

  async synthesizeSpeech(
    text: string, 
    voice: string, 
    language: string, 
    apiKey: string, 
    region: string,
    retryCount: number = 0
  ): Promise<ArrayBuffer> {
    try {
      console.log(`🎤 Worker TTS: Synthesizing ${text.length} characters with voice ${voice}`);

      const response = await fetch(`${this.workerUrl}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
          language,
          apiKey,
          region
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Worker TTS Error:', response.status, errorText);
        throw new Error(`Worker TTS failed: ${response.status} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      console.log(`✅ Worker TTS completed: ${audioBuffer.byteLength} bytes`);

      return audioBuffer;

    } catch (error) {
      console.error('❌ Worker TTS Error:', error);

      // Retry logic for network errors
      if (retryCount < 2) {
        if (error instanceof TypeError && (
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('Failed to fetch')
        )) {
          console.log(`🔄 Retrying Worker TTS (attempt ${retryCount + 1}/3) due to network error`);
          if (this.retryCallback) {
            this.retryCallback(retryCount + 1, 3);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return this.synthesizeSpeech(text, voice, language, apiKey, region, retryCount + 1);
        }
      }

      throw error;
    }
  }

  async synthesizeLongText(
    text: string,
    voice: string,
    language: string,
    apiKey: string,
    region: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<ArrayBuffer> {
    console.log(`🎤 Worker TTS Long Text: Processing ${text.length} characters`);

    // For very long texts, we might need to implement chunking on the frontend
    // But let's first try sending it all to the worker
    if (onProgress) {
      onProgress(0, 1);
    }

    try {
      const audioBuffer = await this.synthesizeSpeech(text, voice, language, apiKey, region);
      
      if (onProgress) {
        onProgress(1, 1);
      }

      console.log(`✅ Worker TTS Long Text completed: ${audioBuffer.byteLength} bytes`);
      return audioBuffer;

    } catch (error) {
      console.error('❌ Worker TTS Long Text failed:', error);
      throw error;
    }
  }

  async getVoices(apiKey: string, region: string): Promise<AzureVoice[]> {
    // For now, we'll use the same voice list as the original service
    // In the future, we could add a /api/voices endpoint to the worker
    const voices: AzureVoice[] = [
      // English voices
      { ShortName: 'en-US-AvaMultilingualNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA' },
      { ShortName: 'en-US-AndrewNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA' },
      { ShortName: 'en-US-EmmaMultilingualNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA' },
      { ShortName: 'en-US-BrianNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA' },
      { ShortName: 'en-US-AriaNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA' },
      { ShortName: 'en-US-DavisNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA' },
      { ShortName: 'en-US-JaneNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA' },
      { ShortName: 'en-US-JasonNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA' },
      { ShortName: 'en-US-JennyMultilingualNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA' },
      { ShortName: 'en-US-GuyNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA' },
      { ShortName: 'en-US-SaraNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA' },
      { ShortName: 'en-US-TonyNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA' },
      
      // German voices
      { ShortName: 'de-DE-FlorianNeural', Gender: 'Male', Locale: 'de-DE', Status: 'GA' },
      { ShortName: 'de-DE-KatjaNeural', Gender: 'Female', Locale: 'de-DE', Status: 'GA' },
      { ShortName: 'de-DE-ConradNeural', Gender: 'Male', Locale: 'de-DE', Status: 'GA' },
      { ShortName: 'de-DE-AmalaNeural', Gender: 'Female', Locale: 'de-DE', Status: 'GA' },
      
      // French voices
      { ShortName: 'fr-FR-DeniseNeural', Gender: 'Female', Locale: 'fr-FR', Status: 'GA' },
      { ShortName: 'fr-FR-HenriNeural', Gender: 'Male', Locale: 'fr-FR', Status: 'GA' },
      
      // Spanish voices
      { ShortName: 'es-ES-ElviraNeural', Gender: 'Female', Locale: 'es-ES', Status: 'GA' },
      { ShortName: 'es-ES-AlvaroNeural', Gender: 'Male', Locale: 'es-ES', Status: 'GA' },
      
      // Italian voices
      { ShortName: 'it-IT-ElsaNeural', Gender: 'Female', Locale: 'it-IT', Status: 'GA' },
      { ShortName: 'it-IT-DiegoNeural', Gender: 'Male', Locale: 'it-IT', Status: 'GA' },
      
      // Portuguese voices
      { ShortName: 'pt-BR-FranciscaNeural', Gender: 'Female', Locale: 'pt-BR', Status: 'GA' },
      { ShortName: 'pt-BR-AntonioNeural', Gender: 'Male', Locale: 'pt-BR', Status: 'GA' },
      
      // Dutch voices
      { ShortName: 'nl-NL-FennaNeural', Gender: 'Female', Locale: 'nl-NL', Status: 'GA' },
      { ShortName: 'nl-NL-MaartenNeural', Gender: 'Male', Locale: 'nl-NL', Status: 'GA' },
      
      // Polish voices
      { ShortName: 'pl-PL-AgnieszkaNeural', Gender: 'Female', Locale: 'pl-PL', Status: 'GA' },
      { ShortName: 'pl-PL-MarekNeural', Gender: 'Male', Locale: 'pl-PL', Status: 'GA' },
      
      // Romanian voices
      { ShortName: 'ro-RO-AlinaNeural', Gender: 'Female', Locale: 'ro-RO', Status: 'GA' },
      { ShortName: 'ro-RO-EmilNeural', Gender: 'Male', Locale: 'ro-RO', Status: 'GA' },
      
      // Danish voices
      { ShortName: 'da-DK-ChristelNeural', Gender: 'Female', Locale: 'da-DK', Status: 'GA' },
      { ShortName: 'da-DK-JeppeNeural', Gender: 'Male', Locale: 'da-DK', Status: 'GA' },
    ];

    return voices;
  }
}
