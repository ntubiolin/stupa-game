"""Exercise the packaged Tō-ji game and collect actual gameplay or frame-time evidence."""

import argparse
import csv
import json
import math
import os
import re
import shutil
import signal
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

from compare_toji import SIZE, capture_workspace, image_bytes, percentile


def copy_evidence(stage, output, run):
    source = stage / run
    if source.is_dir():
        shutil.copytree(source, output / run)
    profile = stage / "Profile" / "progress.json"
    if profile.is_file():
        shutil.copyfile(profile, output / f"{run}-progress.json")
    engine_log = stage / f"{run}-engine.log"
    if engine_log.is_file():
        shutil.copyfile(engine_log, output / engine_log.name)


def launch(exe, stage, output, run, extra, timeout, profile=False):
    log = output / f"{run}.log"
    args = [
        str(exe), "-windowed", "-ForceRes", f"-ResX={SIZE[0]}", f"-ResY={SIZE[1]}",
        "-unattended", "-nosplash", "-NoVSync", "-SaveToUserDir", "-stdout",
        "-FullStdOutLogOutput", f"-UserDir={stage / 'user'}",
        f"-TojiSaveDir={stage / 'Profile'}", f"-TojiPlaytestDir={stage}",
        "-ExecCmds=r.ScreenPercentage 100,r.DynamicRes.OperationMode 0",
        f"-abslog={stage / (run + '-engine.log')}", *extra,
    ]
    external_time = profile and sys.platform == "darwin"
    if external_time:
        args = ["/usr/bin/time", "-l", "-o", str(output / "physical-footprint.txt"), *args]
    try:
        with log.open("wb") as stream:
            if external_time:
                with subprocess.Popen(args, cwd=exe.parent, stdout=stream, stderr=subprocess.STDOUT,
                                      start_new_session=True) as process:
                    try:
                        status = process.wait(timeout)
                    except subprocess.TimeoutExpired:
                        os.killpg(process.pid, signal.SIGKILL)
                        raise
                    if status:
                        raise subprocess.CalledProcessError(status, args)
            else:
                subprocess.run(args, cwd=exe.parent, stdout=stream, stderr=subprocess.STDOUT,
                               check=True, timeout=timeout)
    finally:
        copy_evidence(stage, output, run)
    if b"TOJI_PLAYTEST_COMPLETE" not in log.read_bytes():
        raise RuntimeError(f"The playtest did not complete. See {log}")


def millisecond_stats(values):
    return {
        "median": round(statistics.median(values), 2), "p95": round(percentile(values, .95), 2),
        "p99": round(percentile(values, .99), 2), "max": round(max(values), 2),
    }


def summarize_engine_csv(output):
    paths = sorted((output / "engine-csv").glob("*.csv"))
    samples = {key: [] for key in ("GameThreadTime", "RenderThreadTime", "GPUTime")}
    complete_chunks = 0
    windows = []
    # The first capture starts before map load. The repeated chunks represent steady-state play.
    for path in paths[1:]:
        with path.open(encoding="utf-8-sig", errors="replace", newline="") as stream:
            rows = [row for row in csv.reader(stream) if row]
        if len(rows) < 4 or "[HasHeaderRowAtEnd]" not in rows[-1] or rows[-2][0] != "EVENTS":
            continue
        column_map = {key: index for index, key in enumerate(rows[-2]) if key in samples}
        footer = dict(zip(rows[-1][::2], rows[-1][1::2]))
        if footer.get("[CsvMaxFileBytesReached]") == "1":
            continue
        if "[CaptureDuration]" in footer:
            windows.append(float(footer["[CaptureDuration]"]))
        complete_chunks += 1
        for row in rows[1:-2]:
            for key, index in column_map.items():
                if index < len(row):
                    try:
                        value = float(row[index])
                    except ValueError:
                        continue
                    if math.isfinite(value) and value > 0:
                        samples[key].append(value)
    return {
        "completedChunksExcludingBoot": complete_chunks,
        "capturedSecondsExcludingBoot": round(math.fsum(windows), 3) if windows else None,
        "timingsMs": {
            key: ({"samples": len(values), **millisecond_stats(values)} if values else None)
            for key, values in samples.items()
        },
    }


def settings_for(run):
    settings = dict(line.split("=", 1) for line in (run / "run.txt").read_text(encoding="utf-8-sig").splitlines())
    if settings["status"] != "passed" or tuple(int(settings[key]) for key in ("width", "height")) != SIZE:
        raise ValueError(f"Playtest failed or measured the wrong viewport. See {run / 'run.txt'}")
    expected = {"r.ScreenPercentage": 100, "r.DynamicRes.OperationMode": 0, "r.VSync": 0}
    if any(float(settings[key]) != value for key, value in expected.items()):
        raise ValueError(f"Playtest did not apply the requested rendering settings. See {run / 'run.txt'}")
    return settings


def checkpoint_images(run):
    with (run / "checkpoints.tsv").open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream, delimiter="\t"))
    return [(float(row["elapsed_seconds"]), run / f'{row["checkpoint"]}.png') for row in rows]


def encode_video(run, output, ffmpeg):
    frames = checkpoint_images(run)
    with (run / "video.csv").open(encoding="utf-8-sig", newline="") as stream:
        frames.extend((float(row["seconds"]), run / row["image"]) for row in csv.DictReader(stream))
    frames.sort()
    if len(frames) < 2 or not all(image.is_file() for _, image in frames):
        raise ValueError("Incomplete gameplay recording")
    with tempfile.TemporaryDirectory(prefix="stupa-video-") as encode_dir:
        playlist = Path(encode_dir) / "gameplay.ffconcat"
        with playlist.open("w", encoding="utf-8", newline="\n") as stream:
            stream.write("ffconcat version 1.0\n")
            for index, (time, image) in enumerate(frames):
                image_name = image.as_posix().replace("'", "'\\''")
                seconds = frames[index + 1][0] - time if index + 1 < len(frames) else 0.75
                stream.write(f"file '{image_name}'\nduration {max(seconds, 0.04):.4f}\n")
            stream.write(f"file '{image_name}'\n")
        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-n", "-f", "concat", "-safe", "0",
                        "-i", str(playlist), "-vf", "fps=12", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                        "-movflags", "+faststart", str(output / "gameplay.mp4")], check=True, timeout=300)


def summarize_performance(output, required_seconds):
    run = output / "gameplay"
    settings = settings_for(run)
    with (run / "frames.csv").open(encoding="utf-8-sig", newline="") as stream:
        frames = [float(row["frame_interval_ms"]) for row in csv.DictReader(stream)]
    if not frames or any(not math.isfinite(value) or value <= 0 for value in frames):
        raise ValueError("Missing or invalid frame intervals")
    elapsed = math.fsum(frames) / 1000
    if elapsed < required_seconds - 0.001 or float(settings["elapsed_seconds"]) < required_seconds:
        raise ValueError(f"Expected {required_seconds} seconds of sustained play, collected {elapsed:.3f}")
    engine_log = output / "gameplay-engine.log"
    startup = re.search(
        r"\(Engine Initialization\) Total time: ([0-9.]+) seconds",
        engine_log.read_text(encoding="utf-8", errors="replace") if engine_log.is_file() else "",
    )
    footprint_path = output / "physical-footprint.txt"
    footprint = re.search(
        r"(\d+)\s+peak memory footprint",
        footprint_path.read_text(encoding="utf-8", errors="replace") if footprint_path.is_file() else "",
    )
    return {
        "settings": settings,
        "peakApplicationPhysicalFootprintBytes": int(footprint[1]) if footprint else None,
        "engineInitializationSeconds": float(startup[1]) if startup else None,
        "engineCsvProfile": summarize_engine_csv(output),
        "samples": len(frames),
        "measuredWallSeconds": round(elapsed, 3),
        "averageFps": round(len(frames) / elapsed, 2),
        "frameIntervalMs": millisecond_stats(frames),
        "framesAboveMs": {str(ms): sum(value > ms for value in frames) for ms in (33.33, 50, 100)},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--executable", required=True, type=Path, help="Packaged Development executable")
    parser.add_argument("--output", required=True, type=Path, help="New evidence directory")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--seconds", type=int, help="Minimum active-play measurement in seconds")
    mode.add_argument("--video", action="store_true", help="Encode silent gameplay captures with FFmpeg")
    args = parser.parse_args()
    exe = args.executable.resolve(strict=True)
    if not exe.is_file() or exe.name.lower().startswith("unrealeditor"):
        parser.error("Select the executable inside the packaged build")
    if args.seconds is not None and not 1 <= args.seconds <= 3600:
        parser.error("--seconds must be between 1 and 3600")
    ffmpeg = shutil.which("ffmpeg") if args.video else None
    if args.video and not ffmpeg:
        parser.error("--video requires ffmpeg on PATH")

    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    with tempfile.TemporaryDirectory(prefix="stupa-play-", dir=capture_workspace(exe)) as stage_path:
        stage = Path(stage_path).resolve()
        (stage / "user").mkdir()
        if args.seconds is not None:
            profiler_flags = ["-csvCaptureFrames=1800", "-csvRepeat=-1", "-csvCompression=0"]
            launch(exe, stage, output, "gameplay", [f"-TojiPlaytestSeconds={args.seconds}", *profiler_flags],
                   args.seconds + 180, profile=True)
            profiler_output = next((stage / "user").rglob("Profiling/CSV"), None)
            if profiler_output:
                shutil.copytree(profiler_output, output / "engine-csv")
            summary = summarize_performance(output, args.seconds)
            (output / "performance.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        else:
            launch(exe, stage, output, "gameplay", ["-TojiPlaytestRecord"] if args.video else [], 300)
            launch(exe, stage, output, "resume", ["-TojiPlaytestResume"], 120)
            if (output / "gameplay-progress.json").read_bytes() != (output / "resume-progress.json").read_bytes():
                raise ValueError("Restart modified the verified progress save")
            for run in (output / "gameplay", output / "resume"):
                settings_for(run)
                for _, image in checkpoint_images(run):
                    image_bytes(image)
            if args.video:
                encode_video(output / "gameplay", output, ffmpeg)
    print(output)


if __name__ == "__main__":
    main()
