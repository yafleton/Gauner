import { AzureVoice } from '../types';
import { CacheService, CACHE_KEYS } from './cache';

// Azure TTS API endpoints - will be dynamically set based on region
const getAzureEndpoints = (region: string) => ({
  tts: `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
  voices: `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`
});

export class AzureTTSService {
  private apiKey: string;
  private region: string;
  private cache: CacheService;

  constructor(apiKey: string, region: string = 'eastus') {
    this.apiKey = apiKey;
    this.region = region;
    this.cache = CacheService.getInstance();
  }

  async getAvailableVoices(): Promise<AzureVoice[]> {
    // If no API key, return comprehensive fallback voices list
    if (!this.apiKey || this.apiKey === 'demo-key') {
      console.log('AzureTTSService: No API key provided, returning comprehensive fallback voices list');
      return this.getComprehensiveFallbackVoices();
    }

    // Try to fetch from API with valid key
    try {
      console.log('AzureTTSService: Fetching voices from API...');
      console.log('AzureTTSService: API Key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'none');
      console.log('AzureTTSService: Region:', this.region);

      const endpoints = getAzureEndpoints(this.region);
      console.log('AzureTTSService: Endpoint:', endpoints.voices);

      const response = await fetch(endpoints.voices, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
        },
      });

      console.log('AzureTTSService: Response status:', response.status);
      console.log('AzureTTSService: Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AzureTTSService: Error response:', errorText);
        throw new Error(`Failed to fetch voices: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const voices = await response.json();
      console.log('AzureTTSService: Received voices:', voices.length);

      return voices;
    } catch (error) {
      console.error('AzureTTSService: Error fetching voices:', error);
      console.log('AzureTTSService: Falling back to comprehensive voices list');
      return this.getComprehensiveFallbackVoices();
    }
  }

  async synthesizeSpeech(text: string, voice: string, language: string): Promise<ArrayBuffer> {
    // If no valid API key, throw error
    if (!this.apiKey || this.apiKey === 'demo-key') {
      throw new Error('Azure TTS API key not configured. Please set up your Azure TTS API key.');
    }

    try {
      // SSML with CDATA wrapping to prevent parsing issues
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}"><voice name="${voice}"><![CDATA[${text}]]></voice></speak>`;

      console.log('🔍 Azure TTS Request:', {
        voice,
        language,
        textLength: text.length,
        textPreview: text.substring(0, 50) + '...',
        ssmlPreview: ssml.substring(0, 200) + '...',
        apiKey: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'none',
        region: this.region
      });

      const endpoints = getAzureEndpoints(this.region);
      const response = await fetch(endpoints.tts, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
        },
        body: ssml,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure TTS Error Response:', errorText);
        console.error('Azure TTS Response Headers:', Object.fromEntries(response.headers.entries()));
        console.error('Azure TTS Full SSML:', ssml);
        
        // Log the error and throw it
        console.error(`Azure TTS: ${response.status} error`);
        
        throw new Error(`TTS synthesis failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      throw error;
    }
  }

  async synthesizeLongText(
    text: string,
    voice: string,
    language: string,
    onProgress?: (chunk: number, total: number) => void
  ): Promise<ArrayBuffer> {
    // If no valid API key, throw error
    if (!this.apiKey || this.apiKey === 'demo-key') {
      throw new Error('Azure TTS API key not configured. Please set up your Azure TTS API key.');
    }

    // For short texts, use single API call to avoid concatenation issues
    if (text.length <= 5000) {
      console.log('📝 Short text detected, using single API call to avoid concatenation issues');
      if (onProgress) {
        onProgress(1, 1);
      }
      return await this.synthesizeSpeech(text, voice, language);
    }

    const maxChunkLength = 8000; // Use larger chunks to minimize concatenation
    const chunks = this.chunkText(text, maxChunkLength);

    console.log(`📝 Long text detected, splitting into ${chunks.length} chunks`);
    const audioChunks: ArrayBuffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const audioChunk = await this.synthesizeSpeech(chunks[i], voice, language);
        audioChunks.push(audioChunk);

        if (onProgress) {
          onProgress(i + 1, chunks.length);
        }

        // Small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error);
        throw error;
      }
    }

    return this.combineAudioChunks(audioChunks);
  }

  private chunkText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      if (sentence.trim().length === 0) continue;

      const trimmedSentence = sentence.trim() + '.'; // Re-add delimiter for natural breaks

      if (currentChunk.length + trimmedSentence.length <= maxLength) {
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + trimmedSentence;
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
        }
        currentChunk = trimmedSentence;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    // Fallback for very long single words or if no sentences found
    if (chunks.length === 0 && text.length > 0) {
      for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.substring(i, i + maxLength));
      }
    }

    return chunks;
  }

  private combineAudioChunks(audioBuffers: ArrayBuffer[]): ArrayBuffer {
    if (audioBuffers.length === 0) {
      return new ArrayBuffer(0);
    }

    if (audioBuffers.length === 1) {
      return audioBuffers[0];
    }

    // For MP3 files, we need to be more careful about concatenation
    // Azure TTS returns MP3 files that should be concatenatable, but we need to handle potential issues
    
    // Simple concatenation approach for MP3
    const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;

    for (const buffer of audioBuffers) {
      combinedBuffer.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }

    return combinedBuffer.buffer;
  }

  downloadAudio(audioBuffer: ArrayBuffer, filename: string = 'speech.mp3'): void {
    const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Method to clear voice cache (useful when API key or region changes)
  clearVoiceCache(): void {
    const cacheKey = `${CACHE_KEYS.AZURE_VOICES}_${this.region}`;
    this.cache.clear(cacheKey);
    console.log('Cleared Azure voices cache');
  }

  // Generate demo audio for when Azure TTS is not configured
  private generateDemoAudio(text: string): ArrayBuffer {
    console.log('Generating demo audio for text:', text.substring(0, 50) + '...');
    
    // Create a simple WAV header for a 2-second silent audio
    const sampleRate = 24000;
    const duration = 2; // seconds
    const numSamples = sampleRate * duration;
    const bufferSize = 44 + (numSamples * 2); // WAV header + 16-bit samples
    
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, 1, true); // number of channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    // Fill with silence (zeros)
    for (let i = 44; i < bufferSize; i += 2) {
      view.setInt16(i, 0, true);
    }
    
    return buffer;
  }


  private getComprehensiveFallbackVoices(): AzureVoice[] {
    return [
      // English voices
      { Name: "Microsoft Server Speech Text to Speech Voice (en-US, AriaNeural)", DisplayName: "Aria", LocalName: "Aria", Gender: "Female", Locale: "en-US", ShortName: "en-US-AriaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (en-US, AndrewNeural)", DisplayName: "Andrew", LocalName: "Andrew", Gender: "Male", Locale: "en-US", ShortName: "en-US-AndrewNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (en-US, JennyNeural)", DisplayName: "Jenny", LocalName: "Jenny", Gender: "Female", Locale: "en-US", ShortName: "en-US-JennyNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (en-US, GuyNeural)", DisplayName: "Guy", LocalName: "Guy", Gender: "Male", Locale: "en-US", ShortName: "en-US-GuyNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (en-US, EmmaNeural)", DisplayName: "Emma", LocalName: "Emma", Gender: "Female", Locale: "en-US", ShortName: "en-US-EmmaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (en-US, BrianNeural)", DisplayName: "Brian", LocalName: "Brian", Gender: "Male", Locale: "en-US", ShortName: "en-US-BrianNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (en-US, LibbyNeural)", DisplayName: "Libby", LocalName: "Libby", Gender: "Female", Locale: "en-US", ShortName: "en-US-LibbyNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (en-US, DavisNeural)", DisplayName: "Davis", LocalName: "Davis", Gender: "Male", Locale: "en-US", ShortName: "en-US-DavisNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (en-US, AmberNeural)", DisplayName: "Amber", LocalName: "Amber", Gender: "Female", Locale: "en-US", ShortName: "en-US-AmberNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      
      // German voices
      { Name: "Microsoft Server Speech Text to Speech Voice (de-DE, FlorianNeural)", DisplayName: "Florian", LocalName: "Florian", Gender: "Male", Locale: "de-DE", ShortName: "de-DE-FlorianNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (de-DE, KatjaNeural)", DisplayName: "Katja", LocalName: "Katja", Gender: "Female", Locale: "de-DE", ShortName: "de-DE-KatjaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (de-DE, ConradNeural)", DisplayName: "Conrad", LocalName: "Conrad", Gender: "Male", Locale: "de-DE", ShortName: "de-DE-ConradNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (de-DE, AmalaNeural)", DisplayName: "Amala", LocalName: "Amala", Gender: "Female", Locale: "de-DE", ShortName: "de-DE-AmalaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (de-DE, BerndNeural)", DisplayName: "Bernd", LocalName: "Bernd", Gender: "Male", Locale: "de-DE", ShortName: "de-DE-BerndNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (de-DE, ChristophNeural)", DisplayName: "Christoph", LocalName: "Christoph", Gender: "Male", Locale: "de-DE", ShortName: "de-DE-ChristophNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (de-DE, SeraphinaNeural)", DisplayName: "Seraphina", LocalName: "Seraphina", Gender: "Female", Locale: "de-DE", ShortName: "de-DE-SeraphinaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (de-DE, KasperNeural)", DisplayName: "Kasper", LocalName: "Kasper", Gender: "Male", Locale: "de-DE", ShortName: "de-DE-KasperNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (de-DE, KillianNeural)", DisplayName: "Killian", LocalName: "Killian", Gender: "Male", Locale: "de-DE", ShortName: "de-DE-KillianNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      
      // French voices
      { Name: "Microsoft Server Speech Text to Speech Voice (fr-FR, DeniseNeural)", DisplayName: "Denise", LocalName: "Denise", Gender: "Female", Locale: "fr-FR", ShortName: "fr-FR-DeniseNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (fr-FR, HenriNeural)", DisplayName: "Henri", LocalName: "Henri", Gender: "Male", Locale: "fr-FR", ShortName: "fr-FR-HenriNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (fr-FR, AlainNeural)", DisplayName: "Alain", LocalName: "Alain", Gender: "Male", Locale: "fr-FR", ShortName: "fr-FR-AlainNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (fr-FR, BrigitteNeural)", DisplayName: "Brigitte", LocalName: "Brigitte", Gender: "Female", Locale: "fr-FR", ShortName: "fr-FR-BrigitteNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (fr-FR, CelesteNeural)", DisplayName: "Celeste", LocalName: "Celeste", Gender: "Female", Locale: "fr-FR", ShortName: "fr-FR-CelesteNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      
      // Spanish voices
      { Name: "Microsoft Server Speech Text to Speech Voice (es-ES, ElviraNeural)", DisplayName: "Elvira", LocalName: "Elvira", Gender: "Female", Locale: "es-ES", ShortName: "es-ES-ElviraNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (es-ES, AlvaroNeural)", DisplayName: "Alvaro", LocalName: "Alvaro", Gender: "Male", Locale: "es-ES", ShortName: "es-ES-AlvaroNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (es-ES, ArnauNeural)", DisplayName: "Arnau", LocalName: "Arnau", Gender: "Male", Locale: "es-ES", ShortName: "es-ES-ArnauNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (es-ES, DarioNeural)", DisplayName: "Dario", LocalName: "Dario", Gender: "Male", Locale: "es-ES", ShortName: "es-ES-DarioNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (es-ES, EliasNeural)", DisplayName: "Elias", LocalName: "Elias", Gender: "Male", Locale: "es-ES", ShortName: "es-ES-EliasNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      
      // Italian voices
      { Name: "Microsoft Server Speech Text to Speech Voice (it-IT, ElsaNeural)", DisplayName: "Elsa", LocalName: "Elsa", Gender: "Female", Locale: "it-IT", ShortName: "it-IT-ElsaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (it-IT, DiegoNeural)", DisplayName: "Diego", LocalName: "Diego", Gender: "Male", Locale: "it-IT", ShortName: "it-IT-DiegoNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (it-IT, BenignoNeural)", DisplayName: "Benigno", LocalName: "Benigno", Gender: "Male", Locale: "it-IT", ShortName: "it-IT-BenignoNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (it-IT, CalimeroNeural)", DisplayName: "Calimero", LocalName: "Calimero", Gender: "Male", Locale: "it-IT", ShortName: "it-IT-CalimeroNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (it-IT, CataldoNeural)", DisplayName: "Cataldo", LocalName: "Cataldo", Gender: "Male", Locale: "it-IT", ShortName: "it-IT-CataldoNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      
      // Portuguese voices
      { Name: "Microsoft Server Speech Text to Speech Voice (pt-BR, FranciscaNeural)", DisplayName: "Francisca", LocalName: "Francisca", Gender: "Female", Locale: "pt-BR", ShortName: "pt-BR-FranciscaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (pt-BR, AntonioNeural)", DisplayName: "Antonio", LocalName: "Antonio", Gender: "Male", Locale: "pt-BR", ShortName: "pt-BR-AntonioNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (pt-BR, BrendaNeural)", DisplayName: "Brenda", LocalName: "Brenda", Gender: "Female", Locale: "pt-BR", ShortName: "pt-BR-BrendaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (pt-BR, DonatoNeural)", DisplayName: "Donato", LocalName: "Donato", Gender: "Male", Locale: "pt-BR", ShortName: "pt-BR-DonatoNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (pt-BR, ElzaNeural)", DisplayName: "Elza", LocalName: "Elza", Gender: "Female", Locale: "pt-BR", ShortName: "pt-BR-ElzaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      
      // Russian voices
      { Name: "Microsoft Server Speech Text to Speech Voice (ru-RU, SvetlanaNeural)", DisplayName: "Svetlana", LocalName: "Svetlana", Gender: "Female", Locale: "ru-RU", ShortName: "ru-RU-SvetlanaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (ru-RU, DmitryNeural)", DisplayName: "Dmitry", LocalName: "Dmitry", Gender: "Male", Locale: "ru-RU", ShortName: "ru-RU-DmitryNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (ru-RU, DariyaNeural)", DisplayName: "Dariya", LocalName: "Dariya", Gender: "Female", Locale: "ru-RU", ShortName: "ru-RU-DariyaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      
      // Japanese voices
      { Name: "Microsoft Server Speech Text to Speech Voice (ja-JP, NanamiNeural)", DisplayName: "Nanami", LocalName: "Nanami", Gender: "Female", Locale: "ja-JP", ShortName: "ja-JP-NanamiNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (ja-JP, KeitaNeural)", DisplayName: "Keita", LocalName: "Keita", Gender: "Male", Locale: "ja-JP", ShortName: "ja-JP-KeitaNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (ja-JP, AiNeural)", DisplayName: "Ai", LocalName: "Ai", Gender: "Female", Locale: "ja-JP", ShortName: "ja-JP-AiNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (ja-JP, AoiNeural)", DisplayName: "Aoi", LocalName: "Aoi", Gender: "Female", Locale: "ja-JP", ShortName: "ja-JP-AoiNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (ja-JP, DaichiNeural)", DisplayName: "Daichi", LocalName: "Daichi", Gender: "Male", Locale: "ja-JP", ShortName: "ja-JP-DaichiNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      
      // Korean voices
      { Name: "Microsoft Server Speech Text to Speech Voice (ko-KR, SunHiNeural)", DisplayName: "Sun-Hi", LocalName: "Sun-Hi", Gender: "Female", Locale: "ko-KR", ShortName: "ko-KR-SunHiNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (ko-KR, InJoonNeural)", DisplayName: "In-Joon", LocalName: "In-Joon", Gender: "Male", Locale: "ko-KR", ShortName: "ko-KR-InJoonNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (ko-KR, BongJinNeural)", DisplayName: "Bong-Jin", LocalName: "Bong-Jin", Gender: "Male", Locale: "ko-KR", ShortName: "ko-KR-BongJinNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (ko-KR, GookMinNeural)", DisplayName: "Gook-Min", LocalName: "Gook-Min", Gender: "Male", Locale: "ko-KR", ShortName: "ko-KR-GookMinNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (ko-KR, HyunsuNeural)", DisplayName: "Hyunsu", LocalName: "Hyunsu", Gender: "Male", Locale: "ko-KR", ShortName: "ko-KR-HyunsuNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      
      // Chinese voices
      { Name: "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)", DisplayName: "Xiaoxiao", LocalName: "Xiaoxiao", Gender: "Female", Locale: "zh-CN", ShortName: "zh-CN-XiaoxiaoNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiNeural)", DisplayName: "Yunxi", LocalName: "Yunxi", Gender: "Male", Locale: "zh-CN", ShortName: "zh-CN-YunxiNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoyiNeural)", DisplayName: "Xiaoyi", LocalName: "Xiaoyi", Gender: "Female", Locale: "zh-CN", ShortName: "zh-CN-XiaoyiNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (zh-CN, YunjianNeural)", DisplayName: "Yunjian", LocalName: "Yunjian", Gender: "Male", Locale: "zh-CN", ShortName: "zh-CN-YunjianNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" },
      { Name: "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaochenNeural)", DisplayName: "Xiaochen", LocalName: "Xiaochen", Gender: "Female", Locale: "zh-CN", ShortName: "zh-CN-XiaochenNeural", VoiceType: "Neural", Status: "GA", SampleRateHertz: "24000" }
    ];
  }

}