import subprocess
import os

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
print("PS STDOUT:", res.stdout)
print("PS STDERR:", res.stderr)

if os.path.exists("synth.ps1"):
    os.remove("synth.ps1")

print("Generated test_speech_en.wav exists:", os.path.exists("test_speech_en.wav"))
if os.path.exists("test_speech_en.wav"):
    print("Size:", os.path.getsize("test_speech_en.wav"))
