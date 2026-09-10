import logging
import os
import shutil
import subprocess
import tempfile
import traceback
import unicodedata

logger = logging.getLogger("learnly.stt")

SUPPORTED_LANGUAGES = {"en-IN", "ta-IN", "en", "ta"}

_whisper_model = None

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
    return lang

def normalize_transcript_text(text: str, language: str = "en") -> str:
    if not text:
        return ""
    # NFC normalization for Unicode characters (especially Tamil)
    norm = unicodedata.normalize("NFC", text)
    # Replace multiple whitespaces/newlines with single space
    norm = " ".join(norm.split()).strip()
    return norm

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

def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        model_name = os.getenv("WHISPER_MODEL", "small")
        device = os.getenv("WHISPER_DEVICE", "cpu")
        compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        logger.info(f"Loading local faster-whisper model '{model_name}' on device '{device}' with compute_type '{compute_type}'...")
        try:
            from faster_whisper import WhisperModel
            _whisper_model = WhisperModel(model_name, device=device, compute_type=compute_type)
            logger.info("Local faster-whisper model loaded successfully.")
        except Exception as err:
            logger.error(f"Failed to load local faster-whisper model '{model_name}': {err}")
            traceback.print_exc()
            raise RuntimeError(f"Failed to load local STT Whisper model: {err}")
    return _whisper_model

def transcribe_audio(file_bytes: bytes, filename: str, language: str) -> str:
    if not file_bytes or len(file_bytes) == 0:
        raise ValueError("Audio file is empty or missing.")

    whisper_lang = _normalize_language(language)
    ext = os.path.splitext(filename.lower())[1] if filename else ""

    # Convert non-wav audio (m4a, ogg, opus, mp3, 3gp, webm) to 16kHz mono WAV
    needs_conversion = ext not in (".wav", ".wave")
    if needs_conversion:
        audio_bytes = _convert_audio_to_wav(file_bytes, input_extension=ext or ".m4a")
    else:
        audio_bytes = file_bytes

    # Load local Whisper model
    model = _get_whisper_model()

    # Save to temp file for Whisper transcription
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
        temp_wav.write(audio_bytes)
        temp_wav_path = temp_wav.name

    try:
        segments, info = model.transcribe(
            temp_wav_path,
            language=whisper_lang,
            beam_size=5,
            temperature=0.0,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            condition_on_previous_text=False
        )
        transcripts = []
        for segment in segments:
            # Filter noise / non-speech segments if stats present
            no_speech_prob = getattr(segment, "no_speech_prob", 0.0)
            avg_logprob = getattr(segment, "avg_logprob", 0.0)
            if no_speech_prob > 0.6 or (avg_logprob < -1.5 and avg_logprob != 0.0):
                logger.info(f"Skipping noise/hallucinated segment: text='{segment.text}', no_speech_prob={no_speech_prob}, avg_logprob={avg_logprob}")
                continue
            if segment.text and segment.text.strip():
                transcripts.append(segment.text.strip())

        raw_transcript = " ".join(transcripts).strip()
        transcript = normalize_transcript_text(raw_transcript, whisper_lang)
        if not transcript:
            logger.info("Whisper STT returned empty transcript.")
        return transcript
    except Exception as err:
        logger.error(f"Whisper STT transcription error: {err}")
        traceback.print_exc()
        raise RuntimeError(f"Whisper local transcription failed: {err}")
    finally:
        if os.path.exists(temp_wav_path):
            try:
                os.remove(temp_wav_path)
            except Exception:
                pass
