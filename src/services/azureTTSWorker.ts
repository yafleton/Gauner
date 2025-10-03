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

  async getAvailableVoices(): Promise<AzureVoice[]> {
    // Return the same voice list as getVoices but without requiring API key
    return this.getVoices('', '');
  }

  async getVoices(apiKey: string, region: string): Promise<AzureVoice[]> {
    // For now, we'll use the same voice list as the original service
    // In the future, we could add a /api/voices endpoint to the worker
    const voices: AzureVoice[] = [
      // English voices
      { Name: 'en-US-AvaMultilingualNeural', DisplayName: 'Ava', LocalName: 'Ava', ShortName: 'en-US-AvaMultilingualNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'en-US-AndrewNeural', DisplayName: 'Andrew', LocalName: 'Andrew', ShortName: 'en-US-AndrewNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'en-US-EmmaMultilingualNeural', DisplayName: 'Emma', LocalName: 'Emma', ShortName: 'en-US-EmmaMultilingualNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'en-US-BrianNeural', DisplayName: 'Brian', LocalName: 'Brian', ShortName: 'en-US-BrianNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'en-US-AriaNeural', DisplayName: 'Aria', LocalName: 'Aria', ShortName: 'en-US-AriaNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'en-US-DavisNeural', DisplayName: 'Davis', LocalName: 'Davis', ShortName: 'en-US-DavisNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'en-US-JaneNeural', DisplayName: 'Jane', LocalName: 'Jane', ShortName: 'en-US-JaneNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'en-US-JasonNeural', DisplayName: 'Jason', LocalName: 'Jason', ShortName: 'en-US-JasonNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'en-US-JennyMultilingualNeural', DisplayName: 'Jenny', LocalName: 'Jenny', ShortName: 'en-US-JennyMultilingualNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'en-US-GuyNeural', DisplayName: 'Guy', LocalName: 'Guy', ShortName: 'en-US-GuyNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'en-US-SaraNeural', DisplayName: 'Sara', LocalName: 'Sara', ShortName: 'en-US-SaraNeural', Gender: 'Female', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'en-US-TonyNeural', DisplayName: 'Tony', LocalName: 'Tony', ShortName: 'en-US-TonyNeural', Gender: 'Male', Locale: 'en-US', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      
      // German voices
      { Name: 'de-DE-FlorianNeural', DisplayName: 'Florian', LocalName: 'Florian', ShortName: 'de-DE-FlorianNeural', Gender: 'Male', Locale: 'de-DE', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'de-DE-KatjaNeural', DisplayName: 'Katja', LocalName: 'Katja', ShortName: 'de-DE-KatjaNeural', Gender: 'Female', Locale: 'de-DE', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'de-DE-ConradNeural', DisplayName: 'Conrad', LocalName: 'Conrad', ShortName: 'de-DE-ConradNeural', Gender: 'Male', Locale: 'de-DE', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'de-DE-AmalaNeural', DisplayName: 'Amala', LocalName: 'Amala', ShortName: 'de-DE-AmalaNeural', Gender: 'Female', Locale: 'de-DE', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      
      // French voices
      { Name: 'fr-FR-DeniseNeural', DisplayName: 'Denise', LocalName: 'Denise', ShortName: 'fr-FR-DeniseNeural', Gender: 'Female', Locale: 'fr-FR', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'fr-FR-HenriNeural', DisplayName: 'Henri', LocalName: 'Henri', ShortName: 'fr-FR-HenriNeural', Gender: 'Male', Locale: 'fr-FR', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      
      // Spanish voices
      { Name: 'es-ES-ElviraNeural', DisplayName: 'Elvira', LocalName: 'Elvira', ShortName: 'es-ES-ElviraNeural', Gender: 'Female', Locale: 'es-ES', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'es-ES-AlvaroNeural', DisplayName: 'Alvaro', LocalName: 'Alvaro', ShortName: 'es-ES-AlvaroNeural', Gender: 'Male', Locale: 'es-ES', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      
      // Italian voices
      { Name: 'it-IT-ElsaNeural', DisplayName: 'Elsa', LocalName: 'Elsa', ShortName: 'it-IT-ElsaNeural', Gender: 'Female', Locale: 'it-IT', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'it-IT-DiegoNeural', DisplayName: 'Diego', LocalName: 'Diego', ShortName: 'it-IT-DiegoNeural', Gender: 'Male', Locale: 'it-IT', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      
      // Portuguese voices
      { Name: 'pt-BR-FranciscaNeural', DisplayName: 'Francisca', LocalName: 'Francisca', ShortName: 'pt-BR-FranciscaNeural', Gender: 'Female', Locale: 'pt-BR', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'pt-BR-AntonioNeural', DisplayName: 'Antonio', LocalName: 'Antonio', ShortName: 'pt-BR-AntonioNeural', Gender: 'Male', Locale: 'pt-BR', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      
      // Dutch voices
      { Name: 'nl-NL-FennaNeural', DisplayName: 'Fenna', LocalName: 'Fenna', ShortName: 'nl-NL-FennaNeural', Gender: 'Female', Locale: 'nl-NL', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'nl-NL-MaartenNeural', DisplayName: 'Maarten', LocalName: 'Maarten', ShortName: 'nl-NL-MaartenNeural', Gender: 'Male', Locale: 'nl-NL', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      
      // Polish voices
      { Name: 'pl-PL-AgnieszkaNeural', DisplayName: 'Agnieszka', LocalName: 'Agnieszka', ShortName: 'pl-PL-AgnieszkaNeural', Gender: 'Female', Locale: 'pl-PL', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'pl-PL-MarekNeural', DisplayName: 'Marek', LocalName: 'Marek', ShortName: 'pl-PL-MarekNeural', Gender: 'Male', Locale: 'pl-PL', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      
      // Romanian voices
      { Name: 'ro-RO-AlinaNeural', DisplayName: 'Alina', LocalName: 'Alina', ShortName: 'ro-RO-AlinaNeural', Gender: 'Female', Locale: 'ro-RO', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'ro-RO-EmilNeural', DisplayName: 'Emil', LocalName: 'Emil', ShortName: 'ro-RO-EmilNeural', Gender: 'Male', Locale: 'ro-RO', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      
      // Danish voices
      { Name: 'da-DK-ChristelNeural', DisplayName: 'Christel', LocalName: 'Christel', ShortName: 'da-DK-ChristelNeural', Gender: 'Female', Locale: 'da-DK', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
      { Name: 'da-DK-JeppeNeural', DisplayName: 'Jeppe', LocalName: 'Jeppe', ShortName: 'da-DK-JeppeNeural', Gender: 'Male', Locale: 'da-DK', Status: 'GA', SampleRateHertz: '24000', VoiceType: 'Neural' },
    ];

    return voices;
  }
}
