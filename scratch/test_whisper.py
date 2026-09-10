import sys
import os
import time

print("Loading faster_whisper...")
from faster_whisper import WhisperModel

start_time = time.time()
print("Initializing WhisperModel('tiny', device='cpu', compute_type='int8')...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")
print(f"WhisperModel tiny loaded successfully in {time.time() - start_time:.2f} seconds!")

if os.path.exists("test_speech_en.wav"):
    print("Testing transcription on test_speech_en.wav...")
    segments, info = model.transcribe("test_speech_en.wav", language="en")
    transcript = " ".join(s.text for s in segments).strip()
    print("Transcription result:", repr(transcript))
