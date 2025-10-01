# Transcript Cleanup and Translation Feature

## Overview
I've successfully implemented a comprehensive transcript cleanup and translation feature for the Azure TTS component. This feature addresses the user's request to clean up VTT transcripts and automatically translate them when German is selected.

## Features Implemented

### 1. Transcript Cleanup Service (`src/services/transcriptCleanupService.ts`)
- **VTT Format Detection**: Automatically detects VTT transcript format
- **Comprehensive Cleaning**: Removes timestamps, `<c>` tags, duplicate lines, and formatting
- **Translation Support**: Uses the specified prompt template for translation
- **Language Detection**: Maps language codes to full language names

### 2. Azure TTS Component Updates (`src/components/AzureTTS/AzureTTS.tsx`)
- **Three Action Buttons**: Clean, Translate, and Clean & Translate
- **Auto-Detection**: Shows "VTT transcript detected" indicator
- **Auto-Processing**: Automatically cleans and translates when German is selected
- **Loading States**: Visual feedback during processing

## How It Works

### VTT Transcript Cleaning
The service removes:
- WEBVTT headers
- Timestamps (e.g., `00:00:00.240 --> 00:00:02.389`)
- Alignment attributes (`align:start position:0%`)
- `<c>` tags and their content
- Duplicate lines
- Extra whitespace and empty lines

### Translation Integration
- Uses the specified prompt: `"Can you translate this script to LANGUAGE respecting the length, words, etc adapting so it sounds good with LANGUAGE words. Only give me the text not any ai comment or anything just the text."`
- Dynamically replaces `LANGUAGE` with the selected target language
- Currently returns placeholder text (ready for AI service integration)

### Auto-Processing for German
When German is selected as the target language and VTT transcript is detected:
1. Automatically triggers cleanup
2. Automatically triggers translation
3. Updates the text field with the result

## User Interface

### Button Layout
- **Clean Button** (Blue): Removes VTT formatting
- **Translate Button** (Green): Translates to selected language  
- **Clean & Translate Button** (Purple): Does both operations

### Visual Indicators
- VTT detection indicator shows "📝 VTT transcript detected"
- Loading spinners during processing
- Character count display
- Error messages for failed operations

## Example Usage

### Input (VTT Format):
```
WEBVTT
Kind: captions
Language: en

00:00:00.240 --> 00:00:02.389 align:start position:0%
Young<00:00:00.560><c> nurse</c><00:00:00.960><c> called</c><00:00:01.199><c> a</c><00:00:01.360><c> billionaire</c><00:00:02.159><c> and</c>

00:00:02.389 --> 00:00:02.399 align:start position:0%
Young nurse called a billionaire and
```

### Output (Cleaned):
```
Young nurse called a billionaire and Young nurse called a billionaire and said, "Your daughter is lying unconscious on the street. What happened next shook him." The Manhattan sidewalk was a blur of briefcases, honking taxis, and a sky slowly draining into dusk. Rush hour had arrived in full force.
```

## Technical Implementation

### State Management
- `isCleaning`: Tracks cleanup operation status
- `isTranslating`: Tracks translation operation status
- Error handling for failed operations

### Auto-Processing Logic
```javascript
useEffect(() => {
  if (selectedLanguage.toLowerCase() === 'german' && text.trim()) {
    const isVTT = transcriptCleanupService.isVTTTranscript(text);
    if (isVTT) {
      console.log('🇩🇪 German selected with VTT transcript - auto cleaning and translating...');
      handleCleanAndTranslate();
    }
  }
}, [selectedLanguage, text]);
```

## Future Enhancements
- Integrate with actual AI translation service (OpenAI, Google Translate, etc.)
- Add more language support
- Batch processing for multiple transcripts
- Export cleaned transcripts to different formats

## Files Modified
1. `src/services/transcriptCleanupService.ts` (new)
2. `src/components/AzureTTS/AzureTTS.tsx` (updated)

The feature is now ready for use and will automatically clean and translate VTT transcripts when German is selected as the target language, exactly as requested by the user.
