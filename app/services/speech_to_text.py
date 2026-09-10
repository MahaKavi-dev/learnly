import logging
import os
import shutil
import subprocess
import tempfile
import traceback

from google.api_core.client_options import ClientOptions
from google.api_core.exceptions import GoogleAPICallError, PermissionDenied, Unauthenticated
from google.auth.exceptions import DefaultCredentialsError
from google.cloud import speech

logger = logging.getLogger("learnly.stt")

SUPPORTED_LANGUAGES = {"en-IN", "ta-IN", "en", "ta"}

def _get_ffmpeg_binary() -> str | None:
    # 1. System PATH
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin:
        return ffmpeg_bin

    # 2. Fallback to imageio_ffmpeg if available
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None

def _normalize_language(lang: str) -> str:
    if not lang or lang not in SUPPORTED_LANGUAGES:
        raise ValueError(f"Unsupported language '{lang}'. Must be 'en-IN' or 'ta-IN'.")
    if lang == "en":
        return "en-IN"
    if lang == "ta":
        return "ta-IN"
    return lang

def _convert_audio_to_wav(audio_bytes: bytes, input_extension: str = ".m4a") -> bytes:
    ffmpeg_bin = _get_ffmpeg_binary()
    if not ffmpeg_bin:
        raise RuntimeError(
            "Audio conversion requires ffmpeg, which is not available on the server."
        )

    with tempfile.NamedTemporaryFile(suffix=input_extension, delete=False) as in_file:
        in_file.write(audio_bytes)
        in_path = in_file.name

    out_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    out_path = out_file.name
    out_file.close()

    try:
        cmd = [
            ffmpeg_bin,
            "-y",
            "-i", in_path,
            "-ac", "1",
            "-ar", "16000",
            "-f", "wav",
            out_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0:
            err_msg = res.stderr.decode('utf-8', errors='ignore')
            logger.error(f"ffmpeg conversion error: {err_msg}")
            raise RuntimeError(f"ffmpeg conversion failed: {err_msg}")
        
        with open(out_path, "rb") as f:
            wav_bytes = f.read()
        return wav_bytes
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass
        if os.path.exists(out_path):
            try:
                os.remove(out_path)
            except Exception:
                pass

def _transcribe_with_gemini(file_bytes: bytes, filename: str, lang_code: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return ""
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        
        ext = os.path.splitext(filename.lower())[1] if filename else ".wav"
        mime_type = "audio/wav"
        if ext in (".ogg", ".opus"):
            mime_type = "audio/ogg"
        elif ext in (".mp3",):
            mime_type = "audio/mp3"
        elif ext in (".m4a", ".mp4"):
            mime_type = "audio/mp4"

        prompt = f"Listen to this audio recording in language '{lang_code}'. Transcribe every spoken word exactly as uttered. Return ONLY the raw transcript text without commentary or quotation marks."
        
        response = client.models.generate_content(
            model=model,
            contents=[
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                prompt
            ]
        )
        if response and response.text:
            return response.text.strip()
        return ""
    except Exception as e:
        logger.error(f"Gemini STT fallback error: {e}")
        return ""

def transcribe_audio(file_bytes: bytes, filename: str, language: str) -> str:
    if not file_bytes or len(file_bytes) == 0:
        raise ValueError("Audio file is empty or missing.")

    lang_code = _normalize_language(language)
    ext = os.path.splitext(filename.lower())[1] if filename else ""
    
    # Standardize on converting all non-wav formats (ogg, opus, m4a, mp3, etc) to 16kHz mono LINEAR16 WAV
    needs_conversion = ext not in (".wav", ".wave")
    audio_bytes = file_bytes
    encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
    sample_rate = 16000

    if needs_conversion:
        audio_bytes = _convert_audio_to_wav(file_bytes, input_extension=ext or ".m4a")
        encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
        sample_rate = 16000

    # Initialize Google Cloud Speech Client with quota project resolution
    client_kwargs = {}
    try:
        import google.auth
        credentials, default_project = google.auth.default()
        quota_project = (
            os.getenv("GOOGLE_CLOUD_PROJECT")
            or os.getenv("GOOGLE_QUOTA_PROJECT")
            or os.getenv("GCP_PROJECT")
            or getattr(credentials, "quota_project_id", None)
            or default_project
        )
        client_kwargs["credentials"] = credentials
        if quota_project:
            client_kwargs["client_options"] = ClientOptions(quota_project_id=str(quota_project))
            if hasattr(credentials, "with_quota_project"):
                try:
                    client_kwargs["credentials"] = credentials.with_quota_project(str(quota_project))
                except Exception:
                    pass
        client = speech.SpeechClient(**client_kwargs)
    except (DefaultCredentialsError, Exception) as err:
        logger.error(f"Failed to initialize SpeechClient: {err}")
        traceback.print_exc()
        # Fallback to Gemini STT if GEMINI_API_KEY is available
        gemini_transcript = _transcribe_with_gemini(file_bytes, filename, lang_code)
        if gemini_transcript:
            return gemini_transcript
        if isinstance(err, DefaultCredentialsError) or "credential" in str(err).lower():
            raise PermissionError("Google Cloud credentials not configured on server.")
        raise err

    config = speech.RecognitionConfig(
        encoding=encoding,
        sample_rate_hertz=sample_rate,
        language_code=lang_code,
        enable_automatic_punctuation=True,
    )
    audio = speech.RecognitionAudio(content=audio_bytes)

    try:
        response = client.recognize(config=config, audio=audio)
    except (PermissionDenied, Unauthenticated) as err:
        logger.error(f"Google STT Permission/Auth error [{type(err).__name__}]: {err}")
        traceback.print_exc()
        # Fallback to Gemini STT if GEMINI_API_KEY is available
        gemini_transcript = _transcribe_with_gemini(file_bytes, filename, lang_code)
        if gemini_transcript:
            return gemini_transcript
        raise PermissionError(
            f"Google Speech-to-Text API permission denied: {err}"
        )
    except GoogleAPICallError as err:
        logger.error(f"Google STT API error [{type(err).__name__}]: {err}")
        traceback.print_exc()
        gemini_transcript = _transcribe_with_gemini(file_bytes, filename, lang_code)
        if gemini_transcript:
            return gemini_transcript
        raise Exception(f"Google STT API error: {err.message}")
    except Exception as err:
        logger.error(f"Google STT unexpected error [{type(err).__name__}]: {err}")
        traceback.print_exc()
        gemini_transcript = _transcribe_with_gemini(file_bytes, filename, lang_code)
        if gemini_transcript:
            return gemini_transcript
        if "credential" in str(err).lower() or "auth" in str(err).lower():
            raise PermissionError(f"Google Cloud credentials missing or invalid: {err}")
        raise Exception(f"Google STT request failed: {type(err).__name__}")

    transcripts = []
    for result in response.results:
        if result.alternatives:
            transcripts.append(result.alternatives[0].transcript)

    return " ".join(transcripts).strip()
