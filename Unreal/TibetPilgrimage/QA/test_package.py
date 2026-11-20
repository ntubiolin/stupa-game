"""Capture photo evidence or walk the campaign in a Development package on a Mac."""
import argparse
import hashlib
import html
import json
import plistlib
import re
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import quote

QA = Path(__file__).resolve().parent
VIEWS = json.loads((QA / "views.json").read_text())


def temporary_root(executable):
    bundle = executable.parents[2]
    signature = subprocess.run(["codesign", "-d", "--entitlements", "-", "--xml", str(bundle)],
                               capture_output=True, check=False)
    if not signature.stdout or not plistlib.loads(signature.stdout).get("com.apple.security.app-sandbox"):
        return None
    bundle_id = plistlib.loads((bundle / "Contents/Info.plist").read_bytes())["CFBundleIdentifier"]
    if not re.fullmatch(r"[a-zA-Z0-9.-]+", bundle_id):
        raise ValueError("Unexpected bundle identifier")
    root = Path.home() / "Library/Containers" / bundle_id / "Data/tmp"
    if not root.is_dir():
        subprocess.run([executable, "-unattended", "-ExecCmds=quit"], cwd=executable.parent, check=True, timeout=100)
    return root


def capture(exe, stage, dest, name, mode, level, options, slot):
    output = stage / name
    output.mkdir()
    target = dest / name
    target.mkdir()
    args = [exe, "/Game/Maps/Tibet/" + level, "-windowed", "-RenderOffscreen", "-ForceRes", "-ResX=1440",
            "-ResY=900", "-unattended", "-nosplash", "-NoVSync", "-SaveToUserDir", f"-UserDir={stage / 'user'}",
            f"-TibetSaveSlot={slot}", f"-TibetQAStart={level}", f"-TibetQAOutput={output}", f"-TibetQA={mode}",
            "-ExecCmds=r.ScreenPercentage 100,r.DynamicRes.OperationMode 0", f"-abslog={output / 'game.log'}", *options]
    print(name, flush=True)
    try:
        with (target / "launch.log").open("w") as log:
            subprocess.run(args, cwd=exe.parent, stdout=log, stderr=subprocess.STDOUT,
                           check=True, timeout=1800 if mode == "Campaign" else 300)
    finally:
        shutil.copytree(output, target, dirs_exist_ok=True)
    events = [s.split("\t") for s in (target / "events.tsv").read_text().splitlines()]
    if not events or events[-1][0] != 'pass':
        raise ValueError(f"Missing completion evidence in {target}")
    return events


def vector(xyz):
    return ",".join(f"{axis}={value}" for axis, value in zip("XYZ", xyz))


def shot_data(p):
    data = p.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n" or struct.unpack(">II", data[16:24]) != (1440, 900):
        raise ValueError(f"Unexpected screenshot dimensions for {p}")
    return hashlib.sha256(data).hexdigest()


def compare(web, mac, output):
    import os
    output.mkdir()
    web_report = json.loads((web / "report.json").read_text())
    indexed = {v["id"]: v for v in web_report["views"]}
    sections, rows = [], []
    for view in VIEWS:
        level = view["id"]
        before, after = web / (level + ".png"), mac / level / "capture.png"
        baseline_hash = shot_data(before)
        if indexed[level]["sha256"] != baseline_hash:
            raise ValueError(f"Source screenshot changed for {level}")
        data = [s.split("\t") for s in (mac / level / "events.tsv").read_text().splitlines()]
        if data[0][:2] != ['view', level] or data[-1] != ['pass', 'photo']:
            raise ValueError(f"Invalid native map capture for {level}")
        rows.append({"id":level, "webSHA256":baseline_hash, "nativeSHA256":shot_data(after),
                     "web":indexed[level], "ue":data})
        figures = []
        for label, path in [("原網頁版", before), ("UE 5.8 · macOS", after)]:
            url = quote(os.path.relpath(path,output))
            figures.append(f'<figure><figcaption>{label}</figcaption><a href="{url}"><img src="{url}" alt="{label}"></a></figure>')
        sections.append(f'<section><h2>{html.escape(view["title"])}</h2><div>{"".join(figures)}</div></section>')
    (output / "index.html").write_text('''<!doctype html><html lang="zh-Hant"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>西藏朝聖 · 遊戲畫面對照</title>
<style>html{font:16px system-ui;background:#191917;color:#f6f5ef}body{margin:2rem auto;max-width:1550px;padding:0 1rem}section{margin:2.5rem 0}section div{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}figure{margin:0}img{width:100%}figcaption{padding-bottom:.4rem;color:#e1ccad}@media(max-width:700px){section div{grid-template-columns:1fr}}</style>
<h1>西藏朝聖 · 原版與 UE 重製</h1><p>同一台 Mac 在兩個版本擷取 1440 × 900 遊戲畫面。每組對應同一關卡或地標，各自調整機位以呈現重製後的空間。點選圖片可開啟原圖。</p>''' + ''.join(sections) + '</html>', encoding="utf-8")
    (output / "report.json").write_text(json.dumps(rows, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["photos", "play", "compare"])
    parser.add_argument("--exe", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--web", type=Path)
    parser.add_argument("--mac", type=Path)
    parser.add_argument("--only", choices=[v["id"] for v in VIEWS], help="Capture a single map")
    args = parser.parse_args()
    output = args.output.resolve()
    if args.action == "compare":
        if not args.web or not args.mac:
            parser.error("compare requires --web and --mac")
        return compare(args.web.resolve(), args.mac.resolve(), output)
    if not args.exe:
        parser.error("Capture requires --exe (Contents/MacOS/TibetPilgrimage)")
    exe = args.exe.resolve(strict=True)
    output.mkdir(exist_ok=args.action=="photos")
    with tempfile.TemporaryDirectory(prefix="tibet-qa-", dir=temporary_root(exe)) as temporary:
        stage = Path(temporary)
        (stage/"user").mkdir()
        # Unique across invocations, including packages that resolve user saves under Library.
        slot = "QA-" + stage.name
        if args.action == "photos":
            for view in VIEWS:
                if args.only and view["id"] != args.only:
                    continue
                capture(exe,stage,output,view["id"],"Photo",view["id"],[
                    "-TibetQAEye="+vector(view["ueEye"]), "-TibetQALook="+vector(view["ueLook"])],slot + view["id"])
        else:
            checkpoint = capture(exe,stage,output,"checkpoint","Play","stupa",["-TibetQAStopStep=1"],slot)
            if not any(row[:3]==["step","stupa","1"] for row in checkpoint):
                raise ValueError("First gameplay objective was not reached")
            capture(exe,stage,output,"resume","Resume","stupa",["-TibetQAExpected=1"],slot)
            campaign = capture(exe,stage,output,"campaign","Campaign","stupa",[],slot)
            required = {v["id"] for v in VIEWS} - {"grove"}
            reached = {row[1] for row in campaign if row[0]=="step"}
            if required-reached or campaign[-1] != ["pass","campaign completed"]:
                raise ValueError(f"Incomplete route, missing {required-reached}")
            route = []
            for row in campaign:
                if row[0]=="step" and (not route or route[-1]!=row[1]):
                    route.append(row[1])
            expected = [v["id"] for v in VIEWS if v["id"] != "grove"] + ["chimphu","stupa"]
            if route != expected:
                raise ValueError(f"Unexpected journey sequence: {route}")
            side_slot = slot + "-side"
            entry = capture(exe,stage,output,"side-entry","GroveEntry","stupa",[],side_slot)
            if entry[-1] != ["pass","transition","grove"]:
                raise ValueError("The south exit did not lead to the grove")
            grove = capture(exe,stage,output,"grove","Play","grove",[],side_slot)
            if grove[-1] != ["pass","transition","stupa"] or not any(row[:3]==["step","grove","1"] for row in grove):
                raise ValueError("Grove consecration or return to Boudhanath failed")


if __name__ == "__main__":
    main()
