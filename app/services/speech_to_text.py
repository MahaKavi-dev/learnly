import os
import shutil
import subprocess
import tempfile

from google.api_core.exceptions import GoogleAPICallError
from google.auth.exceptions import DefaultCredentialsError
from google.cloud import speech

SUPPORTED_LANGUAGES = {"en-IN", "ta-IN", "en", "ta"}

def _normalize_language(lang: str) -> str:
    if not lang or lang not in SUPPORTED_LANGUAGES:
        raise ValueError(f"Unsupported language '{lang}'. Must be 'en-IN' or 'ta-IN'.")
    if lang == "en":
        return "en-IN"
    if lang == "ta":
        return "ta-IN"
    return lang

def _convert_audio_to_wav(audio_bytes: bytes, input_extension: str = ".m4a") -> bytes:
    ffmpeg_bin = shutil.which("ffmpeg")
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
            raise RuntimeError(f"ffmpeg conversion failed: {res.stderr.decode('utf-8', errors='ignore')}")
        
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

def transcribe_audio(file_bytes: bytes, filename: str, language: str) -> str:
    if not file_bytes or len(file_bytes) == 0:
        raise ValueError("Audio file is empty or missing.")

    lang_code = _normalize_language(language)
    ext = os.path.splitext(filename.lower())[1] if filename else ""
    
    # Determine whether direct encoding or ffmpeg conversion is appropriate
    needs_conversion = False
    audio_bytes = file_bytes
    encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
    sample_rate = 16000

    if ext in (".wav", ".wave"):
        encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
        sample_rate = None
    elif ext == ".mp3":
        encoding = speech.RecognitionConfig.AudioEncoding.MP3
        sample_rate = None
    elif ext == ".flac":
        encoding = speech.RecognitionConfig.AudioEncoding.FLAC
        sample_rate = None
    elif ext in (".ogg", ".opus"):
        encoding = speech.RecognitionConfig.AudioEncoding.OGG_OPUS
        sample_rate = None
    else:
        needs_conversion = True

    if needs_conversion:
        audio_bytes = _convert_audio_to_wav(file_bytes, input_extension=ext or ".m4a")
        encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
        sample_rate = 16000

    # Initialize Google Cloud Speech Client
    try:
        client = speech.SpeechClient()
    except (DefaultCredentialsError, Exception) as err:
        if isinstance(err, DefaultCredentialsError) or "credential" in str(err).lower():
            raise PermissionError("Google Cloud credentials not configured on server.")
        raise err

    config_kwargs = {
        "encoding": encoding,
        "language_code": lang_code,
        "enable_automatic_punctuation": True,
    }
    if sample_rate:
        config_kwargs["sample_rate_hertz"] = sample_rate

    config = speech.RecognitionConfig(**config_kwargs)
    audio = speech.RecognitionAudio(content=audio_bytes)

    try:
        response = client.recognize(config=config, audio=audio)
    except DefaultCredentialsError:
        raise PermissionError("Google Cloud credentials missing or invalid.")
    except GoogleAPICallError as err:
        raise Exception(f"Google STT API error: {err.message}")
    except Exception as err:
        if "credential" in str(err).lower() or "auth" in str(err).lower():
            raise PermissionError("Google Cloud credentials missing or invalid.")
        raise Exception(f"Google STT request failed: {type(err).__name__}")

    transcripts = []
    for result in response.results:
        if result.alternatives:
            transcripts.append(result.alternatives[0].transcript)

    return " ".join(transcripts).strip()
