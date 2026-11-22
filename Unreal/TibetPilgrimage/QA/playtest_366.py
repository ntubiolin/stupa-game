"""Exercise all four player-reported areas on a single packaged Mac build."""
import argparse
import json
from pathlib import Path
import subprocess
import sys

from test_package import package_record

QA = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exe", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True, help="New directory for screenshots, game events and hashes")
    args = parser.parse_args()
    executable = args.exe.resolve(strict=True)
    output = args.output.resolve()
    output.mkdir(parents=True)
    package_record(executable, output)
    expected = json.loads((output / "package.json").read_text())
    scenarios = (
        ("dialogue", ["test_dialogue.py", "--voices"]),
        ("wilderness", ["test_wilderness.py"]),
        ("courtyard", ["capture_courtyard.py"]),
        ("inventory", ["test_package.py", "pack"]),
        ("journal", ["test_package.py", "journal"]),
    )
    failures = []
    for name, (script, *options) in scenarios:
        destination = output / name
        print(f"Testing {name}", flush=True)
        with (output / f"{name}.log").open("w") as log:
            result = subprocess.run([sys.executable, QA / script, *options, "--exe", executable,
                                     "--output", destination], stdout=log, stderr=subprocess.STDOUT)
        if result.returncode:
            failures.append(name)
            continue
        if json.loads((destination / "package.json").read_text()) != expected:
            failures.append(f"{name} (different package)")
    if failures:
        raise SystemExit("Failed: " + ", ".join(failures))
    print("All five suites passed on the same package.")


if __name__ == "__main__":
    main()
