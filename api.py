from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import uvicorn
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="YouTube Transcript API",
    description="API for extracting YouTube video transcripts using youtube-transcript-api",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "YouTube Transcript API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "youtube-transcript-api"}

@app.get("/transcript/{video_id}")
async def get_transcript(video_id: str):
    """
    Extract transcript for a YouTube video
    """
    logger.info(f"🎯 Extracting transcript for video: {video_id}")
    
    try:
        # Validate video ID
        if not video_id or len(video_id) < 10:
            raise HTTPException(status_code=400, detail="Invalid video ID")
        
        # Try to get transcript with different language options
        transcript_data = None
        language_used = None
        
        try:
            # First try: Auto-generated English subtitles
            transcript_data = YouTubeTranscriptApi.get_transcript(
                video_id, 
                languages=['en'],
                preserve_formatting=False
            )
            language_used = "en (auto-generated)"
            logger.info(f"✅ Found auto-generated English transcript with {len(transcript_data)} segments")
        except Exception as e:
            logger.info(f"⚠️ English auto-generated not found: {str(e)}")
            
            try:
                # Second try: Any auto-generated subtitles
                transcript_data = YouTubeTranscriptApi.get_transcript(
                    video_id,
                    preserve_formatting=False
                )
                language_used = "auto-generated (any language)"
                logger.info(f"✅ Found auto-generated transcript with {len(transcript_data)} segments")
            except Exception as e2:
                logger.info(f"⚠️ Auto-generated not found: {str(e2)}")
                
                try:
                    # Third try: Any available transcript
                    transcript_data = YouTubeTranscriptApi.get_transcript(
                        video_id,
                        languages=['en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
                        preserve_formatting=False
                    )
                    language_used = "manual/auto (any available)"
                    logger.info(f"✅ Found transcript with {len(transcript_data)} segments")
                except Exception as e3:
                    logger.error(f"❌ No transcript found: {str(e3)}")
                    raise HTTPException(
                        status_code=404, 
                        detail=f"No transcript found for video {video_id}. Error: {str(e3)}"
                    )

        if not transcript_data:
            raise HTTPException(
                status_code=404, 
                detail=f"No transcript data available for video {video_id}"
            )

        # Format transcript as plain text
        formatter = TextFormatter()
        transcript_text = formatter.format_transcript(transcript_data)
        
        # Clean up the text
        transcript_text = transcript_text.replace('\n', ' ').replace('  ', ' ').strip()
        
        logger.info(f"📄 Formatted transcript length: {len(transcript_text)} characters")
        logger.info(f"📄 Transcript preview: {transcript_text[:200]}...")

        return {
            "success": True,
            "video_id": video_id,
            "transcript": transcript_text,
            "language_used": language_used,
            "segments_count": len(transcript_data),
            "transcript_length": len(transcript_text),
            "service": "railway-youtube-transcript-api"
        }

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"❌ Server error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Server error: {str(e)}"
        )

@app.get("/transcript/{video_id}/segments")
async def get_transcript_segments(video_id: str):
    """
    Extract transcript segments with timing for a YouTube video
    """
    logger.info(f"🎯 Extracting transcript segments for video: {video_id}")
    
    try:
        # Get transcript data (same logic as above)
        transcript_data = YouTubeTranscriptApi.get_transcript(
            video_id,
            languages=['en', 'de', 'fr', 'es', 'it'],
            preserve_formatting=False
        )
        
        return {
            "success": True,
            "video_id": video_id,
            "segments": transcript_data,
            "segments_count": len(transcript_data),
            "service": "railway-youtube-transcript-api"
        }
        
    except Exception as e:
        logger.error(f"❌ Server error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Server error: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
