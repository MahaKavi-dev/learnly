import logging
import os
import shutil
import subprocess
import tempfile
import traceback
from typing import Optional

from faster_whisper import WhisperModel

logger = logging.getLogger("learnly.stt")

SUPPORTED_LANGUAGES = {"en-IN", "ta-IN", "en", "ta"}

# Global singleton for lazy loading the local Whisper model
_whisper_model: Optional[WhisperModel] = None

def get_whisper_model() -> WhisperModel:
    global _whisper_model
    if _whisper_model is None:
        model_name = os.getenv("WHISPER_MODEL", "tiny")
        logger.info(f"Initializing local faster-whisper model: '{model_name}'...")
        _whisper_model = WhisperModel(model_name, device="cpu", compute_type="int8")
        logger.info("Local faster-whisper model initialized successfully.")
    return _whisper_model


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
    if lang in ("en", "en-IN"):
        return "en"
    if lang in ("ta", "ta-IN"):
        return "ta"
    return "en"


def _convert_audio_to_wav(audio_bytes: bytes, input_extension: str = ".m4a") -> str:
    """Converts audio bytes into a 16kHz WAV temporary file for Whisper processing."""
    ffmpeg_bin = _get_ffmpeg_binary()
    if not ffmpeg_bin:
        raise RuntimeError("Audio conversion requires ffmpeg, which is not available on the server.")

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
            err_msg = res.stderr.decode("utf-8", errors="ignore")
            logger.error(f"ffmpeg conversion error: {err_msg}")
            raise RuntimeError(f"ffmpeg conversion failed: {err_msg}")

        return out_path
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except Exception:
                pass


def transcribe_audio(file_bytes: bytes, filename: str, language: str) -> str:
    if not file_bytes or len(file_bytes) == 0:
        raise ValueError("Audio file is empty or missing.")

    whisper_lang = _normalize_language(language)
    ext = os.path.splitext(filename.lower())[1] if filename else ".m4a"

    wav_path = _convert_audio_to_wav(file_bytes, input_extension=ext or ".m4a")

    try:
        model = get_whisper_model()
        segments, info = model.transcribe(
            wav_path,
            language=whisper_lang,
            beam_size=5,
            vad_filter=True,
        )

        transcripts = [segment.text.strip() for segment in segments if segment.text.strip()]
        transcript = " ".join(transcripts).strip()

        logger.info(f"Local faster-whisper transcription complete ({whisper_lang}): '{transcript}'")
        return transcript

    except Exception as err:
        logger.error(f"Local faster-whisper STT failed: {err}")
        traceback.print_exc()
        raise RuntimeError(f"Local Whisper STT transcription failed: {err}")

    finally:
        if wav_path and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except Exception:
                pass
