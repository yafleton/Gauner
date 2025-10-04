from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

def main(request):
    # Handle CORS
    if request.method == "OPTIONS":
        return Response("", status=200, headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        })

    try:
        # Get video ID from query parameters
        url = request.url
        video_id = None
        
        # Parse query parameters
        if '?' in url:
            query_string = url.split('?')[1]
            params = query_string.split('&')
            for param in params:
                if param.startswith('video_id='):
                    video_id = param.split('=')[1]
                    break
        
        if not video_id:
            return Response.json({
                "error": "Missing video_id parameter",
                "success": False
            }, status=400, headers={
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            })

        print(f"🎯 Extracting transcript for video: {video_id}")

        # Try to get transcript with different language options
        transcript = None
        
        try:
            # First try: Auto-generated English subtitles
            transcript = YouTubeTranscriptApi.get_transcript(
                video_id, 
                languages=['en'],
                preserve_formatting=False
            )
            print(f"✅ Found auto-generated English transcript with {len(transcript)} segments")
        except:
            try:
                # Second try: Any auto-generated subtitles
                transcript = YouTubeTranscriptApi.get_transcript(
                    video_id,
                    preserve_formatting=False
                )
                print(f"✅ Found auto-generated transcript with {len(transcript)} segments")
            except:
                try:
                    # Third try: Any available transcript
                    transcript = YouTubeTranscriptApi.get_transcript(
                        video_id,
                        languages=['en', 'de', 'fr', 'es', 'it'],
                        preserve_formatting=False
                    )
                    print(f"✅ Found transcript with {len(transcript)} segments")
                except Exception as e:
                    print(f"❌ Failed to get transcript: {str(e)}")
                    return Response.json({
                        "error": f"No transcript found for video {video_id}. Error: {str(e)}",
                        "success": False
                    }, status=404, headers={
                        "Access-Control-Allow-Origin": "*",
                        "Content-Type": "application/json"
                    })

        # Format transcript as plain text
        formatter = TextFormatter()
        transcript_text = formatter.format_transcript(transcript)
        
        # Clean up the text
        transcript_text = transcript_text.replace('\n', ' ').replace('  ', ' ').strip()
        
        print(f"📄 Formatted transcript length: {len(transcript_text)} characters")
        print(f"📄 Transcript preview: {transcript_text[:200]}...")

        return Response.json({
            "success": True,
            "transcript": transcript_text,
            "video_id": video_id,
            "segments_count": len(transcript),
            "length": len(transcript_text)
        }, headers={
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        })

    except Exception as e:
        print(f"❌ Server error: {str(e)}")
        return Response.json({
            "error": f"Server error: {str(e)}",
            "success": False
        }, status=500, headers={
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        })
