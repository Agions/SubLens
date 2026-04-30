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
import os
from scenedetect import detect, ContentDetector


def main():
    if len(sys.argv) < 3:
        print("Usage: scene_detect.py <video_path> <threshold> [min_scene_len_frames]", file=sys.stderr)
        print(json.dumps({"error": "Insufficient arguments: video_path and threshold are required"}))
        sys.exit(1)

    video_path = sys.argv[1]

    # Validate video_path exists
    if not os.path.exists(video_path):
        print(json.dumps({"error": f"Video file not found: {video_path}"}))
        sys.exit(1)

    # Parse threshold with error handling
    try:
        threshold = float(sys.argv[2])
        if not (0.0 <= threshold <= 100.0):
            print(json.dumps({"error": f"Threshold must be between 0 and 100, got: {threshold}"}))
            sys.exit(1)
    except ValueError as e:
        print(json.dumps({"error": f"Invalid threshold value '{sys.argv[2]}': {e}"}))
        sys.exit(1)

    # Parse min_scene_len with error handling
    min_scene_len = 15  # default
    if len(sys.argv) > 3:
        try:
            min_scene_len = int(sys.argv[3])
            if min_scene_len < 1:
                print(json.dumps({"error": f"min_scene_len must be positive, got: {min_scene_len}"}))
                sys.exit(1)
        except ValueError as e:
            print(json.dumps({"error": f"Invalid min_scene_len value '{sys.argv[3]}': {e}"}))
            sys.exit(1)

    try:
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

    except Exception as e:
        print(json.dumps({"error": f"Scene detection failed: {str(e)}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
