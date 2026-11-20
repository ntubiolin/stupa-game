"""Capture photo evidence or walk the campaign in a Development package on a Mac."""
import argparse
import hashlib
import html
import json
import os
import plistlib
import platform
import re
import shutil
import signal
import struct
import subprocess
import tempfile
from uuid import uuid4
from pathlib import Path
from urllib.parse import quote

QA = Path(__file__).resolve().parent
VIEWS = json.loads((QA / "views.json").read_text())


def stop_timed_out_launch(executable, unique_argument):
    # open -W waits for a separate app process. Match both its path and unique QA run.
    for line in subprocess.check_output(["ps", "-axo", "pid=,command="], text=True).splitlines():
        fields = line.strip().split(maxsplit=1)
        if (len(fields) == 2 and fields[1].startswith(str(executable) + " ")
                and " " + unique_argument + " " in " " + fields[1] + " "):
            try:
                os.kill(int(fields[0]), signal.SIGTERM)
            except ProcessLookupError:
                pass


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
        slot_argument = "-TibetSaveSlot=QA-bootstrap-" + uuid4().hex
        args = ["open", "-n", "-W", "-g", "-a", str(bundle), "--args", "-unattended", "-RenderOffscreen",
                "-nosound", "-ExecCmds=quit", slot_argument]
        try:
            subprocess.run(args, cwd=executable.parent, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                           check=True, timeout=30)
        except subprocess.TimeoutExpired:
            stop_timed_out_launch(executable, slot_argument)
            if not root.is_dir():
                raise
    if not root.is_dir():
        raise RuntimeError(f"macOS did not initialize the app container at {root}")
    return root



def package_record(executable, output):
    bundle = executable.parents[2]
    info = plistlib.loads((bundle / "Contents/Info.plist").read_bytes())
    files = [executable, *sorted(p for p in bundle.rglob("*") if p.suffix in (".pak", ".ucas", ".utoc"))]
    if len(files) < 2:
        raise ValueError("The app contains no cooked package")
    hashes = {}
    for file in files:
        digest = hashlib.sha256()
        with file.open("rb") as stream:
            for block in iter(lambda: stream.read(1 << 20), b""):
                digest.update(block)
        hashes[str(file.relative_to(bundle))] = digest.hexdigest()
    record = {"platform":"macOS", "osVersion":platform.mac_ver()[0], "architecture":platform.machine(),
              "bundleVersion":info.get("CFBundleVersion"), "sha256":hashes}
    path = output / "package.json"
    if path.exists() and json.loads(path.read_text()) != record:
        raise ValueError("The existing captures use a different package or host configuration")
    path.write_text(json.dumps(record, indent=2))


def capture(exe, stage, dest, name, mode, level, options, slot, size=(1440, 900), max_fps=None):
    output = stage / name
    output.mkdir()
    target = dest / name
    target.mkdir()
    # Arrival exercises the default launch map and leaves the pawn camera untouched.
    map_args = [] if mode == "Arrival" else ["/Game/Maps/Tibet/" + level]
    # Touch emulation uses Slate's native-window hit test. A packaged
    # Mac offscreen window is invisible to the desktop window search.
    interactive_touch = mode in ("Journal", "Courtyard") and "-TibetTouch" in options
    rendering = [] if interactive_touch else ["-RenderOffscreen"]
    exec_commands = "r.ScreenPercentage 100,r.DynamicRes.OperationMode 0"
    if max_fps:
        exec_commands += f",t.MaxFPS {max_fps}"
    if interactive_touch:
        exec_commands += ",SlateDebugger.Event.Start"
    args = [exe, *map_args, "-windowed", *rendering, "-ForceRes", f"-ResX={size[0]}",
            f"-ResY={size[1]}", "-unattended", "-nosplash", "-NoVSync", "-SaveToUserDir", f"-UserDir={stage / 'user'}",
            f"-TibetSaveSlot={slot}", f"-TibetQAStart={level}", f"-TibetQAOutput={output}", f"-TibetQA={mode}",
            f"-ExecCmds={exec_commands}", f"-abslog={output / 'game.log'}", *options]
    print(name, flush=True)
    try:
        # Use LaunchServices, as Finder does when the player opens the app bundle.
        foreground = [] if interactive_touch else ["-g"]
        cmd = ["open", "-n", "-W", *foreground, "-a", str(exe.parents[2]), "--args", *args[1:]]
        with (target / "launch.log").open("w") as log:
            subprocess.run(cmd, stdout=log, stderr=subprocess.STDOUT, check=True,
                           timeout=1800 if mode == "Campaign" else 300)
    except subprocess.TimeoutExpired:
        stop_timed_out_launch(exe, f"-TibetQAOutput={output}")
        raise
    finally:
        shutil.copytree(output, target, dirs_exist_ok=True)
    events = [s.split("\t") for s in (target / "events.tsv").read_text().splitlines()]
    if not events or events[-1][0] != 'pass':
        raise ValueError(f"Missing completion evidence in {target}")
    return events


def vector(xyz):
    return ",".join(f"{axis}={value}" for axis, value in zip("XYZ", xyz))


def shot_data(p, size=(1440, 900)):
    data = p.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n" or struct.unpack(">II", data[16:24]) != size:
        raise ValueError(f"Unexpected screenshot dimensions for {p}")
    return hashlib.sha256(data).hexdigest()


# All eleven landmark compositions put the site in the lower two thirds. A sky-only
# frame can have a valid PNG, hash and camera record even while its scene is streaming.
MIN_LANDMARK_DETAIL = 2.0


def injury_edge_fraction(image):
    """Read the paired injury strokes from the rendered frame on the delivery Mac."""
    with tempfile.TemporaryDirectory() as temp:
        bitmap = Path(temp) / "frame.bmp"
        subprocess.run(["sips", "-s", "format", "bmp", str(image), "--out", str(bitmap)],
                       stdout=subprocess.DEVNULL, check=True)
        data = bitmap.read_bytes()
    offset = struct.unpack_from("<I", data, 10)[0]
    width, height = struct.unpack_from("<ii", data, 18)
    channels = struct.unpack_from("<H", data, 28)[0] // 8
    if channels not in (3, 4):
        raise ValueError("Expected a 24- or 32-bit screenshot")
    stride = (width * channels + 3) & ~3
    red = samples = 0
    for y in range(int(abs(height) * .50), int(abs(height) * .64), 3):
        row = abs(height) - 1 - y if height > 0 else y
        for x in (1, width - 2):
            at = offset + row * stride + x * channels
            blue, green, scarlet = data[at:at+3]
            red += scarlet > 100 and scarlet > 1.55 * green and scarlet > 1.45 * blue
            samples += 1
    return red / samples


def landmark_detail(image):
    with tempfile.TemporaryDirectory() as tmp:
        bitmap = Path(tmp) / "sample.bmp"
        subprocess.run(["sips", "-s", "format", "bmp", "-z", "120", "192", str(image), "--out", str(bitmap)],
                       check=True, stdout=subprocess.DEVNULL)
        data = bitmap.read_bytes()
    offset = struct.unpack_from("<I", data, 10)[0]
    width, height, planes, bits = struct.unpack_from("<iiHH", data, 18)
    if (data[:2] != b"BM" or width != 192 or abs(height) != 120 or planes != 1 or bits not in (24, 32)):
        raise ValueError(f"Unexpected macOS bitmap layout for {image}")
    stride = ((width * bits + 31) // 32) * 4
    channels = bits // 8
    total = 0
    rows = abs(height)
    for y in range(rows // 3, rows):
        # BMPs may store rows top-down or bottom-up.
        row = offset + (y if height < 0 else rows - 1 - y) * stride
        for x in range(1, width):
            pixel = row + x * channels
            total += sum(abs(data[pixel + c] - data[pixel - channels + c]) for c in range(3))
    return total / ((rows - rows // 3) * (width - 1) * 3)


def capture_landmark(exe, stage, output, view, slot):
    level = view["id"]
    args = ["-TibetQAEye=" + vector(view["ueEye"]), "-TibetQALook=" + vector(view["ueLook"])]
    if (output / level).exists():
        raise ValueError(f"Capture already exists: {output / level}")
    for attempt in range(1, 4):
        name = level if attempt == 1 else f"{level}-attempt-{attempt}"
        capture(exe, stage, output, name, "Photo", level, args, slot + name)
        result = output / name
        detail = landmark_detail(result / "capture.png")
        if detail >= MIN_LANDMARK_DETAIL:
            if name != level:
                result.rename(output / level)
            return
        rejected = output / "rejected"
        rejected.mkdir(exist_ok=True)
        result.rename(rejected / name)
        print(f"Retrying {level}: lower-frame detail {detail:.2f} suggests missing scenery", flush=True)
    raise ValueError(f"Three captures of {level} lacked visible scenery")


def compare(web, mac, output):
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
        detail = landmark_detail(after)
        if detail < MIN_LANDMARK_DETAIL:
            raise ValueError(f"Missing scenery in {level} (lower-frame detail {detail:.2f})")
        rows.append({"id":level, "webSHA256":baseline_hash, "nativeSHA256":shot_data(after),
                     "nativeLowerFrameDetail":detail, "web":indexed[level], "ue":data})
        figures = []
        for label, path in [("原網頁版", before), ("UE 5.8 · macOS", after)]:
            url = quote(os.path.relpath(path,output))
            figures.append(f'<figure><figcaption>{label}</figcaption><a href="{url}"><img src="{url}" alt="{label}"></a></figure>')
        sections.append(f'<section><h2>{html.escape(view["title"])}</h2><div>{"".join(figures)}</div></section>')
    (output / "index.html").write_text('''<!doctype html><html lang="zh-Hant"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>西藏朝聖 · 遊戲畫面對照</title>
<style>html{font:16px system-ui;background:#191917;color:#f6f5ef}body{margin:2rem auto;max-width:1550px;padding:0 1rem}section{margin:2.5rem 0}section div{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}figure{margin:0}img{width:100%}figcaption{padding-bottom:.4rem;color:#e1ccad}@media(max-width:700px){section div{grid-template-columns:1fr}}</style>
<h1>西藏朝聖 · 原版與 UE 重製</h1><p>同一台 Mac 在兩個版本擷取 1440 × 900 遊戲畫面。每組對應同一關卡或地標，各自調整機位以呈現重製後的空間。點選圖片可開啟原圖。</p>''' + ''.join(sections) + '</html>', encoding="utf-8")
    (output / "report.json").write_text(json.dumps({"package":json.loads((mac / "package.json").read_text()),
                                                    "webSource":web_report["source"], "views":rows}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["photos", "arrival", "camera", "play", "skills", "learned", "journal", "feedback", "compare"])
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
    package_record(exe, output)
    with tempfile.TemporaryDirectory(prefix="tibet-qa-", dir=temporary_root(exe)) as temporary:
        stage = Path(temporary)
        (stage/"user").mkdir()
        # Unique across invocations, including packages that resolve user saves under Library.
        slot = "QA-" + stage.name
        if args.action in ("arrival", "camera"):
            capture(exe,stage,output,"arrival","Arrival","stupa",[],slot)
            frame = output / "arrival/arrival.png"
            shot_data(frame)
            if landmark_detail(frame) < MIN_LANDMARK_DETAIL:
                raise ValueError("Arrival frame lacks the pilgrim and plaza")
            if args.action == "camera":
                for fps in (30, 60):
                    name = f"follow-{fps}hz"
                    events = capture(exe, stage, output, name, "CameraFollow", "stupa", [],
                                     slot+"-"+name, max_fps=fps)
                    samples = {row[0] for row in events}
                    if not {"side-travel", "orbit-left", "return-left", "orbit-right"} <= samples:
                        raise ValueError(f"Missing camera angle observations in {name}")
                    if shot_data(output/name/"travel.png") == shot_data(output/name/"orbit.png"):
                        raise ValueError(f"Camera views are identical in {name}")
        elif args.action == "journal":
            for name, options, size in [
                ("desktop-zh", [], (1440, 900)),
                ("desktop-en", ["-TibetQAEnglish"], (1440, 900)),
                ("touch-en", ["-TibetTouch", "-TibetQAEnglish"], (884, 420)),
            ]:
                capture(exe, stage, output, name, "Journal", "stupa", options, slot+"-"+name, size)
                hashes = {shot_data(output/name/(view+".png"), size)
                          for view in ("hud", "map", "skills", "controls")}
                if len(hashes) != 4:
                    raise ValueError(f"Journal panels did not change in {name}")
        elif args.action == "photos":
            for view in VIEWS:
                if args.only and view["id"] != args.only:
                    continue
                capture_landmark(exe,stage,output,view,slot)
        elif args.action == "feedback":
            for name, options, size in (("desktop", [], (1440, 900)), ("compact", ["-TibetTouch"], (884, 420))):
                rows = capture(exe, stage, output, name, "Feedback", "terma3", options, slot+name, size)
                for expected in (["objective-pulse"], ["ward-contact"], ["injury", "100", "84", "16"]):
                    if expected not in rows:
                        raise ValueError(f"{name}: missing combat observation {expected}")
                frames = [output / name / (state + ".png") for state in ("ward", "injury", "settled")]
                for frame in frames:
                    shot_data(frame, size)
                protected, injured, settled = map(injury_edge_fraction, frames)
                if injured < .75 or injured - max(protected, settled) < .4:
                    raise ValueError(f"{name}: injury indicator is indistinct: {protected}, {injured}, {settled}")
        elif args.action == "learned":
            # The actual last vault gate writes bReturnFromTerma; talking to Tsogyal
            # and exiting Chimphu then writes the Boudhanath epilogue checkpoint.
            for level, destination in (("terma3", "chimphu"), ("chimphu", "stupa")):
                rows = capture(exe, stage, output, level, "Play", level, [], slot)
                if rows[-1] != ["pass", "transition", destination]:
                    raise ValueError(f"Expected {level} return gate to lead to {destination}")
            for name, save, learned in (("return", slot, 127), ("fresh", slot + "-new", 3)):
                rows = capture(exe, stage, output, name, "LearnedSkills", "stupa",
                               [f"-TibetQALearnedMask={learned}"], save)
                if ["learned", str(learned), "1" if name == "return" else "0"] not in rows:
                    raise ValueError(f"Missing real spell input on the {name} save")
        elif args.action == "skills":
            results = output / "skills"
            results.mkdir()
            # Isolated saves preserve a live target for the later, harder-hitting spells.
            for probe, skill in [(f"slot-{i}", i) for i in range(7)] + [("miss", 1)]:
                options = [f"-TibetQASkillSlot={skill}"]
                if probe == "miss":
                    options.append("-TibetQAMiss")
                if skill == 6:
                    options.append("-TibetQAFinisher")
                events = capture(exe, stage, results, probe, "Skills", "terma3", options, slot + "-" + probe)
                game_log = (results / probe / "game.log").read_text(errors="replace")
                casts = [int(n) for n in re.findall(r"TIBET_CAST slot=(\d+)", game_log)]
                if casts != ([6, 5] if skill == 6 else [skill]):
                    raise ValueError(f"{probe}: unexpected accepted casts {casts}")
                measured = next(row for row in events if row[0] == "combat")
                before, after, loss = map(int, measured[2:5])
                expected = 0 if probe == "miss" else [1, 2, 3, 3, 0, 4, 6][skill]
                if before != 9 or after != before - expected or loss != expected:
                    raise ValueError(f"{probe}: incorrect measured health or loss: {measured}")
                if skill == 6 and ["finisher", "3", "0", "3"] not in events:
                    raise ValueError("Finishing hit failed to clamp damage to remaining health")
                frame = results / probe / f"skill-{skill}.png"
                shot_data(frame)
                if probe != "miss":
                    shutil.copy2(frame, results / frame.name)
        else:
            checkpoint = capture(exe,stage,output,"checkpoint","Play","stupa",["-TibetQAStopStep=1"],slot)
            if not any(row[:3]==["step","stupa","1"] for row in checkpoint):
                raise ValueError("First gameplay objective was not reached")
            capture(exe,stage,output,"resume","Resume","stupa",["-TibetQAExpected=1"],slot)
            lamps = capture(exe,stage,output,"first-lamp","Play","stupa",
                            ["-TibetQAStopStep=2","-TibetQAStopProgress=1"],slot)
            if lamps[-2][:5] != ["step","stupa","2","1","Interact"]:
                raise ValueError("The first lamp was not lit after the kora")
            campaign = capture(exe,stage,output,"campaign","Campaign","stupa",[],slot)
            if campaign[0][:5] != ["step","stupa","2","1","Interact"]:
                raise ValueError("The first offering was lost on restart")
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
