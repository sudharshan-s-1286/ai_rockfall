#!/usr/bin/env bash
# ============================================================
#  RockSense — Raspberry Pi launcher
#  Run this from the project's backend/ directory.
# ============================================================

# Move into the backend directory so relative model paths work
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "============================================"
echo "  RockSense AI — Starting"
echo "  Working dir: $SCRIPT_DIR"
echo "============================================"

# ---- Configurable options (edit as needed) ----
SOURCE=0                              # Camera index or RTSP URL
YOLO_MODEL="models/Yolo11.pt"
RF_MODEL="models/rocksense_random_forest.pkl"
SERIAL_PORT="/dev/ttyUSB0"           # Change to /dev/ttyACM0 if needed
BAUD=9600
CONF=0.5
STAB_TIME=15

python3 rocksense_pi.py \
    --source     "$SOURCE"       \
    --yolo-model "$YOLO_MODEL"   \
    --rf-model   "$RF_MODEL"     \
    --port       "$SERIAL_PORT"  \
    --baud       "$BAUD"         \
    --conf       "$CONF"         \
    --stab-time  "$STAB_TIME"
