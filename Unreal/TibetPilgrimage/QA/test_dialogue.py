"""Check bilingual authored lines, local native PCM, and the packaged dialogue scenarios."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile
from uuid import uuid4
from test_package import capture, package_record, shot_data, temporary_root

QA = Path(__file__).resolve().parent


def speeches():
    rows = []
    for row in (QA.parent / 'Source/TibetPilgrimage/TibetRoute.inl').read_text().splitlines():
        if '{EObjective::Talk,' not in row:
            continue
        fields = [json.loads(s) for s in re.findall(r'TEXT\(("(?:[^"\\]|\\.)*")\)', row)]
        assert len(fields) == 7 and all(fields), row
        _, _, en, zh, person, en_name, zh_name = fields
        assert '[[' not in en + zh and en_name != zh_name and en != zh and person, row
        rows.append((en, zh))
    assert len(rows) == 22
    return rows


def check_pcm(directory, first):
    binary = directory / 'voice-probe'
    subprocess.run(['xcrun', 'clang++', '-std=c++17', '-fno-objc-arc',
                    '-framework', 'Foundation', '-framework', 'AVFoundation',
                    str(QA / 'voice_probe.mm'), '-o', binary], check=True)
    for language, locale, line in zip(('en', 'zh'), ('en-US', 'zh-TW'), first):
        value = subprocess.check_output([binary, language, line], text=True, timeout=30)
        assert f'language={locale} ' in value, value
        print(value.strip())


def check_package(exe, output):
    output.mkdir(parents=True, exist_ok=True)
    package_record(exe, output)
    with tempfile.TemporaryDirectory(dir=temporary_root(exe)) as temp:
        (Path(temp) / 'user').mkdir()
        for name, size, options, speaker in (
                ('zh-desktop', (1440, 900), [], '老喇嘛・洛桑'),
                ('en-touch', (932, 430), ['-TibetTouch', '-TibetQAEnglish'], 'Old Lama Lobsang')):
            events = capture(exe, Path(temp), output, name, 'Dialogue', 'stupa',
                             ['-TibetQAVoice', *options], 'QA-dialogue-' + uuid4().hex, size)
            assert [e[1] for e in events if e[0] == 'anchor'] == ['resident', 'gate']
            assert any(e[0] == 'playing' and e[1] == speaker and e[2] for e in events)
            for image in ('resident-cue', 'gate-cue', 'dialogue'):
                shot_data(output / name / (image + '.png'), size)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--voices', action='store_true', help='Render local Apple voices to memory and check duration and RMS')
    parser.add_argument('--exe', type=Path, help='Also play packaged dialogue with actual audio')
    parser.add_argument('--output', type=Path, help='Fresh directory for packaged evidence')
    args = parser.parse_args()
    if bool(args.exe) != bool(args.output):
        parser.error('--exe and --output belong together')
    lines = speeches()
    print(f'{len(lines)} bilingual speaking objectives')
    if args.voices:
        with tempfile.TemporaryDirectory() as temp:
            check_pcm(Path(temp), lines[0])
    if args.exe:
        check_package(args.exe.resolve(), args.output.resolve())
