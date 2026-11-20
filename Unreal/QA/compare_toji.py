"""Photograph each matching pose in a packaged Development executable and pair it with the web baseline."""
import argparse
import hashlib
import html
import json
import math
from pathlib import Path
import struct
import subprocess
import tempfile

VIEWS = json.loads(Path(__file__).with_name("toji-views.json").read_text())
SIZE = (1920, 1080)


def image_bytes(path):
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n" or struct.unpack(">II", data[16:24]) != SIZE:
        raise ValueError(f"Expected a 1920x1080 PNG: {path}")
    return data


def to_cm(xyz):
    east, up, south = xyz
    return [-south * 100, east * 100, up * 100]


def unreal_vector(xyz):
    x, y, z = to_cm(xyz)
    return f"X={x:.5f},Y={y:.5f},Z={z:.5f}"


def percentile(values, p):
    return sorted(values)[math.ceil(p * len(values)) - 1]


def capture(exe, output):
    for view in VIEWS:
        shot = output / view["id"]
        shot.mkdir()
        with tempfile.TemporaryDirectory(prefix="stupa-photo-") as user_dir:
            args = [str(exe), "-windowed", "-ForceRes", "-ResX=1920", "-ResY=1080",
                    "-unattended", "-nosplash", "-NoVSync", "-SaveToUserDir", f"-UserDir={user_dir}", f"-TojiSaveDir={user_dir}/Toji",
                    "-ExecCmds=r.ScreenPercentage 100,r.DynamicRes.OperationMode 0",
                    f"-abslog={shot / 'runtime.log'}", f"-TojiPhotoDir={shot}",
                    f"-TojiTime={view['light']}", f"-TojiEye={unreal_vector(view['from'])}",
                    f"-TojiLook={unreal_vector(view['at'])}"]
            if "player" in view:
                x, z = view["player"]
                args.append(f"-TojiSubject={unreal_vector([x, 0, z])}")
            subprocess.run(args, cwd=exe.parent, check=True, timeout=300)
        image_bytes(shot / "capture.png")
        if not (shot / "measurement.json").is_file():
            raise RuntimeError(f"No runtime measurements for {shot}")


def compare(web, output):
    report = json.loads((web / "report.json").read_text())
    desktop = next(p for p in report["profiles"] if p["name"] == "desktop")
    if not report["passed"] or desktop["errors"]:
        raise ValueError("Web baseline failed")
    if desktop["renderer"]["drawingBuffer"] != list(SIZE):
        raise ValueError("Web render resolution mismatch")
    poses = {p["id"]: p for p in desktop["views"]}
    summary = []
    sections = []
    for view in VIEWS:
        key = view["id"]
        baseline = poses[key]
        if any(view[field] != baseline.get(field) for field in view) or baseline["camera"]["fov"] != 55:
            raise ValueError(f"Unexpected web pose: {key}")
        before = image_bytes(web / baseline["file"])
        if hashlib.sha256(before).hexdigest() != baseline["sha256"]:
            raise ValueError(f"Web image digest mismatch: {key}")
        shot = output / key
        native = json.loads((shot / "measurement.json").read_text())
        after = image_bytes(shot / "capture.png")
        projection = math.degrees(2 * math.atan(SIZE[0] / SIZE[1] * math.tan(math.radians(27.5))))
        if (native["width"], native["height"]) != SIZE or abs(native["horizontalFov"] - projection) > 0.01:
            raise ValueError(f"UE projection mismatch: {key}")
        eye, target = to_cm(view["from"]), to_cm(view["at"])
        direction = [(b - a) / math.dist(target, eye) for a, b in zip(eye, target)]
        if math.dist(native["eyeCm"], eye) > 1 or math.dist(native["forward"], direction) > .001:
            raise ValueError(f"Native camera moved: {key}")
        if native["lightPreset"] != ["day", "dusk", "night"].index(view["light"]) or native["pawnHidden"] != ("player" not in view):
            raise ValueError(f"Lighting preset or player visibility mismatch: {key}")
        if "player" in view:
            x, z = view["player"]
            if math.dist(native["pawnCm"][:2], to_cm([x, 0, z])[:2]) > 5:
                raise ValueError("Portrait actor position mismatch")
        if not native["map"].endswith("Toji") or (len(native["frameIntervalsMs"]) != 90):
            raise ValueError(f"Incomplete UE measurement: {key}")
        (shot / "web.png").write_bytes(before)
        native_p95 = percentile(native["frameIntervalsMs"], .95)
        web_p95 = baseline["frameMs"]["p95"]
        summary.append({"view": view, "fileSha256": {"ue": hashlib.sha256(after).hexdigest(), "web": baseline["sha256"]},
                        "ue": native, "webFrameMs": baseline["frameMs"], "webGpuMs": baseline["gpuMs"]})
        sections.append(f'<section><h2>{html.escape(view["title"])}</h2><div>'
                        f'<figure><figcaption>網頁版</figcaption><a href="{key}/web.png"><img src="{key}/web.png" alt="網頁版"></a></figure>'
                        f'<figure><figcaption>Unreal Engine</figcaption><a href="{key}/capture.png"><img src="{key}/capture.png" alt="UE 打包版"></a></figure>'
                        f'</div><p>90 幀取樣 p95　網頁 {web_p95:.1f} ms ／ UE {native_p95:.1f} ms</p></section>')
    (output / "measurements.json").write_text(json.dumps({"webSource": report["source"],
        "webHost": report["host"], "webRenderer": desktop["renderer"], "pairs": summary}, ensure_ascii=False, indent=2))
    (output / "index.html").write_text('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>東寺金堂畫質比較</title>'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{max-width:1500px;margin:2rem auto;'
        'padding:0 1rem;background:#181a19;color:#edeae4;font:16px system-ui}section{margin:3rem 0}section div{display:grid;'
        'grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}img{width:100%;height:auto}a{color:#bfd9d3}</style>'
        '<h1>東寺金堂・網頁版與 UE 打包版</h1><p>1920×1080、垂直視角 55°。硬體及渲染設定見下方量測紀錄。點選圖片可檢視原尺寸。'
        '兩端的日照預設、曝光與材質各由其引擎決定。</p><p>下列數據為固定鏡位的幀間隔。瀏覽器受顯示更新節奏影響，'
        '靜態鏡位取樣也無法代表長時間遊玩表現。</p><a href="measurements.json">設定與量測</a>' + ''.join(sections), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--executable", required=True, type=Path, help="Packaged StupaPilgrimage binary, including Contents/MacOS/… on Mac")
    parser.add_argument("--web", required=True, type=Path, help="Web capture directory containing report.json")
    parser.add_argument("--output", required=True, type=Path, help="New evidence directory")
    args = parser.parse_args()
    exe = args.executable.resolve(strict=True)
    if not exe.is_file() or exe.name.lower().startswith("unrealeditor"):
        parser.error("Select the executable inside the packaged build")
    web = args.web.resolve(strict=True)
    if not (web / "report.json").is_file():
        parser.error("Missing web report.json")
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    capture(exe, output)
    compare(web, output)
    print(output / "index.html")


if __name__ == "__main__":
    main()
