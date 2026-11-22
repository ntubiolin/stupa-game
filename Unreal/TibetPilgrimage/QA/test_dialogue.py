"""Check bilingual authored lines, role-matched local native PCM, and packaged dialogue scenarios."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile
from uuid import uuid4
from test_package import capture, package_record, shot_data, temporary_root

QA = Path(__file__).resolve().parent


def talk_entries():
    rows = []
    for row in (QA.parent / 'Source/TibetPilgrimage/TibetRoute.inl').read_text().splitlines():
        if '{EObjective::Talk,' not in row:
            continue
        fields = [json.loads(s) for s in re.findall(r'TEXT\(("(?:[^"\\]|\\.)*")\)', row)]
        assert len(fields) == 7 and all(fields), row
        _, _, en, zh, person, en_name, zh_name = fields
        assert '[[' not in en + zh and en_name != zh_name and en != zh and person, row
        assert not re.search(r'[\u0f00-\u0fff]', en + zh), row
        rows.append((person, en, zh))
    assert len(rows) == 22
    assert len({en for _, en, _ in rows}) == len(rows), 'Duplicate English speech in TibetRoute.inl'
    assert len({zh for _, _, zh in rows}) == len(rows), 'Duplicate Chinese speech in TibetRoute.inl'
    return rows


def speeches():
    return [(en, zh) for _, en, zh in talk_entries()]


def compile_voice_probe(directory):
    binary = directory / 'voice-probe'
    subprocess.run(['xcrun', 'clang++', '-std=c++17', '-fno-objc-arc',
                    '-framework', 'Foundation', '-framework', 'AVFoundation',
                    str(QA / 'voice_probe.mm'), '-o', binary], check=True)
    return binary


def check_pcm(directory, entries):
    binary = compile_voice_probe(directory)
    male_line = next((person, en, zh) for person, en, zh in entries if person == 'oldLama')
    female_line = next((person, en, zh) for person, en, zh in entries if person == 'yesheTsogyal')

    voice_ids = {}
    for person, expected_gender, en_line, zh_line in (
        (male_line[0], 'male', male_line[1], male_line[2]),
        (female_line[0], 'female', female_line[1], female_line[2]),
    ):
        for language, prefix, line in (('en', 'en-', en_line), ('zh', 'zh-', zh_line)):
            value = subprocess.check_output([binary, language, person, line], text=True, timeout=30).strip()
            assert f'gender={expected_gender} ' in value, value
            assert f'language={prefix}' in value, value
            voice_id = re.search(r'id=(\S+)', value).group(1)
            voice_ids[(person, language)] = voice_id
            print(value)

    for language in ('en', 'zh'):
        assert voice_ids[('oldLama', language)] != voice_ids[('yesheTsogyal', language)], voice_ids

    residents = sorted({person for person, _, _ in entries} | {'skyGuru'})
    for person in residents:
        expected_gender = 'female' if person == 'yesheTsogyal' else 'male'
        for language in ('en', 'zh'):
            info = subprocess.check_output([binary, '--inspect', language, person], text=True, timeout=10).strip()
            assert f'gender={expected_gender} ' in info, info
            voice_id = re.search(r'id=(\S+)', info).group(1)
            if expected_gender == 'male':
                assert voice_id != voice_ids[('yesheTsogyal', language)], info


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
    parser.add_argument('--voices', action='store_true', help='Render local Apple voices to memory and check gender, duration, and RMS')
    parser.add_argument('--exe', type=Path, help='Also play packaged dialogue with actual audio')
    parser.add_argument('--output', type=Path, help='Fresh directory for packaged evidence')
    args = parser.parse_args()
    if bool(args.exe) != bool(args.output):
        parser.error('--exe and --output belong together')
    entries = talk_entries()
    print(f'{len(entries)} bilingual speaking objectives')
    if args.voices:
        with tempfile.TemporaryDirectory() as temp:
            check_pcm(Path(temp), entries)
    if args.exe:
        check_package(args.exe.resolve(), args.output.resolve())
