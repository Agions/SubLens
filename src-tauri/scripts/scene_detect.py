#!/usr/bin/env python3
"""
Scene detection wrapper using scenedetect.
Replaces deprecated ffmpeg showinfo-based scene detection.

Usage:
    python3 scene_detect.py <video_path> <threshold> [min_scene_len_frames]

Output:
    JSON array of scene timestamps in seconds, e.g.:
    [0.5, 1.2, 3.4, ...]
"""

import sys
import json
from scenedetect import detect, ContentDetector


def main():
    if len(sys.argv) < 3:
        print("Usage: scene_detect.py <video_path> <threshold> [min_scene_len_frames]")
        sys.exit(1)

    video_path = sys.argv[1]
    threshold = float(sys.argv[2])
    min_scene_len = int(sys.argv[3]) if len(sys.argv) > 3 else 15

    detector = ContentDetector(
        threshold=threshold,
        min_scene_len=min_scene_len,
    )

    scenes = detect(
        video_path,
        detector=detector,
        show_progress=False,
    )

    # Extract start timestamps (in seconds) from FrameTimecode objects
    timestamps = []
    for start, _end in scenes:
        ts = start.get_seconds()
        if ts > 0:  # Skip timestamp 0
            timestamps.append(round(ts, 3))

    print(json.dumps(timestamps))


if __name__ == "__main__":
    main()
