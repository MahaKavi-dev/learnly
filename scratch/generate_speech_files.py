import sys
import os
sys.path.insert(0, os.path.abspath("."))

import subprocess
from app.services.speech_to_text import _get_ffmpeg_binary

ps_code = """
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile('test_speech_en.wav')
$synth.Speak('The sun is bright')
$synth.Dispose()
"""

with open("synth.ps1", "w") as f:
    f.write(ps_code)

res = subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", "synth.ps1"], capture_output=True, text=True)
print("PS Exit code:", res.returncode)

if os.path.exists("synth.ps1"):
    os.remove("synth.ps1")

print("Generated test_speech_en.wav exists:", os.path.exists("test_speech_en.wav"))

ffmpeg_bin = _get_ffmpeg_binary()
if ffmpeg_bin and os.path.exists("test_speech_en.wav"):
    cmd = [ffmpeg_bin, "-y", "-i", "test_speech_en.wav", "-c:a", "libopus", "test_speech_en.ogg"]
    res_ff = subprocess.run(cmd, capture_output=True)
    print("FFmpeg OGG conversion exit code:", res_ff.returncode)
    print("Generated test_speech_en.ogg exists:", os.path.exists("test_speech_en.ogg"))
